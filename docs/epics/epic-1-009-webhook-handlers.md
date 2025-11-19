# Epic 1-009: Shopify Webhook Handlers

**Status:** 🔵 Planned
**Phase:** Phase 1 - MVP
**Priority:** P0 - Critical Path
**Estimated Complexity:** Medium (3-5 days)
**Dependencies:** Epic 1-006 (Mongoose Models), Epic 1-007 (Recipe Engine), Epic 1-008 (BullMQ Job Queue)
**Blocks:** None (Enables MVP delivery!)

---

## 1. Understanding (Objective, Scope, and Context)

### Objective
Implement Shopify webhook handlers that receive resource events (products/update, customers/update, orders/create, etc.), validate HMAC signatures, and enqueue recipe execution jobs for background processing. This completes the automation pipeline and enables the MVP to deliver value.

### Scope

**In Scope:**
- Webhook route handlers for 10 initial webhook topics:
  - **Customer:** `customers/create`, `customers/update`
  - **Order:** `orders/create`, `orders/updated`
  - **Product:** `products/create`, `products/update`, `products/delete`
  - **Draft Order:** `draft_orders/create`, `draft_orders/update`
  - **Inventory:** `inventory_levels/update`
- HMAC validation (built-in via `authenticate.webhook()`)
- Webhook payload parsing and normalization
- Job enqueueing via BullMQ
- Webhook registration/deregistration on recipe enable/disable
- Admin API context creation from stored access token
- Error handling and logging
- Webhook testing helpers

**Out of Scope:**
- Custom webhook endpoints (Phase 2 - Enterprise feature)
- Webhook retry logic (Shopify handles this)
- Webhook signature verification (handled by Shopify App Remix)
- Webhook event replay (Phase 2)
- Webhook payload transformation (Phase 2)
- Bulk webhook processing (Phase 2)

### Context

**Current State:**
- BullMQ job queue ready to receive jobs
- Recipe engine ready to execute recipes
- Shopify app configured with OAuth
- Access tokens stored encrypted in Setting model
- NO webhook handlers exist yet
- Template webhook handlers (app.uninstalled, scopes_update) exist

**Target State:**
- 10 webhook route handlers in `app/routes/webhooks.*.tsx`
- Webhooks registered in `shopify.app.toml`
- Webhook handlers respond <500ms (Shopify requirement)
- Jobs enqueued successfully
- Errors logged to AutomationLog
- Recipe enable/disable triggers webhook registration
- Admin API context created from stored access token

**Why This Matters:**
- **Completes automation pipeline:** Webhooks → Jobs → Recipe Execution → Shopify API
- **MVP delivery:** Phase 1 cannot ship without webhook handlers
- **Real-time automation:** Recipes execute immediately when resources change
- **User value:** App actually does something useful
- **Production readiness:** Webhook handling is core to Shopify app functionality

---

## 2. Planning (Architecture, Design Decisions, and Strategy)

### Architecture Overview

**Webhook Flow:**
```
1. Shopify sends webhook → POST /webhooks/{topic}
   ↓ (<10ms - HMAC validation)
2. Webhook Route Handler (app/routes/webhooks.*.tsx)
   ↓ (parse payload, validate)
3. Enqueue Job (RecipeExecutionJob.enqueue)
   ↓ (<50ms - add to Redis queue)
4. Return 200 OK to Shopify
   ↓
5. BullMQ Worker picks up job
   ↓
6. Recipe Engine executes recipes
   ↓
7. Shopify GraphQL API mutations
   ↓
8. AutomationLog records results
```

**Total webhook response time:** <100ms (well under Shopify's 500ms limit)

### Webhook Route Structure

**File Naming Convention:**
```
app/routes/webhooks.{topic}.{subtopic}.tsx

Examples:
- app/routes/webhooks.customers.create.tsx       → customers/create
- app/routes/webhooks.customers.update.tsx       → customers/update
- app/routes/webhooks.products.update.tsx        → products/update
- app/routes/webhooks.orders.create.tsx          → orders/create
```

**Route Template:**
```typescript
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { RecipeExecutionJob } from "~/jobs/jobs/RecipeExecutionJob";
import { AutomationLog } from "~/models/AutomationLog";

export async function action({ request }: ActionFunctionArgs) {
  // 1. Authenticate webhook (HMAC validation)
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received webhook: ${topic} for shop ${shop}`);

  try {
    // 2. Extract resource data
    const resourceId = extractResourceId(payload);

    // 3. Enqueue job for background processing
    await RecipeExecutionJob.enqueue({
      shop,
      event: topic,
      resourceId,
      resourceData: payload,
      priority: determinePriority(topic),
      metadata: {
        receivedAt: new Date().toISOString(),
      },
    });

    // 4. Return 200 OK quickly (Shopify requirement)
    return new Response(null, { status: 200 });

  } catch (error) {
    // Log error but still return 200 (don't retry webhook)
    await AutomationLog.logError(
      shop,
      `Webhook processing failed: ${error.message}`,
      { topic, error: error.stack }
    );

    return new Response(null, { status: 200 });
  }
}
```

### Webhook Topics and Priorities

**Priority Mapping:**
```typescript
const WEBHOOK_PRIORITIES = {
  // High priority (customer-facing)
  'orders/create': 1,
  'orders/updated': 1,
  'draft_orders/create': 1,

  // Normal priority (standard automation)
  'customers/create': 5,
  'customers/update': 5,
  'products/create': 5,
  'products/update': 5,
  'products/delete': 5,
  'draft_orders/update': 5,

  // Low priority (background updates)
  'inventory_levels/update': 10,
};
```

### Admin API Context Creation

**Challenge:** Webhook handlers don't have session/admin context (unlike app routes)

**Solution:** Create admin context from stored access token

```typescript
/**
 * Create Shopify Admin API context from stored access token.
 *
 * Used in webhook handlers and background jobs.
 */
async function createAdminContext(shop: string): Promise<AdminApiContext> {
  // 1. Get shop settings (includes encrypted access token)
  const setting = await Setting.findByShop(shop);

  if (!setting) {
    throw new Error(`Shop not found: ${shop}`);
  }

  // 2. Decrypt access token
  const accessToken = setting.decryptAccessToken();

  // 3. Create admin API client
  const admin = new shopify.clients.Graphql({
    session: {
      shop,
      accessToken,
      // ... other session fields
    },
  });

  return admin;
}
```

### Webhook Registration Strategy

**When to Register Webhooks:**
1. **App installation:** Register all webhooks for enabled recipes
2. **Recipe enabled:** Register webhook for recipe's trigger event (if not already registered)
3. **Recipe disabled:** Check if other recipes use same event, deregister if unused

**When to Deregister Webhooks:**
1. **App uninstall:** Shopify auto-deregisters all webhooks
2. **Last recipe disabled:** If no enabled recipes use an event, deregister webhook

**Implementation:**
```typescript
/**
 * Register webhook for a specific topic.
 */
async function registerWebhook(
  shop: string,
  topic: string
): Promise<string> {
  const admin = await createAdminContext(shop);

  const response = await admin.graphql(`
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription {
          id
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      topic: topic.toUpperCase().replace('/', '_'), // "customers/update" → "CUSTOMERS_UPDATE"
      webhookSubscription: {
        callbackUrl: `${process.env.SHOPIFY_APP_URL}/webhooks/${topic}`,
        format: 'JSON',
      },
    },
  });

  const data = await response.json();
  const webhookId = data.data?.webhookSubscriptionCreate?.webhookSubscription?.id;

  if (!webhookId) {
    throw new Error('Failed to register webhook');
  }

  // Store webhook ID in Shop model
  const shopDoc = await Shop.findByShop(shop);
  await shopDoc.addWebhook(topic, webhookId);

  return webhookId;
}
```

### Resource ID Extraction

**Challenge:** Different webhook payloads have different structures

**Solution:** Extract resource ID based on webhook topic

```typescript
/**
 * Extract Shopify resource GID from webhook payload.
 */
function extractResourceId(topic: string, payload: any): string {
  // Determine resource type from topic
  const [resource] = topic.split('/'); // "customers/update" → "customers"

  // Payload structure varies by resource type
  switch (resource) {
    case 'customers':
      return `gid://shopify/Customer/${payload.id}`;

    case 'orders':
      return `gid://shopify/Order/${payload.id}`;

    case 'products':
      return `gid://shopify/Product/${payload.id}`;

    case 'draft_orders':
      return `gid://shopify/DraftOrder/${payload.id}`;

    case 'inventory_levels':
      return `gid://shopify/InventoryLevel/${payload.inventory_item_id}`;

    default:
      throw new Error(`Unknown resource type: ${resource}`);
  }
}
```

### Design Decisions

**Decision 1: Enqueue Job vs Execute Immediately**
- **Choice:** Always enqueue job (never execute synchronously)
- **Rationale:**
  - Shopify requires <500ms webhook response
  - Recipe execution can take 1-5 seconds
  - Background processing more reliable (retries)
  - Decouples webhook handling from recipe execution
- **Trade-off:** Slight delay (~1-2 seconds), but acceptable for automation

**Decision 2: Store Full Payload vs Resource ID Only**
- **Choice:** Store full webhook payload in job
- **Rationale:**
  - Avoids additional GraphQL query to fetch resource
  - Payload contains all data needed for condition evaluation
  - Debugging easier (can see exact webhook data)
  - Typical payload <100KB (manageable)
- **Trade-off:** Larger Redis memory usage, but not significant

**Decision 3: Return 200 Even on Errors**
- **Choice:** Always return 200 OK to Shopify (don't trigger retries)
- **Rationale:**
  - Errors are usually validation or configuration issues (not transient)
  - Shopify retries can cause duplicate processing
  - Log errors for debugging, alert user in UI
  - Recipe engine has its own retry logic
- **Trade-off:** Errors may be missed if not logged properly

**Decision 4: Webhook Registration in shopify.app.toml vs API**
- **Choice:** Hybrid approach
  - Declare mandatory webhooks in `shopify.app.toml` (app.uninstalled, scopes_update)
  - Register recipe-specific webhooks via API (dynamic based on enabled recipes)
- **Rationale:**
  - Mandatory webhooks always registered
  - Recipe webhooks only registered when needed (saves Shopify resources)
  - Flexibility to add/remove webhooks at runtime
- **Implementation:** Service to sync webhooks when recipes change

**Decision 5: Admin Context Caching**
- **Choice:** Don't cache admin contexts (create fresh for each job)
- **Rationale:**
  - Access tokens may be revoked or rotated
  - Webhook volume low enough (not performance bottleneck)
  - Simpler implementation (no cache invalidation)
  - Future: Add caching with TTL if needed
- **Trade-off:** Extra database query per job, but only ~10-50ms overhead

### Error Handling Strategy

**Error Categories:**

1. **Webhook Validation Errors** (Pre-processing)
   - Invalid HMAC signature → Shopify handles, won't reach our code
   - Invalid JSON payload → Return 200, log error
   - Action: Log and return 200 (don't retry)

2. **Job Enqueue Errors** (During processing)
   - Redis connection failed → Retry webhook
   - Invalid job payload → Return 200, log error
   - Action: Return 500 only if transient (Redis down)

3. **Resource Errors** (Data issues)
   - Resource ID extraction failed → Return 200, log error
   - Invalid resource type → Return 200, log error
   - Action: Log for debugging, don't retry

**Error Response Strategy:**
```typescript
try {
  // Process webhook
  await RecipeExecutionJob.enqueue({...});
  return new Response(null, { status: 200 });

} catch (error) {
  // Log error
  await AutomationLog.logError(shop, error.message, { topic, payload });

  // Check if retryable
  if (isTransientError(error)) {
    return new Response('Temporary error', { status: 500 }); // Shopify retries
  }

  // Non-retryable error - return 200 to prevent retries
  return new Response(null, { status: 200 });
}

function isTransientError(error: any): boolean {
  return (
    error.message.includes('Redis connection') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('timeout')
  );
}
```

### Performance Considerations

**Optimization 1: Fast Webhook Response**
```typescript
// ✅ GOOD: Enqueue job and return immediately
await RecipeExecutionJob.enqueue(payload);
return new Response(null, { status: 200 }); // <100ms
```

**Optimization 2: Webhook Deduplication**
```typescript
// Future optimization: Use job ID to prevent duplicate processing
const jobId = `${shop}-${topic}-${resourceId}-${Date.now()}`;
await RecipeExecutionJob.enqueue({ ...payload }, { jobId });
```

**Optimization 3: Conditional Webhook Registration**
```typescript
// Only register webhook if enabled recipes use it
const enabledRecipes = await Recipe.find({
  shop,
  enabled: true,
  'trigger.event': topic
}).lean();

if (enabledRecipes.length > 0) {
  await registerWebhook(shop, topic);
}
```

**Expected Performance:**
- **Webhook response time:** <100ms (50ms avg)
- **Job enqueue time:** <50ms
- **Total time in webhook handler:** <150ms
- **Well under Shopify's 500ms timeout**

---

## 3. Breakdown (Detailed Task List with Acceptance Criteria)

### 3.1 Admin Context Service

#### Task 3.1.1: Create Admin Context Service
**File:** `app/services/shopify/adminContext.ts`

**Description:**
Create service to generate Shopify Admin API context from stored access token.

**Acceptance Criteria:**
- [ ] Function `createAdminContext(shop)` implemented
- [ ] Fetches and decrypts access token from Setting model
- [ ] Creates Shopify GraphQL client
- [ ] Error handling for missing shop
- [ ] Unit tests

**Implementation:**
```typescript
import { shopify } from '~/shopify.server';
import { Setting } from '~/models/Setting';
import type { AdminApiContext } from '@shopify/shopify-app-remix/server';

/**
 * Create Shopify Admin API context from stored access token.
 *
 * Used in webhook handlers and background jobs where session is not available.
 *
 * @param shop - Shopify shop domain
 * @returns Admin API context with GraphQL client
 */
export async function createAdminContext(shop: string): Promise<AdminApiContext> {
  // Get shop settings
  const setting = await Setting.findByShop(shop);

  if (!setting) {
    throw new Error(`Shop settings not found for: ${shop}`);
  }

  // Decrypt access token
  const accessToken = setting.decryptAccessToken();

  // Create mock session for admin client
  const session = {
    id: `offline_${shop}`,
    shop,
    state: 'enabled',
    isOnline: false,
    accessToken,
    scope: setting.scopes.join(','),
  };

  // Create admin GraphQL client
  const admin = shopify.clients.Graphql({ session });

  return { admin } as any; // Type assertion for compatibility
}

/**
 * Check if shop has valid access token.
 */
export async function hasValidAccessToken(shop: string): Promise<boolean> {
  try {
    const setting = await Setting.findByShop(shop);
    return !!setting?.accessToken;
  } catch {
    return false;
  }
}
```

**Definition of Done:**
- Function creates valid admin context
- Can make GraphQL queries
- Tests pass

---

### 3.2 Webhook Utilities

#### Task 3.2.1: Create Webhook Utilities
**File:** `app/services/webhooks/utils.ts`

**Description:**
Create utility functions for webhook processing (resource ID extraction, priority determination).

**Acceptance Criteria:**
- [ ] Function `extractResourceId(topic, payload)` implemented
- [ ] Function `determinePriority(topic)` implemented
- [ ] All 10 webhook topics supported
- [ ] Unit tests for all topics

**Implementation:**
```typescript
/**
 * Extract Shopify resource GID from webhook payload.
 */
export function extractResourceId(topic: string, payload: any): string {
  const [resource] = topic.split('/');

  // Map resource type to GID format
  const resourceTypeMap: Record<string, string> = {
    customers: 'Customer',
    orders: 'Order',
    products: 'Product',
    draft_orders: 'DraftOrder',
    inventory_levels: 'InventoryLevel',
  };

  const resourceType = resourceTypeMap[resource];

  if (!resourceType) {
    throw new Error(`Unknown resource type: ${resource}`);
  }

  // Extract ID from payload
  let id: string | number;

  if (resource === 'inventory_levels') {
    id = payload.inventory_item_id;
  } else {
    id = payload.id;
  }

  if (!id) {
    throw new Error(`Resource ID not found in payload for topic: ${topic}`);
  }

  return `gid://shopify/${resourceType}/${id}`;
}

/**
 * Determine job priority based on webhook topic.
 *
 * High priority (1): Customer-facing operations
 * Normal priority (5): Standard automation
 * Low priority (10): Background updates
 */
export function determinePriority(topic: string): number {
  const priorityMap: Record<string, number> = {
    'orders/create': 1,
    'orders/updated': 1,
    'draft_orders/create': 1,
    'customers/create': 5,
    'customers/update': 5,
    'products/create': 5,
    'products/update': 5,
    'products/delete': 5,
    'draft_orders/update': 5,
    'inventory_levels/update': 10,
  };

  return priorityMap[topic] || 5; // Default: normal priority
}

/**
 * Normalize webhook topic for Shopify API.
 *
 * @example "customers/update" → "CUSTOMERS_UPDATE"
 */
export function normalizeWebhookTopic(topic: string): string {
  return topic.toUpperCase().replace('/', '_');
}

/**
 * Denormalize webhook topic from Shopify API.
 *
 * @example "CUSTOMERS_UPDATE" → "customers/update"
 */
export function denormalizeWebhookTopic(topic: string): string {
  return topic.toLowerCase().replace('_', '/');
}
```

**Definition of Done:**
- All utility functions work
- Tests cover all topics
- Edge cases handled

---

### 3.3 Webhook Registration Service

#### Task 3.3.1: Create Webhook Registration Service
**File:** `app/services/webhooks/registration.ts`

**Description:**
Create service for registering and deregistering webhooks via Shopify API.

**Acceptance Criteria:**
- [ ] Function `registerWebhook(shop, topic)` implemented
- [ ] Function `deregisterWebhook(shop, webhookId)` implemented
- [ ] Function `syncWebhooks(shop)` syncs based on enabled recipes
- [ ] Stores webhook IDs in Shop model
- [ ] Error handling
- [ ] Integration tests

**Implementation:**
```typescript
import { createAdminContext } from '~/services/shopify/adminContext';
import { Shop } from '~/models/Shop';
import { Recipe } from '~/models/Recipe';
import { normalizeWebhookTopic } from './utils';

/**
 * Register a webhook subscription with Shopify.
 */
export async function registerWebhook(
  shop: string,
  topic: string
): Promise<string> {
  const admin = await createAdminContext(shop);

  const response = await admin.graphql(
    `#graphql
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          webhookSubscription {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        topic: normalizeWebhookTopic(topic),
        webhookSubscription: {
          callbackUrl: `${process.env.SHOPIFY_APP_URL}/webhooks/${topic.replace('/', '.')}`,
          format: 'JSON',
        },
      },
    }
  );

  const data = await response.json();
  const result = data.data?.webhookSubscriptionCreate;

  if (result?.userErrors?.length > 0) {
    throw new Error(`Webhook registration failed: ${result.userErrors[0].message}`);
  }

  const webhookId = result?.webhookSubscription?.id;

  if (!webhookId) {
    throw new Error('Webhook ID not returned');
  }

  // Store webhook in Shop model
  const shopDoc = await Shop.findByShop(shop);
  if (shopDoc) {
    await shopDoc.addWebhook(topic, webhookId);
  }

  console.log(`Registered webhook: ${topic} for shop ${shop}`);
  return webhookId;
}

/**
 * Deregister a webhook subscription.
 */
export async function deregisterWebhook(
  shop: string,
  webhookId: string
): Promise<void> {
  const admin = await createAdminContext(shop);

  const response = await admin.graphql(
    `#graphql
      mutation webhookSubscriptionDelete($id: ID!) {
        webhookSubscriptionDelete(id: $id) {
          deletedWebhookSubscriptionId
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: { id: webhookId },
    }
  );

  const data = await response.json();
  const result = data.data?.webhookSubscriptionDelete;

  if (result?.userErrors?.length > 0) {
    throw new Error(`Webhook deregistration failed: ${result.userErrors[0].message}`);
  }

  // Remove from Shop model
  const shopDoc = await Shop.findByShop(shop);
  if (shopDoc) {
    await shopDoc.removeWebhook(webhookId);
  }

  console.log(`Deregistered webhook: ${webhookId} for shop ${shop}`);
}

/**
 * Sync webhooks based on enabled recipes.
 *
 * Registers webhooks for enabled recipe events, deregisters unused webhooks.
 */
export async function syncWebhooks(shop: string): Promise<void> {
  // Get all enabled recipes
  const enabledRecipes = await Recipe.find({ shop, enabled: true }).lean();

  // Get unique webhook topics from recipes
  const requiredTopics = new Set(
    enabledRecipes.map((recipe) => recipe.trigger.event)
  );

  // Get currently registered webhooks
  const shopDoc = await Shop.findByShop(shop);
  const registeredWebhooks = shopDoc?.webhooks || [];

  // Register missing webhooks
  for (const topic of requiredTopics) {
    const isRegistered = registeredWebhooks.some((w) => w.topic === topic);

    if (!isRegistered) {
      await registerWebhook(shop, topic);
    }
  }

  // Deregister unused webhooks (except mandatory ones)
  const mandatoryTopics = ['app/uninstalled', 'app/scopes_update'];

  for (const webhook of registeredWebhooks) {
    const isRequired = requiredTopics.has(webhook.topic);
    const isMandatory = mandatoryTopics.includes(webhook.topic);

    if (!isRequired && !isMandatory) {
      await deregisterWebhook(shop, webhook.webhookId);
    }
  }

  console.log(`Synced webhooks for shop ${shop}`);
}
```

**Definition of Done:**
- Can register webhooks
- Can deregister webhooks
- Sync function works
- Webhooks stored in Shop model

---

### 3.4 Webhook Route Handlers

#### Task 3.4.1: Create Customer Webhook Handlers
**Files:**
- `app/routes/webhooks.customers.create.tsx`
- `app/routes/webhooks.customers.update.tsx`

**Description:**
Create webhook handlers for customer events.

**Acceptance Criteria:**
- [ ] Both routes handle webhooks correctly
- [ ] HMAC validation via `authenticate.webhook()`
- [ ] Jobs enqueued successfully
- [ ] Response time <100ms
- [ ] Error handling
- [ ] Integration tests

**Implementation:**
```typescript
// app/routes/webhooks.customers.create.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { RecipeExecutionJob } from "~/jobs/jobs/RecipeExecutionJob";
import { AutomationLog } from "~/models/AutomationLog";
import { extractResourceId, determinePriority } from "~/services/webhooks/utils";

export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received webhook: ${topic} for shop ${shop}`);

  try {
    const resourceId = extractResourceId(topic, payload);

    await RecipeExecutionJob.enqueue({
      shop,
      event: topic,
      resourceId,
      resourceData: payload,
      priority: determinePriority(topic),
      metadata: {
        receivedAt: new Date().toISOString(),
      },
    });

    return new Response(null, { status: 200 });

  } catch (error) {
    await AutomationLog.logError(
      shop,
      `Webhook processing failed: ${error instanceof Error ? error.message : String(error)}`,
      { topic, payload }
    );

    return new Response(null, { status: 200 });
  }
}

// app/routes/webhooks.customers.update.tsx - same implementation
```

**Definition of Done:**
- Both handlers work
- Jobs enqueued
- Fast response (<100ms)

---

#### Task 3.4.2: Create Product Webhook Handlers
**Files:**
- `app/routes/webhooks.products.create.tsx`
- `app/routes/webhooks.products.update.tsx`
- `app/routes/webhooks.products.delete.tsx`

**Description:**
Create webhook handlers for product events.

**Acceptance Criteria:**
- [ ] All 3 routes handle webhooks correctly
- [ ] Same implementation pattern as customer handlers
- [ ] Integration tests

**Definition of Done:**
- All handlers work
- Tests pass

---

#### Task 3.4.3: Create Order Webhook Handlers
**Files:**
- `app/routes/webhooks.orders.create.tsx`
- `app/routes/webhooks.orders.updated.tsx`

**Description:**
Create webhook handlers for order events.

**Acceptance Criteria:**
- [ ] Both routes handle webhooks correctly
- [ ] High priority (1) set for order events
- [ ] Integration tests

**Definition of Done:**
- Both handlers work
- Priority correct

---

#### Task 3.4.4: Create Draft Order Webhook Handlers
**Files:**
- `app/routes/webhooks.draft_orders.create.tsx`
- `app/routes/webhooks.draft_orders.update.tsx`

**Description:**
Create webhook handlers for draft order events.

**Acceptance Criteria:**
- [ ] Both routes handle webhooks correctly
- [ ] Integration tests

**Definition of Done:**
- Both handlers work

---

#### Task 3.4.5: Create Inventory Webhook Handler
**File:** `app/routes/webhooks.inventory_levels.update.tsx`

**Description:**
Create webhook handler for inventory level updates.

**Acceptance Criteria:**
- [ ] Route handles webhook correctly
- [ ] Low priority (10) set
- [ ] Integration tests

**Definition of Done:**
- Handler works
- Priority correct

---

### 3.5 Recipe Enable/Disable Hooks

#### Task 3.5.1: Create Recipe Toggle Action
**File:** `app/routes/app.recipes.$id.toggle.tsx`

**Description:**
Create Remix action to toggle recipe on/off and sync webhooks.

**Acceptance Criteria:**
- [ ] Action toggles recipe.enabled field
- [ ] Calls `syncWebhooks(shop)` after toggle
- [ ] Returns updated recipe
- [ ] Error handling
- [ ] Unit tests

**Implementation:**
```typescript
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { connectToMongoDB } from "~/mongoose.server";
import Recipe from "~/models/Recipe";
import { syncWebhooks } from "~/services/webhooks/registration";

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  await connectToMongoDB();

  // Toggle recipe
  const recipe = await Recipe.findOne({ _id: id, shop: session.shop });

  if (!recipe) {
    return json({ error: 'Recipe not found' }, { status: 404 });
  }

  recipe.enabled = !recipe.enabled;
  await recipe.save();

  // Sync webhooks (register/deregister based on enabled recipes)
  try {
    await syncWebhooks(session.shop);
  } catch (error) {
    console.error('Failed to sync webhooks:', error);
    // Continue - recipe still toggled even if webhook sync fails
  }

  return json({ recipe, success: true });
}
```

**Definition of Done:**
- Toggle action works
- Webhooks sync correctly
- Tests pass

---

### 3.6 Testing Tasks

#### Task 3.6.1: Write Webhook Handler Tests
**File:** `test/routes/webhooks.test.ts`

**Description:**
Integration tests for webhook handlers.

**Acceptance Criteria:**
- [ ] Test: Webhook triggers job enqueue
- [ ] Test: Invalid payload returns 200
- [ ] Test: HMAC validation (handled by Shopify lib)
- [ ] Test: Response time <200ms
- [ ] Code coverage >75%

**Definition of Done:**
- All tests pass
- Mocked Shopify auth

---

#### Task 3.6.2: Write Webhook Registration Tests
**File:** `test/services/webhooks/registration.test.ts`

**Description:**
Unit tests for webhook registration service.

**Acceptance Criteria:**
- [ ] Test: Register webhook succeeds
- [ ] Test: Deregister webhook succeeds
- [ ] Test: Sync webhooks registers missing
- [ ] Test: Sync webhooks deregisters unused
- [ ] Code coverage >80%

**Definition of Done:**
- All tests pass
- Mocked Shopify API

---

#### Task 3.6.3: Write Webhook Utilities Tests
**File:** `test/services/webhooks/utils.test.ts`

**Description:**
Unit tests for webhook utilities.

**Acceptance Criteria:**
- [ ] Test: Extract resource ID for all topics
- [ ] Test: Determine priority for all topics
- [ ] Test: Normalize/denormalize topics
- [ ] Code coverage >90%

**Definition of Done:**
- All tests pass
- All topics covered

---

### 3.7 Documentation Tasks

#### Task 3.7.1: Add JSDoc Comments
**Files:** `app/services/webhooks/**/*.ts`, `app/routes/webhooks.*.tsx`

**Description:**
Add comprehensive JSDoc to all webhook code.

**Acceptance Criteria:**
- [ ] All webhook handlers documented
- [ ] All services documented
- [ ] Examples included

**Definition of Done:**
- TypeScript IntelliSense shows docs

---

#### Task 3.7.2: Create Webhook Guide
**File:** `docs/webhook-guide.md`

**Description:**
Create developer guide for webhook handling.

**Acceptance Criteria:**
- [ ] Document webhook flow
- [ ] Document registration process
- [ ] Document testing webhooks
- [ ] Include troubleshooting

**Definition of Done:**
- Guide complete and accurate

---

#### Task 3.7.3: Update ARCHITECTURE.md
**File:** `docs/ARCHITECTURE.md`

**Description:**
Update architecture doc with webhook implementation.

**Acceptance Criteria:**
- [ ] Webhook flow diagram added
- [ ] Mark Phase 1 as complete
- [ ] Add production deployment notes

**Definition of Done:**
- ARCHITECTURE.md updated
- Phase 1 marked complete

---

## 4. Implementation Order

### Week 1: Core Implementation (Days 1-3)

**Day 1: Services**
1. Task 3.1.1: Create Admin Context Service (2 hours)
2. Task 3.2.1: Create Webhook Utilities (2 hours)
3. Task 3.3.1: Create Webhook Registration Service (3 hours)

**Day 2: Webhook Handlers**
1. Task 3.4.1: Create Customer Webhook Handlers (1.5 hours)
2. Task 3.4.2: Create Product Webhook Handlers (1.5 hours)
3. Task 3.4.3: Create Order Webhook Handlers (1.5 hours)
4. Task 3.4.4: Create Draft Order Webhook Handlers (1 hour)
5. Task 3.4.5: Create Inventory Webhook Handler (45 min)

**Day 3: Integration**
1. Task 3.5.1: Create Recipe Toggle Action (2 hours)
2. Update `shopify.app.toml` with webhook declarations (1 hour)
3. Manual test with Shopify CLI (2 hours)

### Week 2: Testing and Documentation (Days 4-5)

**Day 4: Testing**
1. Task 3.6.1: Write Webhook Handler Tests (3 hours)
2. Task 3.6.2: Write Webhook Registration Tests (2 hours)
3. Task 3.6.3: Write Webhook Utilities Tests (1.5 hours)

**Day 5: Documentation and Final Testing**
1. Task 3.7.1: Add JSDoc Comments (2 hours)
2. Task 3.7.2: Create Webhook Guide (2 hours)
3. Task 3.7.3: Update ARCHITECTURE.md (1 hour)
4. End-to-end testing with real webhooks (2 hours)

---

## 5. Code Quality Requirements

### TypeScript Standards
- Strict typing
- All webhook payloads typed
- Error handling comprehensive

### Testing Requirements
- Integration tests for all handlers
- Unit tests for utilities
- Code coverage >75%

### Performance Requirements
- Webhook response <100ms
- Job enqueue <50ms
- Total handler time <150ms

### Error Handling
- Always return 200 to Shopify (unless transient error)
- Log all errors to AutomationLog
- No uncaught exceptions

---

## 6. Files to Create/Modify

### New Files (18 files)

**Services:**
1. `app/services/shopify/adminContext.ts`
2. `app/services/webhooks/utils.ts`
3. `app/services/webhooks/registration.ts`

**Webhook Handlers (10 files):**
4. `app/routes/webhooks.customers.create.tsx`
5. `app/routes/webhooks.customers.update.tsx`
6. `app/routes/webhooks.products.create.tsx`
7. `app/routes/webhooks.products.update.tsx`
8. `app/routes/webhooks.products.delete.tsx`
9. `app/routes/webhooks.orders.create.tsx`
10. `app/routes/webhooks.orders.updated.tsx`
11. `app/routes/webhooks.draft_orders.create.tsx`
12. `app/routes/webhooks.draft_orders.update.tsx`
13. `app/routes/webhooks.inventory_levels.update.tsx`

**Actions:**
14. `app/routes/app.recipes.$id.toggle.tsx`

**Tests:**
15. `test/routes/webhooks.test.ts`
16. `test/services/webhooks/registration.test.ts`
17. `test/services/webhooks/utils.test.ts`

**Documentation:**
18. `docs/webhook-guide.md`

### Modified Files (2 files)

1. `shopify.app.toml` - Add webhook declarations
2. `docs/ARCHITECTURE.md` - Mark Phase 1 complete

---

## 7. Acceptance Criteria

### Functional Requirements
- [ ] All 10 webhook handlers work
- [ ] Jobs enqueued successfully
- [ ] Webhooks register/deregister correctly
- [ ] Recipe toggle syncs webhooks
- [ ] Admin context created from stored token

### Performance Requirements
- [ ] Webhook response <100ms
- [ ] All handlers respond <150ms

### Testing Requirements
- [ ] All tests pass
- [ ] Code coverage >75%
- [ ] End-to-end test with real webhooks successful

---

## 8. Epic Completion Checklist

### Pre-Implementation
- [ ] Verify Epics 1-006, 1-007, 1-008 complete
- [ ] Shopify dev store ready for testing

### Implementation Phase
- [ ] Admin context service (3.1.1)
- [ ] Webhook utilities (3.2.1)
- [ ] Webhook registration (3.3.1)
- [ ] All webhook handlers (3.4.x)
- [ ] Recipe toggle action (3.5.1)

### Testing Phase
- [ ] All tests written and passing (3.6.x)
- [ ] End-to-end test successful

### Documentation Phase
- [ ] JSDoc added (3.7.1)
- [ ] Webhook guide created (3.7.2)
- [ ] ARCHITECTURE.md updated - Phase 1 complete! (3.7.3)

### Final Review
- [ ] Full test suite passes
- [ ] Manual webhook testing complete
- [ ] **PHASE 1 MVP COMPLETE!** 🎉

---

## 9. Definition of Done vs Not Done

### ✅ DONE Examples

```typescript
// ✅ DONE: Webhook triggers job
// Test with Shopify CLI:
shopify webhook trigger --topic customers/update

// Job appears in Redis queue ✅
// Worker processes job ✅
// Recipe executes ✅
// AutomationLog created ✅
```

### ❌ NOT DONE Examples

```typescript
// ❌ NOT DONE: Webhook handler doesn't exist
POST /webhooks/customers/update
// 404 Not Found
```

---

## 10. Notes and Considerations

### Shopify Webhook Retries
- Shopify retries failed webhooks (non-200 response)
- Retry schedule: 1 hour, 6 hours, 12 hours
- Max 19 retries over 48 hours
- Return 200 even on errors to prevent retries

### Testing Webhooks Locally
```bash
# Use Shopify CLI to trigger test webhooks
shopify webhook trigger --topic customers/update --api-version 2025-01

# Or use ngrok + Partners dashboard webhook testing
```

### Production Webhook Security
- HMAC validation handled by Shopify App Remix
- Always use `authenticate.webhook(request)`
- Never skip HMAC validation

### Future Enhancements
- Custom webhook endpoints (Enterprise feature)
- Webhook event replay
- Webhook payload transformation
- Webhook analytics dashboard

---

**Epic End**

🎉 **This epic completes Phase 1 - MVP!** 🎉

Once Epic 1-009 is complete, the app will:
- ✅ Receive Shopify webhooks
- ✅ Evaluate recipe conditions
- ✅ Execute actions (tags, metafields)
- ✅ Log all operations
- ✅ Display activity in UI
- ✅ Ready for merchant use!

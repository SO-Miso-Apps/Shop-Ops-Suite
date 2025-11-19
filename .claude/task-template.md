# Task Template

This template provides a structured approach for breaking down and implementing complex tasks in the Shop-Ops Suite project.

## Task Analysis Framework

### 1. Understanding Phase
- **Objective**: What is the end goal?
- **Scope**: What's included/excluded?
- **Dependencies**: What must exist first?
- **Success Criteria**: How do we know it's done?

### 2. Planning Phase
- **Architecture Review**: Does this align with our architecture?
- **Data Models**: What database changes are needed?
- **API Design**: What GraphQL queries/mutations are required?
- **UI/UX**: What Polaris components will we use?

### 3. Breakdown Structure

#### Sub-tasks
Break down into specific, actionable items:
1. **Backend Tasks**
   - [ ] Database schema updates (Mongoose models)
   - [ ] Service layer implementation
   - [ ] API endpoints (Remix loaders/actions)
   - [ ] Job queue integration (BullMQ)
   - [ ] Webhook handlers

2. **Frontend Tasks**
   - [ ] Route creation/updates
   - [ ] Polaris component integration
   - [ ] Form handling and validation
   - [ ] Optimistic UI updates
   - [ ] Error handling

3. **Integration Tasks**
   - [ ] Shopify GraphQL queries/mutations
   - [ ] Recipe engine integration
   - [ ] Activity log integration
   - [ ] Settings/limits checks

4. **Testing & Validation**
   - [ ] Type safety verification
   - [ ] Linting checks
   - [ ] Build verification
   - [ ] Manual testing checklist

### 4. Implementation Order

```
Priority: 1 (highest) → 5 (lowest)
```

1. **Data Layer** (Models, Schemas)
2. **Business Logic** (Services, Utilities)
3. **API Layer** (Loaders, Actions)
4. **UI Layer** (Components, Pages)
5. **Integration** (Webhooks, Jobs, External APIs)

### 5. Code Quality Standards

#### Naming Conventions
- **Files**: kebab-case (e.g., `recipe-engine.ts`)
- **Components**: PascalCase (e.g., `RecipeCard`)
- **Functions**: camelCase (e.g., `executeRecipe`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RECIPES`)

#### Multi-Tenant Pattern
```typescript
// ✅ ALWAYS scope by shop
await Recipe.find({ shop: session.shop });

// ❌ NEVER query without shop
await Recipe.find({ enabled: true });
```

#### Error Handling
```typescript
try {
  // Operation
  return json({ success: true });
} catch (error) {
  console.error('Operation failed:', error);
  return json({ error: error.message }, { status: 500 });
}
```

#### Type Safety
```typescript
// Use proper types from models
import type { IRecipe } from '~/models/Recipe';

// Generate GraphQL types
// Run: pnpm graphql-codegen
import type { CreateProductMutation } from '~/types/admin.generated';
```

### 6. Phase-Specific Guidelines

#### Phase 0 (Foundation) - COMPLETE ✅
- Basic setup, authentication, database connection

#### Phase 1 (MVP) - IN PROGRESS 🔄
**Focus**: Core recipe automation
- Recipe models and CRUD operations
- Basic webhook handlers
- Recipe execution engine
- Activity logging
- 10 pre-built recipes

**Out of Scope for Phase 1**:
- Billing/subscriptions
- Metafield Manager UI
- Data Cleaner UI
- Bulk Operations UI
- Advanced scheduling

#### Phase 2 (Feature Expansion) - PLANNED 📋
- Metafield Manager implementation
- Data Cleaner implementation
- Bulk Operations wizard
- Advanced recipe conditions

#### Phase 3 (Power Features) - FUTURE 🔮
- Billing integration
- Custom recipe builder
- API access
- Advanced analytics

### 7. File Organization

```
app/
├── models/           # Mongoose schemas (multi-tenant)
├── services/         # Business logic (recipe engine, tag service)
├── utils/            # Shared utilities (validators, API wrappers)
├── jobs/             # BullMQ job definitions
├── recipes/          # Pre-built recipe definitions
└── routes/
    ├── app.*.tsx     # Authenticated pages
    ├── webhooks.*.tsx # Webhook handlers
    └── auth.*.tsx    # OAuth flow
```

### 8. Common Patterns

#### Remix Loader (GET)
```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  await connectToMongoDB();

  const data = await Model.find({ shop: session.shop });

  return json({ data });
};
```

#### Remix Action (POST)
```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  await connectToMongoDB();

  const formData = await request.formData();
  const action = formData.get('action');

  // Process action

  return json({ success: true });
};
```

#### Webhook Handler
```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  // Enqueue job for processing (must respond <500ms)
  await queue.add('process-webhook', { topic, shop, payload });

  return new Response(null, { status: 200 });
};
```

### 9. Documentation Requirements

For each implemented feature:
- [ ] Update CHANGELOG.md
- [ ] Add inline code comments for complex logic
- [ ] Update README.md if user-facing changes
- [ ] Document in relevant /docs files if architectural

### 10. Completion Checklist

Before marking a task complete:
- [ ] All sub-tasks implemented
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Types check (`pnpm types-check`)
- [ ] Manual testing completed
- [ ] Multi-tenant data scoping verified
- [ ] Error handling in place
- [ ] Activity logging added (where applicable)
- [ ] Documentation updated

---

## Definition of Done vs Not Done

This section provides clear examples of what constitutes a completed task versus an incomplete task.

### General Principles

#### ✅ DONE means:
- **Fully functional** - Feature works end-to-end without errors
- **Type-safe** - All TypeScript types are correct, no `any` types
- **Tested** - Manual testing completed, edge cases handled
- **Production-ready** - Follows all code quality standards
- **Multi-tenant safe** - All queries scoped by shop
- **Error handling** - Try-catch blocks with proper error messages
- **Documented** - Code comments for complex logic, documentation updated

#### ❌ NOT DONE means:
- **Partially implemented** - Some functions are stubs or TODOs
- **Type errors** - Build fails, type checking fails
- **Untested** - Haven't verified it works manually
- **Hardcoded values** - Using test data or placeholder values
- **Missing error handling** - No try-catch, errors crash the app
- **Missing shop scoping** - Queries can leak data between shops
- **No documentation** - Complex logic has no comments

---

### Example 1: Backend Model Implementation

#### ✅ DONE - Complete Recipe Model
```typescript
// app/models/Recipe.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IRecipe extends Document {
  shop: string;
  recipeId: string;
  name: string;
  description: string;
  category: 'customer' | 'order' | 'product' | 'inventory';
  enabled: boolean;
  trigger: {
    type: 'webhook' | 'scheduled';
    webhookTopic?: string;
    schedule?: string;
  };
  conditions: Array<{
    field: string;
    operator: '>' | '<' | '=' | '!=' | 'contains' | 'startsWith';
    value: any;
    dataType: 'string' | 'number' | 'boolean';
  }>;
  actions: Array<{
    type: 'addTag' | 'removeTag' | 'setMetafield';
    config: Record<string, any>;
  }>;
  executionCount: number;
  lastExecuted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const recipeSchema = new Schema<IRecipe>({
  shop: { type: String, required: true, index: true },
  recipeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['customer', 'order', 'product', 'inventory']
  },
  enabled: { type: Boolean, default: false, index: true },
  trigger: {
    type: { type: String, required: true },
    webhookTopic: String,
    schedule: String,
  },
  conditions: [{
    field: { type: String, required: true },
    operator: { type: String, required: true },
    value: Schema.Types.Mixed,
    dataType: { type: String, required: true },
  }],
  actions: [{
    type: { type: String, required: true },
    config: { type: Map, of: Schema.Types.Mixed },
  }],
  executionCount: { type: Number, default: 0 },
  lastExecuted: Date,
}, {
  timestamps: true,
  collection: 'recipes'
});

// Compound index for multi-tenant queries
recipeSchema.index({ shop: 1, enabled: 1 });
recipeSchema.index({ shop: 1, category: 1 });

export const Recipe = mongoose.models.Recipe || mongoose.model<IRecipe>('Recipe', recipeSchema);
```

**Why this is DONE:**
- ✅ Full TypeScript interface exported
- ✅ All fields properly typed
- ✅ Required fields marked with `required: true`
- ✅ Shop field indexed for multi-tenant queries
- ✅ Compound indexes for common query patterns
- ✅ Enum validation for category field
- ✅ Timestamps enabled
- ✅ Proper export with hot reload support

#### ❌ NOT DONE - Incomplete Recipe Model
```typescript
// app/models/Recipe.ts
import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema({
  name: String,
  description: String,
  enabled: Boolean,
  // TODO: Add more fields
});

export const Recipe = mongoose.model('Recipe', recipeSchema);
```

**Why this is NOT DONE:**
- ❌ No TypeScript interface
- ❌ Missing shop field (multi-tenant violation)
- ❌ No field validation (required, enums)
- ❌ No indexes (performance issue)
- ❌ TODO comment indicates incomplete work
- ❌ Missing trigger, conditions, actions fields
- ❌ No timestamps
- ❌ Doesn't export type for use in other files

---

### Example 2: Service Layer Implementation

#### ✅ DONE - Complete Tag Service
```typescript
// app/services/tagService.ts
import type { AdminApiContext } from '@shopify/shopify-app-remix/server';

export interface AddTagResult {
  success: boolean;
  tagsAdded: string[];
  error?: string;
}

export interface RemoveTagResult {
  success: boolean;
  tagsRemoved: string[];
  error?: string;
}

/**
 * Add tags to a Shopify resource (customer, order, product)
 * @param admin - Shopify Admin API context
 * @param resourceType - Type of resource (customer/order/product)
 * @param resourceId - Shopify GID (e.g., gid://shopify/Customer/123)
 * @param tags - Array of tags to add
 * @returns Result object with success status and tags added
 */
export async function addTags(
  admin: AdminApiContext,
  resourceType: 'customer' | 'order' | 'product',
  resourceId: string,
  tags: string[]
): Promise<AddTagResult> {
  try {
    // Fetch current tags
    const currentTags = await fetchResourceTags(admin, resourceType, resourceId);

    // Merge with new tags (deduplicate)
    const mergedTags = Array.from(new Set([...currentTags, ...tags]));

    // Update resource
    const mutation = getUpdateMutation(resourceType);
    const response = await admin.graphql(mutation, {
      variables: {
        input: {
          id: resourceId,
          tags: mergedTags,
        },
      },
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return {
      success: true,
      tagsAdded: tags,
    };
  } catch (error) {
    console.error(`Failed to add tags to ${resourceType}:`, error);
    return {
      success: false,
      tagsAdded: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove tags from a Shopify resource
 * @param admin - Shopify Admin API context
 * @param resourceType - Type of resource (customer/order/product)
 * @param resourceId - Shopify GID
 * @param tags - Array of tags to remove
 * @returns Result object with success status and tags removed
 */
export async function removeTags(
  admin: AdminApiContext,
  resourceType: 'customer' | 'order' | 'product',
  resourceId: string,
  tags: string[]
): Promise<RemoveTagResult> {
  try {
    const currentTags = await fetchResourceTags(admin, resourceType, resourceId);
    const filteredTags = currentTags.filter(tag => !tags.includes(tag));

    const mutation = getUpdateMutation(resourceType);
    const response = await admin.graphql(mutation, {
      variables: {
        input: {
          id: resourceId,
          tags: filteredTags,
        },
      },
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return {
      success: true,
      tagsRemoved: tags,
    };
  } catch (error) {
    console.error(`Failed to remove tags from ${resourceType}:`, error);
    return {
      success: false,
      tagsRemoved: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper functions
async function fetchResourceTags(
  admin: AdminApiContext,
  resourceType: string,
  resourceId: string
): Promise<string[]> {
  // Implementation...
  return [];
}

function getUpdateMutation(resourceType: string): string {
  // Return appropriate GraphQL mutation based on resource type
  // Implementation...
  return '';
}
```

**Why this is DONE:**
- ✅ Full TypeScript types for all functions
- ✅ JSDoc comments explaining parameters and return values
- ✅ Error handling with try-catch
- ✅ Returns structured result objects
- ✅ Logs errors for debugging
- ✅ Handles edge cases (deduplication, filtering)
- ✅ Proper function signatures with type safety
- ✅ Helper functions to keep code DRY

#### ❌ NOT DONE - Incomplete Tag Service
```typescript
// app/services/tagService.ts
export async function addTags(admin: any, resourceId: string, tags: any) {
  // TODO: Implement tag adding logic
  const response = await admin.graphql(`
    mutation {
      customerUpdate(input: { id: "${resourceId}", tags: ${tags} }) {
        customer { id }
      }
    }
  `);
  return response;
}
```

**Why this is NOT DONE:**
- ❌ Using `any` types (not type-safe)
- ❌ TODO comment indicates incomplete work
- ❌ No error handling
- ❌ Hardcoded to customer (not flexible)
- ❌ String interpolation in GraphQL (unsafe)
- ❌ No return type defined
- ❌ No JSDoc documentation
- ❌ Doesn't handle existing tags (will overwrite)
- ❌ No validation of inputs

---

### Example 3: Frontend Route Implementation

#### ✅ DONE - Complete Recipe Page
```typescript
// app/routes/app.recipes.tsx
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { Page, Layout, Card, Text, Badge, Button, Banner } from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "~/shopify.server";
import { connectToMongoDB } from "~/mongoose.server";
import { Recipe } from "~/models/Recipe";
import type { IRecipe } from "~/models/Recipe";

interface LoaderData {
  recipes: IRecipe[];
  error?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    await connectToMongoDB();

    const recipes = await Recipe.find({ shop: session.shop })
      .sort({ category: 1, name: 1 })
      .lean();

    return json<LoaderData>({
      recipes: recipes.map(r => ({
        ...r,
        _id: r._id.toString(),
      }))
    });
  } catch (error) {
    console.error('Failed to load recipes:', error);
    return json<LoaderData>({
      recipes: [],
      error: error instanceof Error ? error.message : 'Failed to load recipes'
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    await connectToMongoDB();

    const formData = await request.formData();
    const action = formData.get('action');
    const recipeId = formData.get('recipeId');

    if (!recipeId || typeof recipeId !== 'string') {
      return json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    if (action === 'toggle') {
      const recipe = await Recipe.findOne({
        shop: session.shop,
        recipeId
      });

      if (!recipe) {
        return json({ error: 'Recipe not found' }, { status: 404 });
      }

      recipe.enabled = !recipe.enabled;
      await recipe.save();

      return json({ success: true, enabled: recipe.enabled });
    }

    return json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Recipe action failed:', error);
    return json({
      error: error instanceof Error ? error.message : 'Action failed'
    }, { status: 500 });
  }
};

export default function RecipesPage() {
  const { recipes, error } = useLoaderData<LoaderData>();
  const submit = useSubmit();
  const [optimisticStates, setOptimisticStates] = useState<Record<string, boolean>>({});

  const handleToggle = (recipeId: string, currentEnabled: boolean) => {
    // Optimistic update
    setOptimisticStates(prev => ({ ...prev, [recipeId]: !currentEnabled }));

    // Submit form
    const formData = new FormData();
    formData.append('action', 'toggle');
    formData.append('recipeId', recipeId);
    submit(formData, { method: 'post' });
  };

  const getRecipeEnabled = (recipe: IRecipe) => {
    return optimisticStates[recipe.recipeId] ?? recipe.enabled;
  };

  return (
    <Page title="Recipe Library" subtitle="Automation recipes to streamline your operations">
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical" title="Error loading recipes">
              {error}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          {recipes.map((recipe) => (
            <Card key={recipe.recipeId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text variant="headingMd" as="h2">{recipe.name}</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">{recipe.description}</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Badge tone={recipe.category === 'customer' ? 'info' : 'success'}>
                      {recipe.category}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => handleToggle(recipe.recipeId, recipe.enabled)}
                  tone={getRecipeEnabled(recipe) ? 'success' : 'default'}
                >
                  {getRecipeEnabled(recipe) ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </Card>
          ))}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

**Why this is DONE:**
- ✅ Full TypeScript types for loader and action data
- ✅ Error handling in both loader and action
- ✅ Multi-tenant query scoping (shop filter)
- ✅ Proper HTTP status codes (400, 404, 500)
- ✅ Optimistic UI updates for better UX
- ✅ Polaris components used throughout
- ✅ Proper form handling with FormData
- ✅ Error banner shown to user
- ✅ Input validation (recipeId check)
- ✅ Console logging for debugging

#### ❌ NOT DONE - Incomplete Recipe Page
```typescript
// app/routes/app.recipes.tsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Recipe } from "~/models/Recipe";

export const loader = async () => {
  const recipes = await Recipe.find();
  return json({ recipes });
};

export default function RecipesPage() {
  const { recipes } = useLoaderData();

  return (
    <div>
      <h1>Recipes</h1>
      {recipes.map((recipe: any) => (
        <div key={recipe.id}>
          <p>{recipe.name}</p>
          <button>Toggle</button>
        </div>
      ))}
    </div>
  );
}
```

**Why this is NOT DONE:**
- ❌ No authentication check
- ❌ No MongoDB connection
- ❌ Missing shop scoping (security vulnerability!)
- ❌ No TypeScript types (using `any`)
- ❌ No error handling
- ❌ Button doesn't do anything (no action handler)
- ❌ Not using Polaris components
- ❌ No loading states or error messages
- ❌ Missing Page layout and structure

---

### Example 4: Webhook Handler Implementation

#### ✅ DONE - Complete Webhook Handler
```typescript
// app/routes/webhooks.products.update.tsx
import { type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { connectToMongoDB } from "~/mongoose.server";
import { Recipe } from "~/models/Recipe";
import { AutomationLog } from "~/models/AutomationLog";
import { executeRecipe } from "~/services/recipeEngine";

interface ProductUpdatePayload {
  id: number;
  title: string;
  tags: string[];
  variants: Array<{
    id: number;
    inventory_quantity: number;
  }>;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    if (topic !== 'PRODUCTS_UPDATE') {
      return new Response('Invalid webhook topic', { status: 400 });
    }

    // Must respond quickly (<500ms), so enqueue job for processing
    // For now, process synchronously (BullMQ to be added later)
    await processProductUpdate(shop, payload as ProductUpdatePayload);

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    // Return 200 anyway to prevent Shopify from retrying
    // Log error for manual investigation
    return new Response(null, { status: 200 });
  }
};

async function processProductUpdate(shop: string, payload: ProductUpdatePayload) {
  try {
    await connectToMongoDB();

    // Find enabled recipes for this webhook
    const recipes = await Recipe.find({
      shop,
      enabled: true,
      'trigger.type': 'webhook',
      'trigger.webhookTopic': 'products/update',
    });

    if (recipes.length === 0) {
      console.log(`No enabled recipes for products/update on shop ${shop}`);
      return;
    }

    // Execute each recipe
    for (const recipe of recipes) {
      try {
        await executeRecipe(shop, recipe, payload);

        // Increment execution count
        recipe.executionCount += 1;
        recipe.lastExecuted = new Date();
        await recipe.save();
      } catch (error) {
        console.error(`Recipe ${recipe.recipeId} failed:`, error);

        // Log failure
        await AutomationLog.create({
          shop,
          recipeId: recipe.recipeId,
          recipeName: recipe.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          resourceType: 'product',
          resourceId: payload.id.toString(),
        });
      }
    }
  } catch (error) {
    console.error('processProductUpdate failed:', error);
    throw error;
  }
}
```

**Why this is DONE:**
- ✅ Proper webhook authentication
- ✅ Type-safe payload interface
- ✅ Validates webhook topic
- ✅ Returns 200 quickly (<500ms requirement)
- ✅ Error handling with try-catch
- ✅ Multi-tenant query scoping
- ✅ Logs execution and errors
- ✅ Updates recipe execution count
- ✅ Returns 200 even on error (prevents retry storms)
- ✅ Clear separation of concerns (handler vs processor)

#### ❌ NOT DONE - Incomplete Webhook Handler
```typescript
// app/routes/webhooks.products.update.tsx
import { type ActionFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await request.json();
  console.log('Product updated:', body);
  return new Response('OK');
};
```

**Why this is NOT DONE:**
- ❌ No webhook authentication (HMAC validation missing!)
- ❌ No type safety for payload
- ❌ Doesn't check webhook topic
- ❌ No actual processing logic
- ❌ No database queries
- ❌ No recipe execution
- ❌ No error handling
- ❌ Returns string instead of proper status
- ❌ Missing shop identification

---

### Example 5: Testing Completion

#### ✅ DONE - Properly Tested Feature
```
Manual Testing Checklist for VIP Customer Recipe:

Database:
[x] Recipe document exists in MongoDB
[x] Recipe has correct shop field
[x] Recipe has all required fields (trigger, conditions, actions)

Webhook:
[x] Webhook registered in Shopify (pnpm deploy)
[x] Webhook handler responds within 500ms
[x] HMAC validation passes
[x] Webhook triggers recipe evaluation

Recipe Logic:
[x] Condition evaluates correctly (totalSpent > 1000)
[x] Tag "VIP" is added when condition is true
[x] Tag is NOT added when condition is false
[x] Recipe execution count increments

Activity Log:
[x] AutomationLog entry created on success
[x] AutomationLog entry created on failure
[x] Log contains correct shop, recipeId, resourceType

Multi-Tenant:
[x] Recipe only executes for correct shop
[x] Tested with 2 different shops
[x] Data doesn't leak between shops

Error Cases:
[x] Handles GraphQL errors gracefully
[x] Handles network timeouts
[x] Handles missing customer data
[x] Returns 200 even if recipe fails

Build Quality:
[x] pnpm lint passes
[x] pnpm build succeeds
[x] pnpm types-check passes
[x] No console errors in browser
```

**Why this is DONE:**
- All checkboxes marked [x] - every test completed
- Comprehensive test cases covering all scenarios
- All components tested (DB, webhook, logic, logging)
- Multi-tenant testing completed
- Error cases handled
- Build quality verified
- Documented test results

#### ❌ NOT DONE - Incomplete Testing
```
Testing:
[ ] Recipe document exists in MongoDB
[ ] Webhook handler responds within 500ms
[ ] Condition evaluates correctly
[x] Created the recipe file
[ ] Tag is added when condition is true
[ ] Multi-tenant testing completed
[ ] pnpm lint passes
[ ] pnpm build succeeds

Notes:
- Only created the file, haven't tested functionality
- Assuming it will work in production
```

**Why this is NOT DONE:**
- Most checkboxes still [ ] unchecked
- No actual testing performed
- No verification of functionality
- No error case testing
- No multi-tenant testing
- No build verification
- Just assumptions, not validation

---

### Summary Checklist

Use this quick checklist before marking any task as done:

**Code Quality:**
- [ ] No TypeScript errors (`pnpm types-check`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No `any` types or `@ts-ignore` comments
- [ ] All functions have return types

**Functionality:**
- [ ] Feature works end-to-end
- [ ] All edge cases handled
- [ ] Error messages are user-friendly
- [ ] Optimistic UI for better UX (where applicable)

**Security & Multi-Tenancy:**
- [ ] All database queries scoped by `shop`
- [ ] Webhook HMAC validation present
- [ ] No hardcoded shop domains
- [ ] Tested with multiple shops

**Error Handling:**
- [ ] Try-catch blocks present
- [ ] Errors logged to console
- [ ] User-facing errors shown in UI
- [ ] Doesn't crash the application

**Documentation:**
- [ ] Complex logic has comments
- [ ] JSDoc for public functions
- [ ] README updated if needed
- [ ] CHANGELOG updated if needed

**✅ DONE = All items marked [x]**
**❌ NOT DONE = Any item still [ ]**

If ANY item is unchecked `[ ]`, the task is **NOT DONE**.

---

## Example Task Breakdown

### Task: "Implement VIP Customer Recipe"

#### 1. Understanding
- **Objective**: Auto-tag customers when total spend > $1000
- **Scope**: Single recipe, webhook-triggered
- **Dependencies**: Recipe engine, AutomationLog model
- **Success**: Customers tagged when condition met, logged in activity

#### 2. Planning
- **Data**: Use existing Recipe and AutomationLog models
- **API**: Shopify customers/update webhook, Customer GraphQL mutation
- **UI**: Display in Recipe Library with toggle

#### 3. Sub-tasks
1. Create recipe definition in `app/recipes/customerRecipes.ts`
2. Register webhook in `shopify.app.toml`
3. Create webhook handler `app/routes/webhooks.customers.update.tsx`
4. Test recipe engine evaluation
5. Verify activity logging

#### 4. Implementation
```typescript
// app/recipes/customerRecipes.ts
export const vipCustomerRecipe: IRecipeData = {
  recipeId: 'vip-customer',
  name: 'VIP Customer',
  description: 'Auto-tag customers when total spend exceeds $1000',
  category: 'customer',
  enabled: false,
  trigger: {
    type: 'webhook',
    webhookTopic: 'customers/update',
  },
  conditions: [
    {
      field: 'totalSpent',
      operator: '>',
      value: 1000,
      dataType: 'number',
    },
  ],
  actions: [
    {
      type: 'addTag',
      config: { tagName: 'VIP' },
    },
  ],
  executionCount: 0,
};
```

#### 5. Testing
- [ ] Webhook receives customer update
- [ ] Condition evaluates correctly
- [ ] Tag applied via GraphQL
- [ ] Activity log created
- [ ] Works for multiple shops (multi-tenant)

---

## Quick Reference

### Environment Variables
```bash
SHOPIFY_API_KEY=           # From Partners dashboard
SHOPIFY_API_SECRET=        # From Partners dashboard
SCOPES=                    # write_products,write_customers,...
MONGODB_URL=               # mongodb://localhost:27017/shopops
REDIS_URL=                 # redis://localhost:6379
```

### Key Commands
```bash
pnpm dev                   # Start dev server
pnpm build                 # Production build
pnpm lint                  # ESLint check
pnpm graphql-codegen       # Generate types
pnpm deploy                # Deploy to Shopify
```

### Important Files
- `shopify.app.toml` - App configuration, webhooks
- `app/shopify.server.ts` - OAuth, API setup
- `app/mongoose.server.ts` - Database connection
- `app/routes.ts` - Routing configuration

### Multi-Tenant Query Pattern
```typescript
// ALWAYS include shop in queries
{ shop: session.shop }
```

### Shopify API Limits
- GraphQL: 50 cost points/second
- Bulk Operations: Use for >1000 resources
- Webhooks: Must respond <500ms

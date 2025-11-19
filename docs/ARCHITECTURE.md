# Shop-Ops Suite - Technical Architecture

**Version:** 1.1
**Last Updated:** 2025-11-17
**Status:** Phase 0 Complete, Phase 1 In Progress

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagrams](#architecture-diagrams)
3. [Technology Stack](#technology-stack)
4. [Component Architecture](#component-architecture)
5. [Data Models](#data-models)
6. [API Design](#api-design)
7. [Job Queue System](#job-queue-system)
8. [Infrastructure](#infrastructure)
9. [Security & Compliance](#security--compliance)
10. [Performance Requirements](#performance-requirements)
11. [Development Workflow](#development-workflow)
12. [Deployment Strategy](#deployment-strategy)

---

## System Overview

### What is Shop-Ops Suite?

Shop-Ops Suite is a Shopify Admin App that provides backend automation through a "Recipe Library" approach. It runs 100% server-side with zero impact on storefront performance.

### Core Architecture Principles

1. **Server-Side Only**: All processing happens on the backend
2. **Multi-Tenant**: Single codebase serves thousands of shops
3. **Event-Driven**: Webhook-based triggers for real-time automation
4. **Scalable**: Horizontal scaling via stateless architecture
5. **Type-Safe**: Full TypeScript implementation
6. **Native Experience**: Embedded in Shopify Admin using App Bridge

### Current Implementation Status

- ✅ **Phase 0 (Foundation)**: 100% Complete
- 🚧 **Phase 1 (MVP)**: 15% Complete
- 📋 **Overall Progress**: ~20% of full feature set

---

## Architecture Diagrams

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Shopify Platform                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Admin UI    │  │  Webhooks    │  │  GraphQL Admin API │   │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘   │
└─────────┼──────────────────┼───────────────────┼───────────────┘
          │                  │                   │
          │ App Bridge       │ HTTPS POST        │ GraphQL
          │ (Embedded)       │ (HMAC signed)     │ (OAuth 2.0)
          │                  │                   │
┌─────────▼──────────────────▼───────────────────▼───────────────┐
│                     Shop-Ops Suite                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Web Application (Remix)                    │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │  UI Routes   │  │  API Routes  │  │  Webhooks   │  │    │
│  │  │  (Polaris)   │  │  (Loaders)   │  │  (Handlers) │  │    │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └─────────┬────────────────┬────────────────┬────────────┘    │
│            │                │                │                  │
│  ┌─────────▼────────────────▼────────────────▼────────────┐    │
│  │              Business Logic Layer                       │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │Recipe Engine │  │Tag Service   │  │Bulk Ops     │  │    │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └─────────┬────────────────┬────────────────┬────────────┘    │
│            │                │                │                  │
│  ┌─────────▼────────────────▼────────────────▼────────────┐    │
│  │              Job Queue (BullMQ)                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │ Tag Jobs     │  │ Webhook Jobs │  │ Scheduled   │  │    │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └─────────┬────────────────┬────────────────┬────────────┘    │
│            │                │                │                  │
│  ┌─────────▼────────────────▼────────────────▼────────────┐    │
│  │              Data Layer                                 │    │
│  │  ┌──────────────┐              ┌──────────────┐        │    │
│  │  │   MongoDB    │              │    Redis     │        │    │
│  │  │  (Mongoose)  │              │  (Sessions)  │        │    │
│  │  │              │              │  (Queue)     │        │    │
│  │  │ - Recipes    │              │  (Cache)     │        │    │
│  │  │ - Settings   │              └──────────────┘        │    │
│  │  │ - Audit Logs │                                      │    │
│  │  │ - Shop Meta  │                                      │    │
│  │  └──────────────┘                                      │    │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow - Embedded App

```
User Action in Shopify Admin
          │
          ▼
┌─────────────────────┐
│  App Bridge (JS)    │  Handles navigation, modals
└──────────┬──────────┘
           │ HTTP Request (with session)
           ▼
┌─────────────────────┐
│  Remix Loader       │  SSR, authentication
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Business Logic     │  Recipe evaluation, data processing
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  MongoDB/Redis      │  Data persistence
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  React Component    │  Polaris UI rendered
│  (SSR + Hydration)  │
└─────────────────────┘
           │
           ▼
    User sees result
```

### Webhook Processing Flow

```
Shopify Event (order created, product updated, etc.)
          │
          ▼
┌─────────────────────┐
│  Webhook Handler    │  HMAC validation
│  (Remix Route)      │
└──────────┬──────────┘
           │ 200 OK (< 500ms)
           │
           ▼
┌─────────────────────┐
│  BullMQ Job Queue   │  Async processing
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Worker Process     │  Parallel execution
│  (Separate)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Recipe Engine      │  Evaluate rules
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Shopify GraphQL    │  Apply tags, update data
│  Admin API          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  MongoDB            │  Log action
│  (AutomationLog)    │
└─────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Shopify Polaris** | v13.9.5 | React component library for Shopify Admin UI |
| **Shopify App Bridge** | v4.1.6 | Embedded app integration (navigation, modals) |
| **React** | 18.2.0 | UI library with concurrent features |
| **TypeScript** | 5.2.2 | Type safety for frontend code |
| **Zustand** | 5.0.8 | Lightweight state management |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Remix** | v2.16.1 | Full-stack React framework with SSR |
| **Node.js** | 18.20+ | JavaScript runtime (supports up to v21+) |
| **TypeScript** | 5.2.2 | Type safety for backend code |
| **MongoDB** | Latest | Primary NoSQL database via Mongoose |
| **Mongoose** | 8.19.4 | ODM for MongoDB with schema validation |
| **Redis** | Latest | Session storage, job queue, caching |

### Shopify Integration

| Package | Version | Purpose |
|---------|---------|---------|
| **@shopify/shopify-app-remix** | v3.7.0 | Core authentication and API integration |
| **@shopify/shopify-app-session-storage-redis** | v5.0.2 | Redis-based session storage |
| **Shopify Admin API** | January 2025 | GraphQL API for shop data |

### Build & Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Vite** | 6.2.2 | Modern bundler (dev server + production builds) |
| **pnpm** | Latest | Fast, efficient package manager |
| **GraphQL Code Generator** | Latest | Type-safe GraphQL operations |
| **ESLint** | 8.42.0 | Code quality and linting |
| **Prettier** | 3.2.4 | Code formatting |

### Job Processing (Planned)

| Technology | Purpose |
|------------|---------|
| **BullMQ** | Distributed job queue with Redis |
| **Worker Processes** | Separate Node.js processes for async tasks |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerized deployment |
| **Cloud Platform** | AWS / GCP / DigitalOcean |
| **Nginx** | Reverse proxy (planned) |
| **PM2** | Process manager (planned) |

---

## Component Architecture

### File Structure

```
/home/huong2/test/Shop-Ops-Suite/
├── app/                              # Main application code
│   ├── routes/                       # Remix file-based routing
│   │   ├── app.tsx                  # ✅ Main app layout (authenticated)
│   │   ├── app._index.tsx           # ✅ Home page
│   │   ├── app.additional.tsx       # ✅ Example page
│   │   ├── auth.$.tsx               # ✅ Auth catch-all
│   │   ├── auth.login/              # ✅ Login page
│   │   │   ├── route.tsx
│   │   │   └── error.server.tsx
│   │   ├── _index/                  # ✅ Public landing page
│   │   │   ├── route.tsx
│   │   │   └── styles.module.css
│   │   ├── webhooks.app.uninstalled.tsx     # ✅ Uninstall webhook
│   │   └── webhooks.app.scopes_update.tsx   # ✅ Scopes webhook
│   │
│   ├── models/                       # ⏳ Mongoose data models (planned)
│   │   ├── Recipe.ts                # Recipe schema
│   │   ├── Setting.ts               # Shop settings
│   │   ├── AutomationLog.ts         # Audit trail
│   │   └── Shop.ts                  # Shop metadata
│   │
│   ├── services/                     # ⏳ Business logic (planned)
│   │   ├── recipeEngine.ts          # Core recipe evaluation engine
│   │   ├── tagService.ts            # Tag management
│   │   ├── metafieldService.ts      # Metafield operations
│   │   ├── bulkOpsService.ts        # Bulk operations handler
│   │   └── webhookProcessor.ts      # Webhook processing logic
│   │
│   ├── jobs/                         # ⏳ BullMQ job definitions (planned)
│   │   ├── recipeExecutor.ts        # Execute recipe jobs
│   │   ├── scheduledTasks.ts        # Cron-based recurring jobs
│   │   └── webhookHandler.ts        # Process webhook events
│   │
│   ├── utils/                        # ⏳ Shared utilities (planned)
│   │   ├── shopifyApi.ts            # GraphQL client wrapper
│   │   ├── validators.ts            # Input validation
│   │   ├── logger.ts                # Structured logging
│   │   └── constants.ts             # App-wide constants
│   │
│   ├── shopify.server.ts             # ✅ Shopify app config & auth
│   ├── mongoose.server.ts            # ✅ MongoDB connection
│   ├── root.tsx                      # ✅ Root HTML layout
│   ├── entry.server.tsx              # ✅ SSR entry point
│   ├── entry.client.tsx              # ✅ Client hydration
│   ├── routes.ts                     # ✅ Flat routes config
│   └── globals.d.ts                  # ✅ Global type definitions
│
├── public/                           # Static assets
│   └── favicon.ico
│
├── extensions/                       # Shopify app extensions (empty)
│
├── package.json                      # Dependencies
├── pnpm-lock.yaml                    # Dependency lock
├── vite.config.ts                    # Vite configuration
├── tsconfig.json                     # TypeScript config
├── .graphqlrc.ts                     # GraphQL codegen config
├── shopify.app.toml                  # Shopify app manifest
├── shopify.web.toml                  # Web configuration
├── Dockerfile                        # Docker deployment
├── .env.example                      # Environment template
├── README.md                         # Setup docs
├── CHANGELOG.md                      # Version history
├── PRD.md                            # Product requirements
└── ARCHITECTURE.md                   # This file
```

### Core Modules (Planned)

#### Module 1: Smart Tagger
**Location:** `app/services/tagService.ts`, `app/routes/app.recipes.tsx`

**Purpose:** Automate product, customer, and order tagging

**Key Features:**
- 20+ pre-built recipe templates
- Webhook-triggered automation
- Conditional logic evaluation (if/then)
- Tag addition/removal operations

**Tech Stack:**
- Webhooks: `products/update`, `customers/update`, `orders/create`
- BullMQ jobs for async processing
- GraphQL mutations for tagging

#### Module 2: Metafield Manager
**Location:** `app/services/metafieldService.ts`, `app/routes/app.metafields.tsx`

**Purpose:** Automate metafield management and COGS entry

**Key Features:**
- Automated metafield population
- COGS entry interface (spreadsheet-like)
- CSV import/export
- Metafield templates

**Tech Stack:**
- Shopify Metafield API
- Bulk operations for mass updates
- CSV parsing library (Papa Parse)

#### Module 3: Data Cleaner
**Location:** `app/services/cleanerService.ts`, `app/routes/app.cleaner.tsx`

**Purpose:** Data hygiene and maintenance tools

**Key Features:**
- Tag cleanup (orphaned, duplicates)
- Auto un-tag based on date
- Data quality audits
- Scheduled cleanups

**Tech Stack:**
- MongoDB aggregation pipelines
- Scheduled jobs (cron)
- GraphQL queries for auditing

#### Module 4: Bulk Operations
**Location:** `app/services/bulkOpsService.ts`, `app/routes/app.bulk.tsx`

**Purpose:** Find & Replace for bulk administrative tasks

**Key Features:**
- Complex filtering (tags, collections, dates)
- Preview before execution
- Progress tracking
- Chunking for large operations (10K+ items)

**Tech Stack:**
- Shopify Bulk Operations GraphQL API
- Polling mechanism for status
- MongoDB for progress tracking

#### Module 5: Activity Log
**Location:** `app/models/AutomationLog.ts`, `app/routes/app.activity.tsx`

**Purpose:** Comprehensive audit trail and transparency

**Key Features:**
- Log every action (timestamp, user, resource, changes)
- Search and filtering
- CSV export
- Retention policies (30 days Free, 1 year Pro)

**Tech Stack:**
- MongoDB collections with TTL indexes
- Server-side pagination
- Export to CSV utility

---

## Data Models

### MongoDB Collections (Mongoose Schemas)

#### 1. Recipe Schema

```typescript
// app/models/Recipe.ts
interface IRecipe {
  _id: ObjectId;
  shop: string;                    // shopify.myshopify.com
  recipeId: string;                // unique recipe identifier
  name: string;                    // "Auto-tag VIP Customers"
  description: string;
  category: 'product' | 'customer' | 'order';
  enabled: boolean;                // toggle state

  // Trigger configuration
  trigger: {
    type: 'webhook' | 'scheduled';
    webhookTopic?: string;         // e.g., "customers/update"
    cronExpression?: string;       // e.g., "0 0 * * *" (daily)
  };

  // Condition configuration (if/then logic)
  conditions: {
    field: string;                 // e.g., "totalSpent"
    operator: '>' | '<' | '=' | '!=' | 'contains' | 'in';
    value: any;                    // e.g., 1000
    dataType: 'string' | 'number' | 'boolean' | 'date';
  }[];

  // Action configuration
  actions: {
    type: 'addTag' | 'removeTag' | 'setMetafield' | 'updateField';
    config: {
      tagName?: string;            // e.g., "VIP"
      metafieldKey?: string;
      metafieldValue?: any;
    };
  }[];

  // Metadata
  executionCount: number;
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
// - { shop: 1, enabled: 1 } - Find active recipes for a shop
// - { shop: 1, category: 1 } - Filter by category
// - { shop: 1, recipeId: 1 } - Unique recipe lookup
```

#### 2. Setting Schema

```typescript
// app/models/Setting.ts
interface ISetting {
  _id: ObjectId;
  shop: string;                    // shopify.myshopify.com

  // Plan & billing
  plan: 'free' | 'pro' | 'enterprise';
  subscriptionId?: string;
  billingStatus: 'active' | 'cancelled' | 'expired';
  trialEndsAt?: Date;

  // Usage tracking
  usage: {
    recipesActive: number;
    recipesLimit: number;          // 3 for free, unlimited for pro
    actionsThisMonth: number;
    actionsLimit: number;          // 5 for free, 10000 for pro
    lastResetAt: Date;             // monthly reset
  };

  // Preferences
  preferences: {
    emailNotifications: boolean;
    activityLogRetention: number;  // days (30 free, 365 pro)
    timezone: string;
  };

  // Installation metadata
  installedAt: Date;
  uninstalledAt?: Date;
  shopifyAccessToken: string;      // encrypted
  shopifyScope: string;

  createdAt: Date;
  updatedAt: Date;
}

// Indexes
// - { shop: 1 } - Unique shop lookup
// - { plan: 1 } - Query by plan type
```

#### 3. AutomationLog Schema

```typescript
// app/models/AutomationLog.ts
interface IAutomationLog {
  _id: ObjectId;
  shop: string;                    // shopify.myshopify.com

  // Action details
  recipeId?: string;               // null for manual actions
  recipeName: string;
  actionType: 'addTag' | 'removeTag' | 'setMetafield' | 'bulkUpdate';

  // Resource affected
  resourceType: 'product' | 'customer' | 'order';
  resourceId: string;              // Shopify GID
  resourceTitle?: string;          // for display

  // Change tracking
  changesBefore: any;              // JSON snapshot
  changesAfter: any;               // JSON snapshot

  // Execution metadata
  status: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  executionTimeMs: number;

  // Audit trail
  triggeredBy: 'webhook' | 'scheduled' | 'manual';
  userId?: string;                 // if manual

  createdAt: Date;                 // indexed with TTL
}

// Indexes
// - { shop: 1, createdAt: -1 } - Recent logs
// - { shop: 1, resourceType: 1 } - Filter by type
// - { createdAt: 1 } with TTL based on plan
// - { shop: 1, recipeId: 1 } - Logs for specific recipe
```

#### 4. Shop Schema

```typescript
// app/models/Shop.ts
interface IShop {
  _id: ObjectId;
  shop: string;                    // shopify.myshopify.com (unique)

  // Shop metadata
  shopName: string;
  email: string;
  currency: string;
  timezone: string;
  plan: string;                    // Shopify plan (not our plan)

  // Analytics
  stats: {
    totalRecipes: number;
    totalActionsExecuted: number;
    lastActivityAt?: Date;
  };

  // Features enabled
  features: {
    smartTagger: boolean;
    metafieldManager: boolean;
    dataCleaner: boolean;
    bulkOperations: boolean;
    activityLog: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

// Indexes
// - { shop: 1 } - Unique constraint
```

### Redis Data Structures

#### Session Storage
```
Key: sess:shop_<shopDomain>_<sessionId>
Value: JSON string containing session data
TTL: 30 days
```

#### Job Queue (BullMQ)
```
Queue: recipe-execution
Queue: webhook-processing
Queue: scheduled-tasks
Queue: bulk-operations
```

#### Cache Layer (Planned)
```
Key: shop:<shopDomain>:recipes
Value: JSON array of active recipes
TTL: 5 minutes

Key: shop:<shopDomain>:settings
Value: JSON settings object
TTL: 10 minutes
```

---

## API Design

### Shopify GraphQL Admin API Usage

#### Product Operations

**Tagging a Product:**
```graphql
mutation productUpdate($input: ProductInput!) {
  productUpdate(input: $input) {
    product {
      id
      tags
    }
    userErrors {
      field
      message
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "id": "gid://shopify/Product/123456789",
    "tags": ["VIP", "High Value", "New Arrival"]
  }
}
```

**Bulk Product Query:**
```graphql
mutation {
  bulkOperationRunQuery(
    query: """
    {
      products {
        edges {
          node {
            id
            title
            tags
            totalInventory
          }
        }
      }
    }
    """
  ) {
    bulkOperation {
      id
      status
    }
    userErrors {
      field
      message
    }
  }
}
```

#### Customer Operations

**Tagging a Customer:**
```graphql
mutation customerUpdate($input: CustomerInput!) {
  customerUpdate(input: $input) {
    customer {
      id
      tags
    }
    userErrors {
      field
      message
    }
  }
}
```

#### Metafield Operations

**Set Product Metafield:**
```graphql
mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
      value
    }
    userErrors {
      field
      message
    }
  }
}
```

**Variables:**
```json
{
  "metafields": [
    {
      "ownerId": "gid://shopify/Product/123456789",
      "namespace": "custom",
      "key": "cost_of_goods_sold",
      "value": "25.50",
      "type": "number_decimal"
    }
  ]
}
```

### Internal API Routes (Remix Loaders/Actions)

#### Recipe Management

**GET `/app/recipes`**
- Load all recipes for the authenticated shop
- Server-side rendering with Polaris UI
- Returns: HTML with recipe list

**POST `/app/recipes/toggle`**
- Toggle a recipe on/off
- Validates permissions and plan limits
- Returns: JSON success/error

**POST `/app/recipes/execute`**
- Manually trigger a recipe execution
- Enqueues a job in BullMQ
- Returns: Job ID for status polling

#### Activity Log

**GET `/app/activity`**
- Load paginated activity logs
- Filters: date range, resource type, status
- Returns: HTML with log table

**GET `/app/activity/export`**
- Export logs to CSV
- Applies current filters
- Returns: CSV file download

#### Settings

**GET `/app/settings`**
- Load shop settings
- Returns: HTML form with current values

**POST `/app/settings`**
- Update shop preferences
- Validates input
- Returns: JSON success/error

### Webhook Endpoints

**POST `/webhooks/app/uninstalled`**
```typescript
// app/routes/webhooks.app.uninstalled.tsx
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session } = await authenticate.webhook(request);

  // Clean up data
  await Setting.findOneAndUpdate(
    { shop },
    { uninstalledAt: new Date() }
  );

  return new Response(null, { status: 200 });
};
```

**POST `/webhooks/products/update`** (Planned)
```typescript
// app/routes/webhooks.products.update.tsx
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, payload } = await authenticate.webhook(request);

  // Enqueue job for processing
  await recipeQueue.add('product-update', {
    shop,
    productId: payload.admin_graphql_api_id,
    product: payload,
  });

  return new Response(null, { status: 200 });
};
```

---

## Job Queue System

### BullMQ Architecture (Planned)

#### Queue Configuration

```typescript
// app/services/queue.server.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

// Recipe execution queue
export const recipeQueue = new Queue('recipe-execution', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Webhook processing queue
export const webhookQueue = new Queue('webhook-processing', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

// Scheduled tasks queue
export const scheduledQueue = new Queue('scheduled-tasks', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    repeat: {
      pattern: '0 0 * * *', // Daily at midnight
    },
  },
});
```

#### Worker Processes

```typescript
// app/jobs/recipeExecutor.ts
import { Worker } from 'bullmq';

const worker = new Worker(
  'recipe-execution',
  async (job) => {
    const { shop, recipeId, resourceId } = job.data;

    // Fetch recipe configuration
    const recipe = await Recipe.findOne({ shop, recipeId, enabled: true });
    if (!recipe) return { skipped: true };

    // Evaluate conditions
    const shouldExecute = await evaluateConditions(recipe, resourceId);
    if (!shouldExecute) return { skipped: true };

    // Execute actions
    const result = await executeActions(recipe, resourceId);

    // Log to database
    await AutomationLog.create({
      shop,
      recipeId,
      resourceId,
      status: result.success ? 'success' : 'failure',
      executionTimeMs: job.processedOn - job.timestamp,
    });

    return result;
  },
  {
    connection,
    concurrency: 5, // Process 5 jobs in parallel
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

#### Job Types

1. **Recipe Execution Jobs**
   - Triggered by webhooks or schedules
   - Evaluate recipe conditions
   - Execute actions (tag, metafield, etc.)
   - Log results

2. **Webhook Processing Jobs**
   - Parse webhook payload
   - Find matching recipes
   - Enqueue recipe execution jobs

3. **Scheduled Task Jobs**
   - Recurring recipes (daily, weekly, monthly)
   - Data cleanup (expired tags)
   - Usage reset (monthly limits)

4. **Bulk Operation Jobs**
   - Poll Shopify Bulk Operations API
   - Process results in chunks
   - Update progress tracking

---

## Infrastructure

### Cloud Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Load Balancer                         │
│                       (HTTPS/SSL)                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│  Web 1  │  │  Web 2  │  │  Web 3  │  Remix app instances
│ (Node)  │  │ (Node)  │  │ (Node)  │  (Stateless, horizontal scaling)
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
     └────────────┼────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│Worker 1 │  │Worker 2 │  │Worker 3 │  BullMQ workers
│(BullMQ) │  │(BullMQ) │  │(BullMQ) │  (Separate processes)
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
     └────────────┼────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
    ┌─────────┐       ┌─────────┐
    │  Redis  │       │ MongoDB │
    │ Cluster │       │ Replica │
    │         │       │   Set   │
    └─────────┘       └─────────┘
```

### Scaling Strategy

**Horizontal Scaling (Web Servers):**
- Stateless architecture (sessions in Redis)
- Auto-scaling based on CPU/memory usage
- Health checks for load balancer
- Target: 50-100 requests/second per instance

**Worker Scaling:**
- Separate worker processes from web servers
- Scale independently based on queue depth
- Target: Process 1000+ jobs/minute

**Database Scaling:**
- MongoDB: Replica set for read scaling
- Redis: Cluster mode for high availability
- Connection pooling (max 10 connections per instance)

### Environment Configuration

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Shopify
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=write_products,write_customers,write_orders
SHOPIFY_APP_URL=https://your-app.com

# Database
MONGODB_URL=mongodb://user:pass@host:27017/shopops?replicaSet=rs0
REDIS_URL=redis://user:pass@host:6379

# Job Queue
BULLMQ_CONCURRENCY=5
WORKER_COUNT=3

# Monitoring (optional)
SENTRY_DSN=https://...
DATADOG_API_KEY=your_key
```

---

## Security & Compliance

### Authentication & Authorization

**OAuth 2.0 Flow:**
1. User installs app from Shopify App Store
2. Redirect to Shopify authorization page
3. User grants permissions (scopes)
4. Shopify redirects back with authorization code
5. Exchange code for access token
6. Store access token in MongoDB (encrypted)
7. Store session in Redis

**Session Security:**
- Session tokens stored in Redis with 30-day TTL
- HMAC signature validation for all webhooks
- CSRF protection via Remix
- Secure cookies (httpOnly, sameSite, secure)

### Data Encryption

**At Rest:**
- MongoDB: Encrypted storage volumes
- Access tokens: Encrypted using AES-256
- Sensitive metafields: Encrypted in database

**In Transit:**
- HTTPS/TLS 1.3 for all connections
- Shopify API: OAuth 2.0 bearer tokens
- Webhook HMAC signature validation

### GDPR Compliance

**Data Deletion on Uninstall:**
```typescript
// app/routes/webhooks.app.uninstalled.tsx
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop } = await authenticate.webhook(request);

  // Delete all shop data
  await Promise.all([
    Recipe.deleteMany({ shop }),
    Setting.deleteOne({ shop }),
    AutomationLog.deleteMany({ shop }),
    Shop.deleteOne({ shop }),
  ]);

  return new Response(null, { status: 200 });
};
```

**Data Retention Policies:**
- Activity logs: 30 days (Free), 1 year (Pro)
- Sessions: 30 days
- Recipes/Settings: Until uninstall
- Automatic TTL indexes in MongoDB

### Rate Limiting

**Shopify API:**
- GraphQL: 50 cost points per second (bucket leak)
- REST API: 2 requests per second (deprecated)
- Bulk Operations: 1 concurrent operation per shop

**Internal API:**
```typescript
// app/utils/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
});
```

### Input Validation

**All user inputs validated using:**
- Zod schemas for type safety
- Sanitization for XSS prevention
- SQL injection prevention (NoSQL with Mongoose)
- CSRF tokens for state-changing operations

---

## Performance Requirements

### SLA Targets

| Metric | Free Plan | Pro Plan | Enterprise |
|--------|-----------|----------|------------|
| **Uptime** | 99.0% | 99.5% | 99.9% |
| **Webhook Acknowledgment** | <1s | <500ms | <200ms |
| **Recipe Execution Start** | <5min | <1min | <30s |
| **UI Response Time** | <500ms | <200ms | <100ms |
| **Bulk Operations** | 1K items | 10K items | 100K items |

### Optimization Strategies

**Frontend:**
- Server-side rendering (SSR) with Remix
- Code splitting per route
- Lazy loading for heavy components
- Polaris components (optimized for Shopify)

**Backend:**
- MongoDB indexes on frequently queried fields
- Redis caching for settings and recipes
- Connection pooling (MongoDB, Redis)
- Async job processing (BullMQ)

**Database:**
- Indexes:
  - `{ shop: 1, enabled: 1 }` on Recipe
  - `{ shop: 1, createdAt: -1 }` on AutomationLog
  - `{ shop: 1 }` unique on Setting
- TTL indexes for automatic cleanup
- Replica set for read scaling

**Job Queue:**
- Parallel processing (5 concurrent jobs per worker)
- Priority queues (webhooks > scheduled > manual)
- Exponential backoff for retries
- Dead letter queue for failed jobs

---

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/yourorg/shop-ops-suite.git
cd shop-ops-suite

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your Shopify app credentials

# 4. Start MongoDB and Redis (Docker)
docker-compose up -d mongodb redis

# 5. Start development server
pnpm dev
# Runs Shopify CLI + Remix dev server with HMR
```

### Development Commands

```bash
# Development
pnpm dev                  # Start dev server (Shopify CLI)
pnpm dev:remix            # Start Remix dev server only

# Build
pnpm build                # Production build
pnpm start                # Start production server

# Code Quality
pnpm lint                 # ESLint check
pnpm format               # Prettier format
pnpm type-check           # TypeScript check

# Database
pnpm db:seed              # Seed database (planned)
pnpm db:reset             # Reset database (planned)

# GraphQL
pnpm graphql:codegen      # Generate TypeScript types

# Testing (planned)
pnpm test                 # Run all tests
pnpm test:unit            # Unit tests
pnpm test:integration     # Integration tests
pnpm test:e2e             # End-to-end tests
```

### Git Workflow

```
main (production)
  └── develop (staging)
       └── feature/* (feature branches)
```

**Branch Naming:**
- `feature/smart-tagger`
- `fix/webhook-validation`
- `refactor/recipe-engine`

**Commit Convention:**
```
feat: Add recipe execution engine
fix: Resolve webhook HMAC validation
docs: Update architecture documentation
refactor: Simplify tag service logic
test: Add unit tests for recipe engine
```

### Code Review Checklist

- [ ] TypeScript types are correct
- [ ] No console.logs (use structured logger)
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] Tests written (unit + integration)
- [ ] Database indexes updated if needed
- [ ] Environment variables documented
- [ ] Performance impact considered
- [ ] Security implications reviewed

---

## Deployment Strategy

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "run", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URL=mongodb://mongodb:27017/shopops
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure

  worker:
    build: .
    command: node ./build/jobs/worker.js
    environment:
      - NODE_ENV=production
      - MONGODB_URL=mongodb://mongodb:27017/shopops
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    deploy:
      replicas: 2

  mongodb:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  mongo_data:
  redis_data:
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: yourorg/shop-ops-suite:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Cloud
        run: |
          # Deploy to AWS/GCP/DigitalOcean
          # Update Docker containers
          # Run database migrations
          # Health check
```

### Monitoring & Observability

**Logging:**
- Structured JSON logs (Winston or Pino)
- Log levels: error, warn, info, debug
- Centralized logging (CloudWatch, DataDog, LogDNA)

**Metrics:**
- Request latency (p50, p95, p99)
- Job queue depth
- Error rates
- Active sessions
- Database query times

**Alerting:**
- High error rate (>1%)
- Job queue backup (>1000 pending jobs)
- Database connection failures
- High memory usage (>80%)
- API rate limit warnings

**Health Checks:**
```typescript
// app/routes/health.tsx
export const loader = async () => {
  const checks = {
    mongodb: await checkMongoDB(),
    redis: await checkRedis(),
    shopify: await checkShopifyAPI(),
  };

  const healthy = Object.values(checks).every(c => c.ok);

  return json(checks, {
    status: healthy ? 200 : 503,
  });
};
```

---

## Appendix

### Technology Decision Rationale

**Why Remix?**
- Built-in SSR for fast page loads
- File-based routing (clean structure)
- Shopify official support (@shopify/shopify-app-remix)
- Progressive enhancement
- Better SEO for landing pages

**Why MongoDB?**
- Flexible schema for recipe configurations
- Easy to scale horizontally
- Fast reads with indexes
- JSON-native (matches GraphQL)
- TTL indexes for automatic cleanup

**Why Redis?**
- Fast session storage (in-memory)
- BullMQ job queue support
- Pub/sub for real-time features (future)
- Distributed caching
- High availability with clustering

**Why BullMQ?**
- Redis-based (already in stack)
- Robust retry logic
- Scheduled jobs (cron)
- Priority queues
- Good monitoring tools

### Future Enhancements

**Phase 2+:**
- [ ] Real-time dashboard (WebSockets)
- [ ] Custom recipe builder (visual flow editor)
- [ ] Multi-store management (agencies)
- [ ] Integration marketplace (Klaviyo, ShipStation)
- [ ] Advanced analytics and reporting
- [ ] Email/SMS notifications
- [ ] Webhooks API (trigger external systems)
- [ ] Mobile app (React Native)

### References

- [Shopify Admin API Docs](https://shopify.dev/docs/api/admin-graphql)
- [Remix Documentation](https://remix.run/docs)
- [BullMQ Guide](https://docs.bullmq.io/)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
- [Shopify App Bridge](https://shopify.dev/docs/api/app-bridge)
- [Polaris Design System](https://polaris.shopify.com/)

---

**Document Version:** 1.1
**Last Updated:** 2025-11-17
**Next Review:** Phase 1 Completion (Target: Q1 2026)

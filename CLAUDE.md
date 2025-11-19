# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Shop-Ops Suite** is a Shopify Admin App that automates backend operations through a "Recipes, Not Rules" approach. The app runs 100% server-side with zero impact on storefront performance, consolidating essential operations (tagging, metafields, data cleaning, bulk operations) into one platform.

**Current Status:** Phase 0 Complete (Foundation), Phase 1 In Progress (MVP)

---

## Development Commands

### Essential Commands

```bash
# Development (most common)
pnpm dev                    # Start Shopify CLI + Remix dev server with HMR
pnpm build                  # Production build
pnpm start                  # Start production server

# Code Quality
pnpm lint                   # ESLint check (cached)
pnpm graphql-codegen        # Generate TypeScript types from GraphQL queries

# Shopify CLI
pnpm deploy                 # Deploy app configuration to Shopify
pnpm generate               # Generate app extensions
pnpm config:link            # Link to Shopify app configuration
pnpm env                    # Show environment variables
```

### Infrastructure Commands

```bash
# Start dependencies (Docker required)
docker-compose up -d mongodb redis

# Check service status
docker-compose ps

# View logs
docker-compose logs -f web
docker-compose logs -f mongodb
docker-compose logs -f redis

# Stop services
docker-compose down
```

---

## Architecture

### Tech Stack Overview

- **Framework:** Remix v2.16.1 (full-stack React with SSR)
- **Database:** MongoDB via Mongoose 8.19.4 (flexible schema for recipes)
- **Session Storage:** Redis via @shopify/shopify-app-session-storage-redis
- **UI:** Shopify Polaris v13.9.5 (native Shopify Admin design system)
- **Build Tool:** Vite 6.2.2 (fast HMR, optimized production builds)
- **API Version:** Shopify Admin API January 2025

### Key Architectural Decisions

1. **MongoDB over Prisma/SQLite:** Chosen for flexible schema to store recipe configurations (if/then conditions, actions, nested objects)

2. **Redis Sessions:** Enables horizontal scaling of web servers (stateless architecture)

3. **Remix SSR:** Fast initial page loads, SEO-friendly, progressive enhancement

4. **GraphQL Only:** REST API disabled (`removeRest: true`) to enforce modern API usage

5. **Multi-Tenant Design:** All data scoped by `shop` field for thousands of merchants

### Core Files and Their Purpose

**app/shopify.server.ts** - Shopify app configuration
- OAuth authentication setup
- Redis session storage configuration
- API version: `ApiVersion.January25`
- Distribution: `AppDistribution.AppStore`
- Exports: `authenticate`, `login`, `sessionStorage`, etc.

**app/mongoose.server.ts** - MongoDB connection management
- Singleton connection pattern (reuses existing connection)
- Connection state tracking (`isConnected` flag)
- Event handlers for errors and disconnections
- Default URL: `mongodb://localhost:27017/app-name`

**app/routes.ts** - Remix flat routes configuration
- File-based routing using `@remix-run/fs-routes`
- Authenticated routes: `app.*`
- Auth routes: `auth.*`
- Webhook routes: `webhooks.*`

### Data Flow Patterns

**1. Webhook Processing (Planned for Phase 1)**
```
Shopify Event → Webhook Handler (app/routes/webhooks.*.tsx)
              → HMAC Validation
              → Enqueue Job (BullMQ)
              → Worker Process
              → Recipe Engine Evaluation
              → Shopify GraphQL Mutation
              → Activity Log (MongoDB)
```

**2. Recipe Execution (Planned for Phase 1)**
```
User Toggles Recipe → Remix Action
                    → Update MongoDB
                    → Register/Unregister Webhooks
                    → Optimistic UI Update
                    → Toast Notification
```

**3. Authentication Flow**
```
User Visits App → OAuth Check (app/shopify.server.ts)
                → Redirect to Shopify OAuth
                → Token Exchange
                → Store Session (Redis)
                → Store Access Token (MongoDB, encrypted)
                → Redirect to App
```

---

## File Organization

### Current Structure (Phase 0 Complete)

```
app/
├── routes/
│   ├── app.tsx                      # Main authenticated layout
│   ├── app._index.tsx               # Dashboard (home page)
│   ├── app.additional.tsx           # Example page
│   ├── auth.login/                  # Login route
│   ├── webhooks.app.uninstalled.tsx # Cleanup on uninstall
│   └── webhooks.app.scopes_update.tsx # Handle scope changes
│
├── shopify.server.ts                # Shopify OAuth & API config
├── mongoose.server.ts               # MongoDB connection singleton
├── root.tsx                         # Root document wrapper
└── entry.server.tsx                 # SSR entry point
```

### Planned Structure (Phase 1+)

```
app/
├── models/                          # Mongoose schemas
│   ├── Recipe.ts                    # Recipe automation rules
│   ├── Setting.ts                   # Shop settings & billing
│   ├── AutomationLog.ts             # Audit trail
│   └── Shop.ts                      # Shop metadata
│
├── services/                        # Business logic
│   ├── recipeEngine.ts              # Evaluate conditions & execute actions
│   ├── tagService.ts                # Tag management (add/remove)
│   ├── metafieldService.ts          # Metafield operations
│   └── webhookProcessor.ts          # Process webhook payloads
│
├── jobs/                            # BullMQ job definitions
│   ├── recipeExecutor.ts            # Execute recipe jobs
│   └── scheduledTasks.ts            # Cron-based recurring jobs
│
└── utils/                           # Shared utilities
    ├── shopifyApi.ts                # GraphQL client wrapper
    └── validators.ts                # Input validation (Zod schemas)
```

---

## Important Patterns & Conventions

### 1. GraphQL Type Generation

**Always regenerate types after modifying GraphQL queries:**
```bash
pnpm graphql-codegen
```

GraphQL queries/mutations in route files are automatically discovered and typed:
```typescript
// app/routes/app._index.tsx
import type { CreateProductMutation } from "~/types/admin.generated";

const response = await admin.graphql(
  `#graphql
    mutation CreateProduct($input: ProductInput!) {
      productCreate(input: $input) {
        product { id title }
      }
    }
  `,
  { variables: { input: { title: "New Product" } } }
);

const data: CreateProductMutation = await response.json();
```

### 2. Remix Route Conventions

**Loader (GET):**
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  // Fetch data
  return json({ data });
}
```

**Action (POST):**
```typescript
export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  // Mutate data
  return json({ success: true });
}
```

**Webhook:**
```typescript
export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop, session, payload } = await authenticate.webhook(request);
  // Process webhook (must respond <500ms)
  return new Response(null, { status: 200 });
}
```

### 3. MongoDB Connection Pattern

**Always use the singleton connection:**
```typescript
import { connectToMongoDB, mongoose } from "~/mongoose.server";

// In a Remix loader/action
export async function loader() {
  await connectToMongoDB(); // Reuses connection if exists
  const Recipe = mongoose.model('Recipe', recipeSchema);
  const recipes = await Recipe.find({ shop, enabled: true });
  return json({ recipes });
}
```

**NEVER create new mongoose connections** - always use the singleton from `mongoose.server.ts`.

### 4. Webhook Registration

**Declare webhooks in `shopify.app.toml` (not in code):**
```toml
[[webhooks.subscriptions]]
topics = ["products/update"]
uri = "/webhooks/products/update"
```

Then create the route file:
```typescript
// app/routes/webhooks.products.update.tsx
export async function action({ request }: ActionFunctionArgs) {
  const { payload } = await authenticate.webhook(request);
  // Enqueue job for processing
  return new Response(null, { status: 200 });
}
```

Deploy to register: `pnpm deploy`

### 5. Polaris Component Usage

**Always use Polaris components for UI:**
```typescript
import { Page, Card, Button, Banner } from "@shopify/polaris";

export default function MyPage() {
  return (
    <Page title="Dashboard">
      <Card>
        <Banner tone="success">Operation successful!</Banner>
        <Button primary>Save Changes</Button>
      </Card>
    </Page>
  );
}
```

**NEVER use generic HTML buttons, inputs, or form elements** - use Polaris equivalents for consistency.

---

## Environment Setup

### Required Environment Variables

```env
# Shopify App Credentials (from Partners dashboard)
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=write_products,write_customers,write_orders,write_draft_orders

# App URL (Shopify CLI provides this automatically in dev)
SHOPIFY_APP_URL=https://your-tunnel-url.ngrok.io

# Database (must be running before starting app)
MONGODB_URL=mongodb://localhost:27017/shopops
REDIS_URL=redis://localhost:6379
```

### Prerequisites

1. **Node.js 18.20+** (or 20.10+, 21+)
2. **pnpm** (package manager)
3. **MongoDB** running (local or cloud)
4. **Redis** running (local or cloud)
5. **Shopify CLI** installed globally
6. **Shopify Partner Account** with development store

---

## Development Workflow

### Starting Development

1. **Start infrastructure:**
   ```bash
   docker-compose up -d mongodb redis
   ```

2. **Start dev server:**
   ```bash
   pnpm dev
   ```
   This runs `shopify app dev` which:
   - Creates secure tunnel (cloudflare or ngrok)
   - Starts Remix dev server with HMR
   - Opens browser to install app in dev store

3. **Access the app:**
   - Embedded in Shopify Admin (recommended)
   - Or standalone: `http://localhost:3000`

### Making Changes

1. **Edit files in `app/`** - HMR updates browser automatically
2. **Add GraphQL queries** - Run `pnpm graphql-codegen` to generate types
3. **Add webhooks** - Update `shopify.app.toml`, then `pnpm deploy`
4. **Lint before commit:** `pnpm lint`

### Common Issues

**"MongoDB connection refused":**
```bash
docker-compose ps mongodb  # Check if running
docker-compose logs mongodb  # Check logs
```

**"Redis connection failed":**
```bash
docker-compose ps redis
docker-compose logs redis
```

**"Webhook HMAC validation failed":**
- Webhooks must be declared in `shopify.app.toml`
- Deploy changes: `pnpm deploy`
- Test: `shopify app webhook trigger`

**"OAuth loop after scope changes":**
```bash
pnpm deploy  # Update scopes with Shopify
# Then uninstall/reinstall app in dev store
```

**"GraphQL types not updating":**
```bash
pnpm graphql-codegen  # Regenerate types
pnpm dev  # Restart dev server
```

---

## Key Constraints & Rules

### 1. Server-Side Only (Zero Storefront Impact)

**NEVER:**
- Add frontend JavaScript to storefront
- Modify theme files
- Inject scripts via ScriptTag API

**ALWAYS:**
- Process everything server-side
- Use GraphQL Admin API only
- Run operations in background jobs (BullMQ - planned)

### 2. Multi-Tenant Data Scoping

**ALWAYS scope queries by shop:**
```typescript
// ✅ CORRECT
const recipes = await Recipe.find({ shop: session.shop, enabled: true });

// ❌ WRONG - will return data from all shops
const recipes = await Recipe.find({ enabled: true });
```

**Shop field is mandatory** in all MongoDB schemas.

### 3. Authentication Required

**All routes under `app.*` require authentication:**
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  // session.shop is the authenticated shop domain
}
```

**Webhook routes use webhook authentication:**
```typescript
export async function action({ request }: ActionFunctionArgs) {
  const { shop, payload } = await authenticate.webhook(request);
  // shop is from validated HMAC signature
}
```

### 4. Shopify API Best Practices

**Use GraphQL (not REST):**
```typescript
// ✅ CORRECT
const response = await admin.graphql(`
  query { products(first: 10) { edges { node { id title } } } }
`);

// ❌ WRONG - REST API is disabled
const response = await admin.rest.get({ path: 'products' });
```

**Handle rate limits:**
- GraphQL: 50 cost points per second (bucket leak algorithm)
- Implement retry logic with exponential backoff (planned)
- Use Bulk Operations API for large datasets (planned)

**Validate webhook HMAC:**
- Automatic via `authenticate.webhook(request)`
- NEVER process webhooks without validation

---

## Documentation References

### Internal Documentation
- **[PRD](docs/PRD.md)** - Product requirements and vision (103 pages)
- **[Architecture](docs/ARCHITECTURE.md)** - Technical design (147 pages)
- **[UI/UX Design](docs/UI_UX_DESIGN.md)** - Interface specs (93 pages)
- **[README](README.md)** - Setup and quick start
- **[CHANGELOG](CHANGELOG.md)** - Version history

### External Resources
- **Shopify App Remix:** https://shopify.dev/docs/api/shopify-app-remix
- **Shopify Admin API:** https://shopify.dev/docs/api/admin-graphql
- **Polaris Components:** https://polaris.shopify.com/components
- **Remix Docs:** https://remix.run/docs
- **Mongoose Docs:** https://mongoosejs.com/docs/guide.html

---

## Phase 1 Development Priorities

**Next tasks to implement (see PRD for details):**

1. **Define Mongoose Schemas** (`app/models/`)
   - Recipe.ts - Store automation rules with conditions/actions
   - Setting.ts - Shop configuration and billing
   - AutomationLog.ts - Audit trail with TTL indexes
   - Shop.ts - Shop metadata

2. **Implement BullMQ Job Queue** (`app/jobs/`)
   - Setup Redis job queue
   - Create worker processes
   - Define job types (recipe-execution, webhook-processing, scheduled-tasks)

3. **Build Recipe Execution Engine** (`app/services/recipeEngine.ts`)
   - Evaluate if/then conditions
   - Execute actions (addTag, removeTag, setMetafield)
   - Log to AutomationLog

4. **Create Recipe Toggle UI** (`app/routes/app.recipes.tsx`)
   - Recipe library grid (Polaris Cards)
   - Toggle switches (On/Off)
   - Preview affected items
   - Filter by category

5. **Add Product/Customer/Order Webhooks**
   - Update `shopify.app.toml`
   - Create webhook route handlers
   - Enqueue jobs for processing

**Success Criteria:**
- 10 recipes functional (3 customer, 3 order, 4 product)
- Activity Log showing all actions
- Dashboard with stats
- Free plan only (no billing yet)

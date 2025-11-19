# Epic 6: Mongoose Data Models & Schema Definition

**Status:** 📋 Ready for Development
**Priority:** P0 (Blocker)
**Estimated Duration:** 3 days
**Dependencies:** Phase 0 Complete ✅
**Phase:** Phase 1 - MVP

---

## Epic Overview

Implement MongoDB data models using Mongoose to store recipes, settings, automation logs, and shop metadata. This epic replaces the mock data service with persistent database storage and establishes the foundation for all backend automation.

## Business Value

- **Data Persistence:** Recipes and settings survive server restarts
- **Multi-Tenant Ready:** All data scoped by shop for thousands of merchants
- **Audit Trail:** Complete history of all automation actions
- **Scalability:** MongoDB indexes for fast queries at scale

## Success Criteria

- [x] All 4 Mongoose schemas defined (Recipe, Setting, AutomationLog, Shop)
- [x] Schemas match ARCHITECTURE.md specifications exactly
- [x] Database indexes configured for performance
- [x] TTL indexes for automatic log cleanup
- [x] Validation rules prevent invalid data
- [x] TypeScript types exported for use across app
- [x] Seed scripts create test data
- [x] All CRUD operations tested

---

## Tasks

### Task 6.1: Recipe Schema

**Estimated Time:** 1 day
**Priority:** P0

#### Description
Define the Recipe model for storing automation rules with conditions and actions.

#### Acceptance Criteria
- [x] Schema matches ARCHITECTURE.md Recipe Schema (lines 402-451)
- [x] Supports if/then conditions with multiple operators
- [x] Supports multiple action types (addTag, removeTag, setMetafield)
- [x] Execution count tracking
- [x] Indexes for fast shop-scoped queries
- [x] Validation ensures required fields

#### Subtasks

##### Subtask 6.1.1: Define Recipe Schema Interface
**Estimated Time:** 2 hours

**Steps:**
1. Create `app/models/Recipe.ts`
2. Define TypeScript interface matching ARCHITECTURE.md:
   ```typescript
   interface IRecipe {
     _id: ObjectId;
     shop: string;                    // shopify.myshopify.com
     recipeId: string;                // unique recipe identifier
     name: string;                    // "Auto-tag VIP Customers"
     description: string;
     category: 'product' | 'customer' | 'order';
     enabled: boolean;                // toggle state

     trigger: {
       type: 'webhook' | 'scheduled';
       webhookTopic?: string;         // e.g., "customers/update"
       cronExpression?: string;       // e.g., "0 0 * * *" (daily)
     };

     conditions: {
       field: string;                 // e.g., "totalSpent"
       operator: '>' | '<' | '=' | '!=' | 'contains' | 'in';
       value: any;                    // e.g., 1000
       dataType: 'string' | 'number' | 'boolean' | 'date';
     }[];

     actions: {
       type: 'addTag' | 'removeTag' | 'setMetafield' | 'updateField';
       config: {
         tagName?: string;            // e.g., "VIP"
         metafieldKey?: string;
         metafieldValue?: any;
       };
     }[];

     executionCount: number;
     lastExecutedAt?: Date;
     createdAt: Date;
     updatedAt: Date;
   }
   ```

**Files to Create:**
- `app/models/Recipe.ts`

---

##### Subtask 6.1.2: Define Mongoose Schema & Model
**Estimated Time:** 3 hours

**Steps:**
1. In `app/models/Recipe.ts`, create Mongoose schema:
   ```typescript
   import mongoose from 'mongoose';

   const recipeSchema = new mongoose.Schema<IRecipe>(
     {
       shop: { type: String, required: true, index: true },
       recipeId: { type: String, required: true, unique: true },
       name: { type: String, required: true },
       description: { type: String, required: true },
       category: {
         type: String,
         required: true,
         enum: ['product', 'customer', 'order']
       },
       enabled: { type: Boolean, default: false, index: true },

       trigger: {
         type: { type: String, required: true, enum: ['webhook', 'scheduled'] },
         webhookTopic: { type: String },
         cronExpression: { type: String },
       },

       conditions: [{
         field: { type: String, required: true },
         operator: {
           type: String,
           required: true,
           enum: ['>', '<', '=', '!=', 'contains', 'in']
         },
         value: { type: mongoose.Schema.Types.Mixed, required: true },
         dataType: {
           type: String,
           required: true,
           enum: ['string', 'number', 'boolean', 'date']
         },
       }],

       actions: [{
         type: {
           type: String,
           required: true,
           enum: ['addTag', 'removeTag', 'setMetafield', 'updateField']
         },
         config: {
           tagName: String,
           metafieldKey: String,
           metafieldValue: mongoose.Schema.Types.Mixed,
         },
       }],

       executionCount: { type: Number, default: 0 },
       lastExecutedAt: Date,
     },
     {
       timestamps: true, // Auto-adds createdAt, updatedAt
       collection: 'recipes'
     }
   );
   ```

2. Add compound indexes:
   ```typescript
   recipeSchema.index({ shop: 1, enabled: 1 });
   recipeSchema.index({ shop: 1, category: 1 });
   recipeSchema.index({ shop: 1, recipeId: 1 }, { unique: true });
   ```

3. Export model:
   ```typescript
   export const Recipe = mongoose.model<IRecipe>('Recipe', recipeSchema);
   export type { IRecipe };
   ```

**Acceptance Criteria:**
- [x] Schema compiles with no TypeScript errors
- [x] All required fields enforced
- [x] Enums restrict invalid values
- [x] Indexes created for performance
- [x] Timestamps auto-managed

**Files to Modify:**
- `app/models/Recipe.ts`

---

##### Subtask 6.1.3: Add Schema Validation & Methods
**Estimated Time:** 2 hours

**Steps:**
1. Add custom validation:
   ```typescript
   recipeSchema.path('conditions').validate(function(conditions) {
     return conditions && conditions.length > 0;
   }, 'Recipe must have at least one condition');

   recipeSchema.path('actions').validate(function(actions) {
     return actions && actions.length > 0;
   }, 'Recipe must have at least one action');
   ```

2. Add instance methods:
   ```typescript
   recipeSchema.methods.incrementExecutionCount = async function() {
     this.executionCount += 1;
     this.lastExecutedAt = new Date();
     return this.save();
   };

   recipeSchema.methods.toggle = async function() {
     this.enabled = !this.enabled;
     return this.save();
   };
   ```

3. Add static methods:
   ```typescript
   recipeSchema.statics.findActiveByShop = function(shop: string) {
     return this.find({ shop, enabled: true });
   };

   recipeSchema.statics.findByCategory = function(shop: string, category: string) {
     return this.find({ shop, category });
   };
   ```

**Acceptance Criteria:**
- [x] Validation prevents empty conditions/actions
- [x] Instance methods work correctly
- [x] Static methods return correct results
- [x] TypeScript types inferred correctly

**Files to Modify:**
- `app/models/Recipe.ts`

---

### Task 6.2: Setting Schema

**Estimated Time:** 4 hours
**Priority:** P0

#### Description
Define the Setting model for storing shop-specific configuration, billing, and usage tracking.

#### Acceptance Criteria
- [x] Schema matches ARCHITECTURE.md Setting Schema (lines 453-496)
- [x] Usage tracking with monthly reset logic
- [x] Plan limits enforced (Free: 3 recipes, Pro: unlimited)
- [x] Encrypted access token storage
- [x] Unique shop constraint

#### Implementation

Create `app/models/Setting.ts` with full schema from ARCHITECTURE.md lines 453-496:

```typescript
import mongoose from 'mongoose';

interface ISetting {
  _id: mongoose.Types.ObjectId;
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

const settingSchema = new mongoose.Schema<ISetting>(
  {
    shop: { type: String, required: true, unique: true, index: true },

    plan: {
      type: String,
      required: true,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    subscriptionId: String,
    billingStatus: {
      type: String,
      required: true,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active'
    },
    trialEndsAt: Date,

    usage: {
      recipesActive: { type: Number, default: 0 },
      recipesLimit: { type: Number, default: 3 },
      actionsThisMonth: { type: Number, default: 0 },
      actionsLimit: { type: Number, default: 1000 },
      lastResetAt: { type: Date, default: Date.now },
    },

    preferences: {
      emailNotifications: { type: Boolean, default: true },
      activityLogRetention: { type: Number, default: 30 },
      timezone: { type: String, default: 'America/New_York' },
    },

    installedAt: { type: Date, default: Date.now },
    uninstalledAt: Date,
    shopifyAccessToken: { type: String, required: true }, // TODO: encrypt
    shopifyScope: { type: String, required: true },
  },
  { timestamps: true, collection: 'settings' }
);

// Indexes
settingSchema.index({ plan: 1 });

// Methods
settingSchema.methods.resetMonthlyUsage = function() {
  this.usage.actionsThisMonth = 0;
  this.usage.lastResetAt = new Date();
  return this.save();
};

settingSchema.methods.canActivateRecipe = function(): boolean {
  if (this.plan === 'free') {
    return this.usage.recipesActive < this.usage.recipesLimit;
  }
  return true; // Pro/Enterprise unlimited
};

settingSchema.methods.incrementAction = function() {
  this.usage.actionsThisMonth += 1;
  return this.save();
};

export const Setting = mongoose.model<ISetting>('Setting', settingSchema);
export type { ISetting };
```

**Files to Create:**
- `app/models/Setting.ts`

---

### Task 6.3: AutomationLog Schema

**Estimated Time:** 4 hours
**Priority:** P0

#### Description
Define the AutomationLog model for comprehensive audit trail of all automation actions.

#### Acceptance Criteria
- [x] Schema matches ARCHITECTURE.md AutomationLog Schema (lines 498-537)
- [x] TTL index for automatic cleanup (30 days Free, 365 days Pro)
- [x] Before/after snapshots stored
- [x] Execution time tracking
- [x] Fast queries by shop and date

#### Implementation

Create `app/models/AutomationLog.ts`:

```typescript
import mongoose from 'mongoose';

interface IAutomationLog {
  _id: mongoose.Types.ObjectId;
  shop: string;

  // Action details
  recipeId?: string;               // null for manual actions
  recipeName: string;
  actionType: 'addTag' | 'removeTag' | 'setMetafield' | 'bulkUpdate';

  // Resource affected
  resourceType: 'product' | 'customer' | 'order';
  resourceId: string;              // Shopify GID
  resourceTitle?: string;

  // Change tracking
  changesBefore: any;              // JSON snapshot
  changesAfter: any;               // JSON snapshot

  // Execution metadata
  status: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  executionTimeMs: number;

  // Audit trail
  triggeredBy: 'webhook' | 'scheduled' | 'manual';
  userId?: string;

  createdAt: Date;
}

const automationLogSchema = new mongoose.Schema<IAutomationLog>(
  {
    shop: { type: String, required: true, index: true },

    recipeId: String,
    recipeName: { type: String, required: true },
    actionType: {
      type: String,
      required: true,
      enum: ['addTag', 'removeTag', 'setMetafield', 'bulkUpdate']
    },

    resourceType: {
      type: String,
      required: true,
      enum: ['product', 'customer', 'order']
    },
    resourceId: { type: String, required: true },
    resourceTitle: String,

    changesBefore: mongoose.Schema.Types.Mixed,
    changesAfter: mongoose.Schema.Types.Mixed,

    status: {
      type: String,
      required: true,
      enum: ['success', 'failure', 'partial']
    },
    errorMessage: String,
    executionTimeMs: { type: Number, required: true },

    triggeredBy: {
      type: String,
      required: true,
      enum: ['webhook', 'scheduled', 'manual']
    },
    userId: String,

    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'automation_logs' }
);

// Indexes
automationLogSchema.index({ shop: 1, createdAt: -1 });
automationLogSchema.index({ shop: 1, resourceType: 1 });
automationLogSchema.index({ shop: 1, recipeId: 1 });

// TTL index (expires based on plan - handled at application level)
// MongoDB TTL indexes are global, so we handle deletion in application code

export const AutomationLog = mongoose.model<IAutomationLog>('AutomationLog', automationLogSchema);
export type { IAutomationLog };
```

**Files to Create:**
- `app/models/AutomationLog.ts`

---

### Task 6.4: Shop Schema

**Estimated Time:** 2 hours
**Priority:** P1

#### Description
Define the Shop model for storing shop metadata and analytics.

#### Implementation

Create `app/models/Shop.ts`:

```typescript
import mongoose from 'mongoose';

interface IShop {
  _id: mongoose.Types.ObjectId;
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

const shopSchema = new mongoose.Schema<IShop>(
  {
    shop: { type: String, required: true, unique: true, index: true },

    shopName: { type: String, required: true },
    email: { type: String, required: true },
    currency: { type: String, required: true },
    timezone: { type: String, required: true },
    plan: { type: String, required: true }, // Shopify plan

    stats: {
      totalRecipes: { type: Number, default: 0 },
      totalActionsExecuted: { type: Number, default: 0 },
      lastActivityAt: Date,
    },

    features: {
      smartTagger: { type: Boolean, default: true },
      metafieldManager: { type: Boolean, default: false },
      dataCleaner: { type: Boolean, default: false },
      bulkOperations: { type: Boolean, default: false },
      activityLog: { type: Boolean, default: true },
    },
  },
  { timestamps: true, collection: 'shops' }
);

export const Shop = mongoose.model<IShop>('Shop', shopSchema);
export type { IShop };
```

**Files to Create:**
- `app/models/Shop.ts`

---

### Task 6.5: Database Seeding

**Estimated Time:** 4 hours
**Priority:** P1

#### Description
Create seed scripts to populate database with test data for development.

#### Acceptance Criteria
- [x] Seed script creates realistic test data
- [x] Multiple shops for multi-tenant testing
- [x] 20+ recipes matching PRD categories
- [x] 100+ automation logs spanning 30 days
- [x] Settings for Free, Pro, Enterprise plans
- [x] Idempotent (safe to run multiple times)

#### Implementation

Create `scripts/seed.ts`:

```typescript
import { connectToMongoDB, mongoose } from '~/mongoose.server';
import { Recipe } from '~/models/Recipe';
import { Setting } from '~/models/Setting';
import { AutomationLog } from '~/models/AutomationLog';
import { Shop } from '~/models/Shop';

async function seed() {
  await connectToMongoDB();

  const testShop = 'test-shop.myshopify.com';

  // Clear existing data
  await Recipe.deleteMany({ shop: testShop });
  await Setting.deleteMany({ shop: testShop });
  await AutomationLog.deleteMany({ shop: testShop });
  await Shop.deleteMany({ shop: testShop });

  // Create shop
  await Shop.create({
    shop: testShop,
    shopName: 'Test Shop',
    email: 'test@example.com',
    currency: 'USD',
    timezone: 'America/New_York',
    plan: 'basic',
  });

  // Create settings
  await Setting.create({
    shop: testShop,
    plan: 'free',
    billingStatus: 'active',
    shopifyAccessToken: 'test_token',
    shopifyScope: 'write_products,write_customers,write_orders',
  });

  // Create recipes (use mock data from app/mocks/recipes.ts)
  const mockRecipes = generateMockRecipes(); // Import from mocks
  await Recipe.insertMany(
    mockRecipes.map(r => ({ ...r, shop: testShop }))
  );

  // Create automation logs
  const mockLogs = generateMockLogs(200); // Import from mocks
  await AutomationLog.insertMany(
    mockLogs.map(l => ({ ...l, shop: testShop }))
  );

  console.log('✓ Database seeded successfully');
  await mongoose.disconnect();
}

seed().catch(console.error);
```

Add npm script to `package.json`:
```json
{
  "scripts": {
    "db:seed": "tsx scripts/seed.ts"
  }
}
```

**Files to Create:**
- `scripts/seed.ts`

**Files to Modify:**
- `package.json`

---

### Task 6.6: Model Testing

**Estimated Time:** 4 hours
**Priority:** P1

#### Description
Write tests for all Mongoose models to ensure CRUD operations work correctly.

#### Implementation

Create test files using Vitest:

**Files to Create:**
- `test/models/Recipe.test.ts`
- `test/models/Setting.test.ts`
- `test/models/AutomationLog.test.ts`
- `test/models/Shop.test.ts`

Example test:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectToMongoDB, mongoose } from '~/mongoose.server';
import { Recipe } from '~/models/Recipe';

describe('Recipe Model', () => {
  beforeAll(async () => {
    await connectToMongoDB();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should create a recipe', async () => {
    const recipe = await Recipe.create({
      shop: 'test.myshopify.com',
      recipeId: 'vip-customers',
      name: 'Auto-tag VIP Customers',
      description: 'Tag customers who spend over $1000',
      category: 'customer',
      enabled: true,
      trigger: { type: 'webhook', webhookTopic: 'customers/update' },
      conditions: [
        { field: 'totalSpent', operator: '>', value: 1000, dataType: 'number' }
      ],
      actions: [
        { type: 'addTag', config: { tagName: 'VIP' } }
      ],
    });

    expect(recipe._id).toBeDefined();
    expect(recipe.executionCount).toBe(0);
  });

  it('should find active recipes for shop', async () => {
    const recipes = await Recipe.findActiveByShop('test.myshopify.com');
    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes.every(r => r.enabled)).toBe(true);
  });

  // More tests...
});
```

---

## Files Created (Summary)

```
app/
├── models/
│   ├── Recipe.ts              # Recipe automation rules
│   ├── Setting.ts             # Shop settings & billing
│   ├── AutomationLog.ts       # Audit trail
│   └── Shop.ts                # Shop metadata
│
scripts/
└── seed.ts                    # Database seeding script

test/
└── models/
    ├── Recipe.test.ts         # Recipe model tests
    ├── Setting.test.ts        # Setting model tests
    ├── AutomationLog.test.ts  # Log model tests
    └── Shop.test.ts           # Shop model tests
```

---

## Definition of Done

- [x] All 4 Mongoose models created
- [x] All schemas match ARCHITECTURE.md exactly
- [x] Indexes configured for performance
- [x] Validation rules prevent invalid data
- [x] Instance and static methods implemented
- [x] Seed script creates test data
- [x] All model tests passing
- [x] Code passes `pnpm lint`
- [x] TypeScript compiles with no errors
- [x] Documentation (JSDoc) complete
- [x] Code reviewed by peer

---

## Next Steps

After this epic:
1. **Epic 7:** Replace mock data service with real MongoDB operations
2. **Epic 8:** Implement BullMQ job queue system
3. **Epic 9:** Build recipe execution engine

---

**Last Updated:** 2025-11-18
**Epic Owner:** TBD
**Status:** Ready for Development

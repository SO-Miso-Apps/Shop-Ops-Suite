# Epic 1-006: Mongoose Data Models & MongoDB Integration

**Status:** 🔵 Planned
**Phase:** Phase 1 - MVP
**Priority:** P0 - Critical Path
**Estimated Complexity:** Large (5-8 days)
**Dependencies:** Phase 0 Complete (MongoDB connection established)
**Blocks:** Epic 1-007 (Recipe Engine), Epic 1-008 (BullMQ Job Queue), Epic 1-009 (Webhook Handlers)

---

## 1. Understanding (Objective, Scope, and Context)

### Objective
Create production-ready Mongoose data models that serve as the foundation for Shop-Ops Suite's backend architecture. These models will enable multi-tenant data storage, recipe automation configuration, activity logging, and shop-level settings management.

### Scope

**In Scope:**
- Create 4 core Mongoose schemas: `Recipe`, `Setting`, `AutomationLog`, `Shop`
- Implement TypeScript interfaces for type safety
- Define MongoDB indexes for query performance
- Add TTL (Time To Live) indexes for automatic log cleanup
- Implement validation rules and default values
- Add compound indexes for multi-tenant data scoping
- Create model utility methods (static and instance methods)
- Write comprehensive JSDoc documentation
- Set up model exports in central index file

**Out of Scope:**
- Service layer implementation (deferred to Epic 1-007)
- BullMQ job queue integration (deferred to Epic 1-008)
- Webhook handlers (deferred to Epic 1-009)
- API routes for CRUD operations (deferred to Epic 1-010)
- Data migration scripts (not needed for new app)
- Frontend UI changes (existing mock data service remains)

### Context

**Current State:**
- MongoDB connection singleton exists in `app/mongoose.server.ts`
- Docker Compose configured with MongoDB service
- Mock data service exists in `app/services/data/mockDataService.ts` for frontend development
- UI components consume mock data via `app/mocks/*.ts` files
- NO production data models implemented yet

**Target State:**
- Production-ready Mongoose models in `app/models/` directory
- All models follow multi-tenant pattern (scoped by `shop` field)
- Type-safe interfaces exported for use across codebase
- Optimized indexes for common query patterns
- Models ready for integration with service layer and job queue

**Why This Matters:**
- **Blocks all backend work:** Recipe engine, job queue, webhook handlers all depend on data models
- **Data integrity:** Mongoose validation prevents corrupt data from entering MongoDB
- **Performance:** Proper indexes critical for multi-tenant queries at scale
- **Type safety:** TypeScript interfaces catch errors at compile time
- **Foundation for MVP:** Cannot deliver Phase 1 without persistent data storage

---

## 2. Planning (Architecture, Design Decisions, and Strategy)

### Architecture Alignment

This epic implements the "Data Models" section from `docs/ARCHITECTURE.md` (lines 399-577). All schemas follow the exact specifications defined in the architecture document.

**Key Architectural Patterns:**

1. **Multi-Tenant Data Scoping**
   - Every model includes mandatory `shop` field (String, required, indexed)
   - Compound indexes always include `shop` as first field
   - Example: `{ shop: 1, enabled: 1, category: 1 }`

2. **Schema Design Philosophy**
   - Embedded documents for nested structures (recipe conditions/actions)
   - Avoid references for data that changes together
   - Use lean() for read-heavy operations
   - Denormalize where appropriate for query performance

3. **Validation Strategy**
   - Mongoose built-in validators (required, enum, min, max)
   - Custom validators for complex business rules
   - TypeScript interfaces for compile-time checks
   - Double validation: schema + service layer (defense in depth)

4. **Index Strategy**
   - Compound indexes for common query patterns
   - TTL index on AutomationLog (90-day retention)
   - Unique indexes where appropriate (shop + key combinations)
   - Support both equality and range queries

### Data Model Specifications

#### 2.1 Recipe Model

**Purpose:** Store automation rule configurations (if/then logic)

**Schema Structure:**
```typescript
interface IRecipe {
  // Identity
  shop: string;                    // Shopify shop domain (multi-tenant key)

  // Metadata
  title: string;                   // Display name (e.g., "Tag VIP Customers")
  description: string;             // User-facing description
  category: 'customer' | 'order' | 'product' | 'inventory';
  enabled: boolean;                // Active/inactive toggle

  // Recipe Logic
  trigger: {
    event: string;                 // Webhook topic (e.g., "customers/update")
    resource: string;              // Resource type (e.g., "customer")
  };

  conditions: Array<{
    field: string;                 // JSONPath to check (e.g., "total_spent")
    operator: '>' | '<' | '=' | '!=' | 'contains' | 'starts_with' | 'in';
    value: any;                    // Comparison value
    logicalOperator?: 'AND' | 'OR'; // How to combine with next condition
  }>;

  actions: Array<{
    type: 'addTag' | 'removeTag' | 'setMetafield' | 'removeMetafield';
    params: {
      tag?: string;                // For tag actions
      namespace?: string;          // For metafield actions
      key?: string;
      value?: string;
      valueType?: 'string' | 'integer' | 'json';
    };
  }>;

  // Statistics
  stats: {
    executionCount: number;        // Total times recipe has run
    lastExecutedAt?: Date;         // Most recent execution
    successCount: number;          // Successful executions
    errorCount: number;            // Failed executions
  };

  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```javascript
{ shop: 1, enabled: 1, category: 1 }           // Recipe library queries
{ shop: 1, 'trigger.event': 1, enabled: 1 }   // Webhook routing
{ shop: 1, updatedAt: -1 }                     // Recent recipes
```

**Validation Rules:**
- `title`: required, 3-100 characters
- `category`: required, enum
- `trigger.event`: required, matches Shopify webhook topic format
- `conditions`: non-empty array for enabled recipes
- `actions`: non-empty array for enabled recipes

#### 2.2 Setting Model

**Purpose:** Store shop-level configuration and billing status

**Schema Structure:**
```typescript
interface ISetting {
  // Identity
  shop: string;                    // Shopify shop domain (unique)

  // Billing
  plan: 'free' | 'pro' | 'enterprise';
  billingStatus: 'active' | 'cancelled' | 'trial';
  trialEndsAt?: Date;              // For trial plans
  subscriptionId?: string;         // Shopify recurring charge ID

  // Access Control
  accessToken: string;             // Encrypted Shopify access token
  scopes: string[];                // Granted OAuth scopes

  // Feature Flags
  features: {
    maxRecipes: number;            // Plan-based limit
    advancedConditions: boolean;   // Pro feature
    scheduledRecipes: boolean;     // Enterprise feature
    customWebhooks: boolean;       // Enterprise feature
  };

  // Preferences
  preferences: {
    emailNotifications: boolean;
    activityLogRetention: number;  // Days (default 90)
    timezone: string;              // IANA timezone
  };

  // Shop Metadata
  shopMetadata: {
    shopName: string;
    shopOwner: string;
    email: string;
    domain: string;
    currency: string;
    timezone: string;
  };

  // Audit
  installedAt: Date;
  uninstalledAt?: Date;            // For cleanup tracking
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```javascript
{ shop: 1 }                        // Unique index (one setting per shop)
{ billingStatus: 1, trialEndsAt: 1 } // Find expiring trials
{ plan: 1 }                        // Plan-based queries
```

**Validation Rules:**
- `shop`: required, unique, matches Shopify domain format
- `plan`: required, enum
- `accessToken`: required, encrypted before storage
- `features.maxRecipes`: min 10, max 1000

#### 2.3 AutomationLog Model

**Purpose:** Audit trail for all recipe executions and system actions

**Schema Structure:**
```typescript
interface IAutomationLog {
  // Identity
  shop: string;                    // Shopify shop domain

  // Log Entry
  logType: 'recipe_execution' | 'webhook_received' | 'error' | 'system';
  severity: 'info' | 'warning' | 'error';

  // Recipe Context
  recipeId?: mongoose.Types.ObjectId; // Reference to Recipe
  recipeTitle?: string;            // Denormalized for deleted recipes

  // Resource Context
  resourceType?: 'customer' | 'order' | 'product' | 'inventory';
  resourceId?: string;             // Shopify GID or ID
  resourceTitle?: string;          // Denormalized display name

  // Action Details
  action?: {
    type: string;                  // Action performed
    params: Record<string, any>;   // Action parameters
    result: 'success' | 'failure' | 'skipped';
    errorMessage?: string;
  };

  // Metadata
  message: string;                 // Human-readable log message
  metadata?: Record<string, any>;  // Additional context (JSON)

  // Performance
  duration?: number;               // Execution time in ms

  // Timestamps
  createdAt: Date;                 // Auto-expires after 90 days (TTL)
}
```

**Indexes:**
```javascript
{ shop: 1, createdAt: -1 }              // Activity log pagination
{ shop: 1, recipeId: 1, createdAt: -1 } // Recipe-specific logs
{ shop: 1, resourceId: 1 }              // Resource-specific logs
{ shop: 1, logType: 1, severity: 1 }    // Filtering
{ createdAt: 1 }                        // TTL index (expireAfterSeconds: 7776000)
```

**Validation Rules:**
- `logType`: required, enum
- `severity`: required, enum
- `message`: required, max 500 characters
- TTL: automatically delete after 90 days

#### 2.4 Shop Model

**Purpose:** Store shop metadata and webhook registration state

**Schema Structure:**
```typescript
interface IShop {
  // Identity
  shop: string;                    // Shopify shop domain (unique)

  // Shopify Data
  shopifyShopId: string;           // Shopify shop GID
  name: string;
  email: string;
  domain: string;
  currency: string;
  timezone: string;

  // Webhook Management
  webhooks: Array<{
    topic: string;                 // e.g., "customers/update"
    webhookId: string;             // Shopify webhook ID
    registeredAt: Date;
    status: 'active' | 'inactive' | 'failed';
  }>;

  // App State
  appStatus: 'installed' | 'uninstalled' | 'suspended';

  // Audit
  installedAt: Date;
  uninstalledAt?: Date;
  lastSeenAt: Date;                // Last API request
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
```javascript
{ shop: 1 }                        // Unique index
{ shopifyShopId: 1 }               // Lookup by Shopify GID
{ appStatus: 1, lastSeenAt: -1 }   // Find inactive shops
```

**Validation Rules:**
- `shop`: required, unique
- `shopifyShopId`: required, matches Shopify GID format
- `webhooks.topic`: matches Shopify webhook topic format

### Design Decisions

**Decision 1: Embedded vs Referenced Documents**
- **Choice:** Embed conditions/actions in Recipe model (not separate collections)
- **Rationale:**
  - Conditions and actions have no meaning outside their parent recipe
  - Always queried together with recipe
  - Simplifies ACID transactions
  - Better performance (single query instead of joins)
- **Trade-off:** Larger documents, but recipe configs are small (<10KB typically)

**Decision 2: Denormalization in AutomationLog**
- **Choice:** Store `recipeTitle` and `resourceTitle` as strings (denormalized)
- **Rationale:**
  - Logs must remain readable even if recipe/resource is deleted
  - Logs are write-heavy, read-light (no joins needed)
  - Historical accuracy preserved
- **Trade-off:** Data duplication, but logs are immutable and expire after 90 days

**Decision 3: TTL Index on AutomationLog**
- **Choice:** Automatic deletion after 90 days via MongoDB TTL index
- **Rationale:**
  - Prevents unbounded growth of log collection
  - Complies with data retention policies
  - No cron job needed (MongoDB handles cleanup)
  - User-configurable via Setting.preferences.activityLogRetention
- **Trade-off:** Cannot recover logs after expiration, but 90 days sufficient for debugging

**Decision 4: Encrypted Access Token Storage**
- **Choice:** Encrypt `Setting.accessToken` before saving to MongoDB
- **Rationale:**
  - Security best practice (defense in depth)
  - Protects against database compromise
  - Required for App Store approval
- **Trade-off:** Slight performance overhead, but only encrypted once at install

**Decision 5: Statistics in Recipe Model**
- **Choice:** Store execution counts directly in Recipe document
- **Rationale:**
  - Fast dashboard queries (no aggregation needed)
  - Acceptable staleness (stats updated async)
  - Simplifies UI rendering
- **Trade-off:** Potential race conditions, mitigated by atomic updates ($inc operator)

### Implementation Strategy

**Phase 1: Model Creation (Tasks 3.1.x)**
1. Create base TypeScript interfaces
2. Define Mongoose schemas
3. Add validation rules
4. Define indexes
5. Add static/instance methods
6. Export models

**Phase 2: Integration (Tasks 3.2.x)**
1. Update mongoose.server.ts to preload models
2. Create central model export file
3. Update TypeScript paths for imports

**Phase 3: Testing (Tasks 3.3.x)**
1. Write unit tests for validation
2. Write integration tests for queries
3. Test index performance
4. Test TTL index functionality

**Phase 4: Documentation (Tasks 3.4.x)**
1. Add JSDoc comments to all schemas
2. Document validation rules
3. Create schema diagrams
4. Update ARCHITECTURE.md with actual implementation

---

## 3. Breakdown (Detailed Task List with Acceptance Criteria)

### 3.1 Recipe Model Implementation

#### Task 3.1.1: Create Recipe TypeScript Interface
**File:** `app/models/Recipe.ts`

**Description:**
Define TypeScript interface `IRecipe` with all fields from ARCHITECTURE.md specification. Include nested types for trigger, conditions, actions, and stats objects.

**Acceptance Criteria:**
- [ ] Interface `IRecipe` exported from file
- [ ] All fields typed correctly (primitives, nested objects, arrays)
- [ ] Nested interfaces defined: `IRecipeTrigger`, `IRecipeCondition`, `IRecipeAction`, `IRecipeStats`
- [ ] JSDoc comments on all interfaces
- [ ] Enum types for `category`, `operator`, `action.type`

**Implementation Details:**
```typescript
// Required enums
export enum RecipeCategory {
  CUSTOMER = 'customer',
  ORDER = 'order',
  PRODUCT = 'product',
  INVENTORY = 'inventory'
}

export enum ConditionOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  EQUALS = '=',
  NOT_EQUALS = '!=',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  IN = 'in'
}

export enum ActionType {
  ADD_TAG = 'addTag',
  REMOVE_TAG = 'removeTag',
  SET_METAFIELD = 'setMetafield',
  REMOVE_METAFIELD = 'removeMetafield'
}
```

**Definition of Done:**
- TypeScript compiles without errors
- All enum values match ARCHITECTURE.md specification
- Interfaces can be imported in other files
- No `any` types (strict typing)

---

#### Task 3.1.2: Create Recipe Mongoose Schema
**File:** `app/models/Recipe.ts`

**Description:**
Define Mongoose schema for Recipe model with all fields, validation rules, and default values.

**Acceptance Criteria:**
- [ ] Schema defined with correct field types
- [ ] Required fields marked as required
- [ ] Enums defined for category, operator, action.type
- [ ] Default values set (enabled: false, stats initialized to 0)
- [ ] Timestamps enabled (createdAt, updatedAt)
- [ ] Schema compiles and can create model

**Implementation Details:**
```typescript
const RecipeConditionSchema = new Schema({
  field: { type: String, required: true },
  operator: {
    type: String,
    required: true,
    enum: Object.values(ConditionOperator)
  },
  value: { type: Schema.Types.Mixed, required: true },
  logicalOperator: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  }
}, { _id: false });

const RecipeActionSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: Object.values(ActionType)
  },
  params: {
    tag: String,
    namespace: String,
    key: String,
    value: String,
    valueType: {
      type: String,
      enum: ['string', 'integer', 'json']
    }
  }
}, { _id: false });

const RecipeSchema = new Schema<IRecipe>({
  shop: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    enum: Object.values(RecipeCategory)
  },
  enabled: {
    type: Boolean,
    default: false,
    index: true
  },
  trigger: {
    event: { type: String, required: true },
    resource: { type: String, required: true }
  },
  conditions: [RecipeConditionSchema],
  actions: [RecipeActionSchema],
  stats: {
    executionCount: { type: Number, default: 0 },
    lastExecutedAt: Date,
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'recipes'
});
```

**Definition of Done:**
- Schema can be instantiated: `new Recipe(data)`
- Required field validation works (throws error when missing)
- Enum validation works (rejects invalid values)
- Default values applied correctly
- Timestamps auto-populate on save

---

#### Task 3.1.3: Add Recipe Model Indexes
**File:** `app/models/Recipe.ts`

**Description:**
Define compound indexes for common query patterns (recipe library, webhook routing, recent recipes).

**Acceptance Criteria:**
- [ ] Compound index: `{ shop: 1, enabled: 1, category: 1 }`
- [ ] Compound index: `{ shop: 1, 'trigger.event': 1, enabled: 1 }`
- [ ] Compound index: `{ shop: 1, updatedAt: -1 }`
- [ ] Indexes created on MongoDB startup
- [ ] Query plans use indexes (verified with explain())

**Implementation Details:**
```typescript
// Add after schema definition
RecipeSchema.index({ shop: 1, enabled: 1, category: 1 });
RecipeSchema.index({ shop: 1, 'trigger.event': 1, enabled: 1 });
RecipeSchema.index({ shop: 1, updatedAt: -1 });
```

**Definition of Done:**
- Run `db.recipes.getIndexes()` in MongoDB shell - all 3 indexes present
- Test query: `Recipe.find({ shop, enabled: true, category: 'customer' })` - uses index
- No performance warnings in logs

---

#### Task 3.1.4: Add Recipe Model Validation
**File:** `app/models/Recipe.ts`

**Description:**
Add custom validation rules beyond basic schema validation (e.g., enabled recipes must have conditions and actions).

**Acceptance Criteria:**
- [ ] Validation: If `enabled: true`, conditions array must not be empty
- [ ] Validation: If `enabled: true`, actions array must not be empty
- [ ] Validation: `trigger.event` matches Shopify webhook topic format (e.g., "products/update")
- [ ] Validation errors throw with clear messages

**Implementation Details:**
```typescript
// Add pre-save hook for validation
RecipeSchema.pre('save', function(next) {
  if (this.enabled) {
    if (!this.conditions || this.conditions.length === 0) {
      return next(new Error('Enabled recipes must have at least one condition'));
    }
    if (!this.actions || this.actions.length === 0) {
      return next(new Error('Enabled recipes must have at least one action'));
    }
  }

  // Validate webhook topic format
  const validTopicPattern = /^[a-z_]+\/[a-z_]+$/;
  if (!validTopicPattern.test(this.trigger.event)) {
    return next(new Error('Invalid webhook topic format'));
  }

  next();
});
```

**Definition of Done:**
- Test: Save recipe with `enabled: true` and empty conditions - throws error
- Test: Save recipe with `enabled: true` and empty actions - throws error
- Test: Save recipe with invalid topic format - throws error
- Test: Save valid recipe - succeeds

---

#### Task 3.1.5: Add Recipe Model Methods
**File:** `app/models/Recipe.ts`

**Description:**
Add utility methods for common operations (increment execution count, toggle enabled state).

**Acceptance Criteria:**
- [ ] Static method: `findByShopAndCategory(shop, category)` - returns recipes
- [ ] Static method: `findActiveByEvent(shop, event)` - returns enabled recipes for webhook
- [ ] Instance method: `incrementExecutionCount(success: boolean)` - updates stats
- [ ] Instance method: `toggleEnabled()` - flips enabled state

**Implementation Details:**
```typescript
// Static methods
RecipeSchema.statics.findByShopAndCategory = function(shop: string, category: RecipeCategory) {
  return this.find({ shop, category }).sort({ updatedAt: -1 });
};

RecipeSchema.statics.findActiveByEvent = function(shop: string, event: string) {
  return this.find({
    shop,
    enabled: true,
    'trigger.event': event
  });
};

// Instance methods
RecipeSchema.methods.incrementExecutionCount = async function(success: boolean) {
  this.stats.executionCount += 1;
  this.stats.lastExecutedAt = new Date();

  if (success) {
    this.stats.successCount += 1;
  } else {
    this.stats.errorCount += 1;
  }

  return this.save();
};

RecipeSchema.methods.toggleEnabled = async function() {
  this.enabled = !this.enabled;
  return this.save();
};
```

**Definition of Done:**
- All methods callable on model/instance
- Methods return expected results
- Stats updates use atomic operations
- Methods have TypeScript return types

---

#### Task 3.1.6: Export Recipe Model
**File:** `app/models/Recipe.ts`

**Description:**
Create and export Mongoose model from schema.

**Acceptance Criteria:**
- [ ] Model created: `mongoose.model<IRecipe>('Recipe', RecipeSchema)`
- [ ] Model exported as default export
- [ ] Model can be imported in other files
- [ ] TypeScript types preserved on import

**Implementation Details:**
```typescript
// At end of file
export const Recipe = mongoose.model<IRecipe>('Recipe', RecipeSchema);
export default Recipe;
```

**Definition of Done:**
- Can import: `import Recipe from '~/models/Recipe'`
- TypeScript autocomplete works on `Recipe.find()`
- No compilation errors

---

### 3.2 Setting Model Implementation

#### Task 3.2.1: Create Setting TypeScript Interface
**File:** `app/models/Setting.ts`

**Description:**
Define TypeScript interface `ISetting` with all fields from ARCHITECTURE.md specification.

**Acceptance Criteria:**
- [ ] Interface `ISetting` exported
- [ ] Nested interfaces for `features`, `preferences`, `shopMetadata`
- [ ] Enum types for `plan`, `billingStatus`
- [ ] JSDoc comments on all fields

**Implementation Details:**
```typescript
export enum Plan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export enum BillingStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  TRIAL = 'trial'
}

export interface ISetting {
  shop: string;
  plan: Plan;
  billingStatus: BillingStatus;
  trialEndsAt?: Date;
  subscriptionId?: string;
  accessToken: string;
  scopes: string[];
  features: {
    maxRecipes: number;
    advancedConditions: boolean;
    scheduledRecipes: boolean;
    customWebhooks: boolean;
  };
  preferences: {
    emailNotifications: boolean;
    activityLogRetention: number;
    timezone: string;
  };
  shopMetadata: {
    shopName: string;
    shopOwner: string;
    email: string;
    domain: string;
    currency: string;
    timezone: string;
  };
  installedAt: Date;
  uninstalledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Definition of Done:**
- All enums defined
- Interface compiles
- Can be imported in other files

---

#### Task 3.2.2: Create Setting Mongoose Schema
**File:** `app/models/Setting.ts`

**Description:**
Define Mongoose schema with validation rules and default values.

**Acceptance Criteria:**
- [ ] Schema defined with all fields
- [ ] Unique index on `shop` field
- [ ] Default values for `plan` (free), `billingStatus` (trial)
- [ ] Default feature flags based on plan
- [ ] Timestamps enabled

**Implementation Details:**
```typescript
const SettingSchema = new Schema<ISetting>({
  shop: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  plan: {
    type: String,
    required: true,
    enum: Object.values(Plan),
    default: Plan.FREE
  },
  billingStatus: {
    type: String,
    required: true,
    enum: Object.values(BillingStatus),
    default: BillingStatus.TRIAL
  },
  trialEndsAt: Date,
  subscriptionId: String,
  accessToken: {
    type: String,
    required: true
  },
  scopes: [{ type: String }],
  features: {
    maxRecipes: {
      type: Number,
      default: 10,
      min: 10,
      max: 1000
    },
    advancedConditions: { type: Boolean, default: false },
    scheduledRecipes: { type: Boolean, default: false },
    customWebhooks: { type: Boolean, default: false }
  },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    activityLogRetention: {
      type: Number,
      default: 90,
      min: 30,
      max: 365
    },
    timezone: {
      type: String,
      default: 'America/New_York'
    }
  },
  shopMetadata: {
    shopName: { type: String, required: true },
    shopOwner: { type: String, required: true },
    email: { type: String, required: true },
    domain: { type: String, required: true },
    currency: { type: String, required: true },
    timezone: { type: String, required: true }
  },
  installedAt: {
    type: Date,
    default: Date.now
  },
  uninstalledAt: Date
}, {
  timestamps: true,
  collection: 'settings'
});
```

**Definition of Done:**
- Schema compiles
- Unique constraint on shop works
- Default values applied
- Validation rules enforced

---

#### Task 3.2.3: Add Setting Model Indexes
**File:** `app/models/Setting.ts`

**Description:**
Define indexes for billing queries and plan-based lookups.

**Acceptance Criteria:**
- [ ] Unique index: `{ shop: 1 }` (one setting per shop)
- [ ] Compound index: `{ billingStatus: 1, trialEndsAt: 1 }` (find expiring trials)
- [ ] Index: `{ plan: 1 }` (plan-based queries)

**Implementation Details:**
```typescript
SettingSchema.index({ shop: 1 }, { unique: true });
SettingSchema.index({ billingStatus: 1, trialEndsAt: 1 });
SettingSchema.index({ plan: 1 });
```

**Definition of Done:**
- All indexes created in MongoDB
- Unique constraint enforced (cannot insert duplicate shop)

---

#### Task 3.2.4: Add Access Token Encryption
**File:** `app/models/Setting.ts`

**Description:**
Add pre-save hook to encrypt `accessToken` before storing in database.

**Acceptance Criteria:**
- [ ] Pre-save hook encrypts `accessToken` if modified
- [ ] Uses crypto library with AES-256-GCM
- [ ] Encryption key from environment variable `ENCRYPTION_KEY`
- [ ] Instance method `decryptAccessToken()` returns plaintext token

**Implementation Details:**
```typescript
import crypto from 'crypto';

// Encryption helper
function encrypt(text: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(text: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
  const [ivHex, authTagHex, encrypted] = text.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Pre-save hook
SettingSchema.pre('save', function(next) {
  if (this.isModified('accessToken')) {
    this.accessToken = encrypt(this.accessToken);
  }
  next();
});

// Instance method
SettingSchema.methods.decryptAccessToken = function(): string {
  return decrypt(this.accessToken);
};
```

**Definition of Done:**
- Tokens stored encrypted in MongoDB (not plaintext)
- `decryptAccessToken()` returns original token
- Test: Save setting, query from DB, decrypt matches original

---

#### Task 3.2.5: Add Setting Model Methods
**File:** `app/models/Setting.ts`

**Description:**
Add utility methods for plan management and feature checks.

**Acceptance Criteria:**
- [ ] Static method: `findByShop(shop)` - returns setting or null
- [ ] Instance method: `updatePlan(newPlan)` - updates plan and features
- [ ] Instance method: `hasFeature(featureName)` - checks if feature enabled
- [ ] Instance method: `isTrialExpired()` - checks if trial ended

**Implementation Details:**
```typescript
SettingSchema.statics.findByShop = function(shop: string) {
  return this.findOne({ shop });
};

SettingSchema.methods.updatePlan = async function(newPlan: Plan) {
  this.plan = newPlan;

  // Update features based on plan
  switch (newPlan) {
    case Plan.FREE:
      this.features.maxRecipes = 10;
      this.features.advancedConditions = false;
      this.features.scheduledRecipes = false;
      this.features.customWebhooks = false;
      break;
    case Plan.PRO:
      this.features.maxRecipes = 100;
      this.features.advancedConditions = true;
      this.features.scheduledRecipes = false;
      this.features.customWebhooks = false;
      break;
    case Plan.ENTERPRISE:
      this.features.maxRecipes = 1000;
      this.features.advancedConditions = true;
      this.features.scheduledRecipes = true;
      this.features.customWebhooks = true;
      break;
  }

  return this.save();
};

SettingSchema.methods.hasFeature = function(featureName: string): boolean {
  return this.features[featureName as keyof typeof this.features] === true;
};

SettingSchema.methods.isTrialExpired = function(): boolean {
  if (this.billingStatus !== BillingStatus.TRIAL) return false;
  if (!this.trialEndsAt) return false;
  return this.trialEndsAt < new Date();
};
```

**Definition of Done:**
- All methods work as expected
- Plan changes update features correctly
- Feature checks return boolean

---

#### Task 3.2.6: Export Setting Model
**File:** `app/models/Setting.ts`

**Description:**
Create and export Mongoose model.

**Acceptance Criteria:**
- [ ] Model created and exported
- [ ] Can be imported in other files
- [ ] TypeScript types preserved

**Implementation Details:**
```typescript
export const Setting = mongoose.model<ISetting>('Setting', SettingSchema);
export default Setting;
```

**Definition of Done:**
- Can import and use model
- TypeScript autocomplete works

---

### 3.3 AutomationLog Model Implementation

#### Task 3.3.1: Create AutomationLog TypeScript Interface
**File:** `app/models/AutomationLog.ts`

**Description:**
Define TypeScript interface with all fields.

**Acceptance Criteria:**
- [ ] Interface `IAutomationLog` exported
- [ ] Enum types for `logType`, `severity`, `action.result`
- [ ] JSDoc comments

**Implementation Details:**
```typescript
export enum LogType {
  RECIPE_EXECUTION = 'recipe_execution',
  WEBHOOK_RECEIVED = 'webhook_received',
  ERROR = 'error',
  SYSTEM = 'system'
}

export enum Severity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export enum ActionResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  SKIPPED = 'skipped'
}

export interface IAutomationLog {
  shop: string;
  logType: LogType;
  severity: Severity;
  recipeId?: mongoose.Types.ObjectId;
  recipeTitle?: string;
  resourceType?: 'customer' | 'order' | 'product' | 'inventory';
  resourceId?: string;
  resourceTitle?: string;
  action?: {
    type: string;
    params: Record<string, any>;
    result: ActionResult;
    errorMessage?: string;
  };
  message: string;
  metadata?: Record<string, any>;
  duration?: number;
  createdAt: Date;
}
```

**Definition of Done:**
- Interface compiles
- All enums defined

---

#### Task 3.3.2: Create AutomationLog Mongoose Schema
**File:** `app/models/AutomationLog.ts`

**Description:**
Define schema with validation and TTL index.

**Acceptance Criteria:**
- [ ] Schema defined with all fields
- [ ] TTL index on `createdAt` (90 days = 7776000 seconds)
- [ ] Validation: `message` max 500 characters
- [ ] Timestamps enabled (createdAt only, no updatedAt)

**Implementation Details:**
```typescript
const AutomationLogSchema = new Schema<IAutomationLog>({
  shop: {
    type: String,
    required: true,
    index: true
  },
  logType: {
    type: String,
    required: true,
    enum: Object.values(LogType)
  },
  severity: {
    type: String,
    required: true,
    enum: Object.values(Severity)
  },
  recipeId: {
    type: Schema.Types.ObjectId,
    ref: 'Recipe'
  },
  recipeTitle: String,
  resourceType: {
    type: String,
    enum: ['customer', 'order', 'product', 'inventory']
  },
  resourceId: String,
  resourceTitle: String,
  action: {
    type: { type: String },
    params: { type: Schema.Types.Mixed },
    result: {
      type: String,
      enum: Object.values(ActionResult)
    },
    errorMessage: String
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  metadata: { type: Schema.Types.Mixed },
  duration: Number,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7776000  // TTL: 90 days in seconds
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'automation_logs'
});
```

**Definition of Done:**
- Schema compiles
- TTL index configured (check with `db.automation_logs.getIndexes()`)
- Old logs auto-delete after 90 days

---

#### Task 3.3.3: Add AutomationLog Model Indexes
**File:** `app/models/AutomationLog.ts`

**Description:**
Define indexes for activity log queries.

**Acceptance Criteria:**
- [ ] Compound index: `{ shop: 1, createdAt: -1 }` (activity log pagination)
- [ ] Compound index: `{ shop: 1, recipeId: 1, createdAt: -1 }` (recipe logs)
- [ ] Compound index: `{ shop: 1, resourceId: 1 }` (resource logs)
- [ ] Compound index: `{ shop: 1, logType: 1, severity: 1 }` (filtering)
- [ ] TTL index: `{ createdAt: 1 }` with `expireAfterSeconds: 7776000`

**Implementation Details:**
```typescript
AutomationLogSchema.index({ shop: 1, createdAt: -1 });
AutomationLogSchema.index({ shop: 1, recipeId: 1, createdAt: -1 });
AutomationLogSchema.index({ shop: 1, resourceId: 1 });
AutomationLogSchema.index({ shop: 1, logType: 1, severity: 1 });
AutomationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
```

**Definition of Done:**
- All indexes created
- Query plans use indexes
- TTL index working (verify with test document)

---

#### Task 3.3.4: Add AutomationLog Model Methods
**File:** `app/models/AutomationLog.ts`

**Description:**
Add utility methods for log creation.

**Acceptance Criteria:**
- [ ] Static method: `logRecipeExecution(params)` - creates recipe execution log
- [ ] Static method: `logError(shop, message, metadata)` - creates error log
- [ ] Static method: `findByShop(shop, limit, skip)` - paginated logs
- [ ] Static method: `findByRecipe(shop, recipeId, limit)` - recipe-specific logs

**Implementation Details:**
```typescript
AutomationLogSchema.statics.logRecipeExecution = function(params: {
  shop: string;
  recipeId: mongoose.Types.ObjectId;
  recipeTitle: string;
  resourceType: string;
  resourceId: string;
  resourceTitle: string;
  action: {
    type: string;
    params: Record<string, any>;
    result: ActionResult;
    errorMessage?: string;
  };
  duration: number;
}) {
  return this.create({
    shop: params.shop,
    logType: LogType.RECIPE_EXECUTION,
    severity: params.action.result === ActionResult.SUCCESS ? Severity.INFO : Severity.ERROR,
    recipeId: params.recipeId,
    recipeTitle: params.recipeTitle,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    resourceTitle: params.resourceTitle,
    action: params.action,
    message: `Recipe "${params.recipeTitle}" executed for ${params.resourceType} ${params.resourceId}`,
    duration: params.duration
  });
};

AutomationLogSchema.statics.logError = function(
  shop: string,
  message: string,
  metadata?: Record<string, any>
) {
  return this.create({
    shop,
    logType: LogType.ERROR,
    severity: Severity.ERROR,
    message,
    metadata
  });
};

AutomationLogSchema.statics.findByShop = function(
  shop: string,
  limit: number = 50,
  skip: number = 0
) {
  return this.find({ shop })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

AutomationLogSchema.statics.findByRecipe = function(
  shop: string,
  recipeId: mongoose.Types.ObjectId,
  limit: number = 50
) {
  return this.find({ shop, recipeId })
    .sort({ createdAt: -1 })
    .limit(limit);
};
```

**Definition of Done:**
- All methods work
- Logs created with correct fields
- Pagination works

---

#### Task 3.3.5: Export AutomationLog Model
**File:** `app/models/AutomationLog.ts`

**Description:**
Create and export model.

**Acceptance Criteria:**
- [ ] Model created and exported
- [ ] Can be imported
- [ ] TypeScript types preserved

**Implementation Details:**
```typescript
export const AutomationLog = mongoose.model<IAutomationLog>('AutomationLog', AutomationLogSchema);
export default AutomationLog;
```

**Definition of Done:**
- Can import and use model

---

### 3.4 Shop Model Implementation

#### Task 3.4.1: Create Shop TypeScript Interface
**File:** `app/models/Shop.ts`

**Description:**
Define TypeScript interface.

**Acceptance Criteria:**
- [ ] Interface `IShop` exported
- [ ] Nested interface for `webhooks` array
- [ ] Enum for `appStatus`, `webhooks.status`

**Implementation Details:**
```typescript
export enum AppStatus {
  INSTALLED = 'installed',
  UNINSTALLED = 'uninstalled',
  SUSPENDED = 'suspended'
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed'
}

export interface IShop {
  shop: string;
  shopifyShopId: string;
  name: string;
  email: string;
  domain: string;
  currency: string;
  timezone: string;
  webhooks: Array<{
    topic: string;
    webhookId: string;
    registeredAt: Date;
    status: WebhookStatus;
  }>;
  appStatus: AppStatus;
  installedAt: Date;
  uninstalledAt?: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Definition of Done:**
- Interface compiles
- All enums defined

---

#### Task 3.4.2: Create Shop Mongoose Schema
**File:** `app/models/Shop.ts`

**Description:**
Define schema with validation.

**Acceptance Criteria:**
- [ ] Schema defined
- [ ] Unique index on `shop`
- [ ] Validation: `shopifyShopId` matches GID format
- [ ] Default: `appStatus` = 'installed'
- [ ] Default: `lastSeenAt` = now

**Implementation Details:**
```typescript
const WebhookSchema = new Schema({
  topic: { type: String, required: true },
  webhookId: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: Object.values(WebhookStatus),
    default: WebhookStatus.ACTIVE
  }
}, { _id: false });

const ShopSchema = new Schema<IShop>({
  shop: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  shopifyShopId: {
    type: String,
    required: true,
    match: /^gid:\/\/shopify\/Shop\/\d+$/
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  domain: { type: String, required: true },
  currency: { type: String, required: true },
  timezone: { type: String, required: true },
  webhooks: [WebhookSchema],
  appStatus: {
    type: String,
    enum: Object.values(AppStatus),
    default: AppStatus.INSTALLED
  },
  installedAt: {
    type: Date,
    default: Date.now
  },
  uninstalledAt: Date,
  lastSeenAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'shops'
});
```

**Definition of Done:**
- Schema compiles
- GID validation works
- Unique constraint on shop enforced

---

#### Task 3.4.3: Add Shop Model Indexes
**File:** `app/models/Shop.ts`

**Description:**
Define indexes for lookups.

**Acceptance Criteria:**
- [ ] Unique index: `{ shop: 1 }`
- [ ] Index: `{ shopifyShopId: 1 }`
- [ ] Compound index: `{ appStatus: 1, lastSeenAt: -1 }`

**Implementation Details:**
```typescript
ShopSchema.index({ shop: 1 }, { unique: true });
ShopSchema.index({ shopifyShopId: 1 });
ShopSchema.index({ appStatus: 1, lastSeenAt: -1 });
```

**Definition of Done:**
- All indexes created

---

#### Task 3.4.4: Add Shop Model Methods
**File:** `app/models/Shop.ts`

**Description:**
Add utility methods for webhook management.

**Acceptance Criteria:**
- [ ] Static method: `findByShop(shop)` - returns shop or null
- [ ] Instance method: `addWebhook(topic, webhookId)` - adds to webhooks array
- [ ] Instance method: `removeWebhook(webhookId)` - removes from array
- [ ] Instance method: `updateLastSeen()` - updates lastSeenAt
- [ ] Instance method: `markUninstalled()` - sets appStatus and uninstalledAt

**Implementation Details:**
```typescript
ShopSchema.statics.findByShop = function(shop: string) {
  return this.findOne({ shop });
};

ShopSchema.methods.addWebhook = async function(topic: string, webhookId: string) {
  this.webhooks.push({
    topic,
    webhookId,
    registeredAt: new Date(),
    status: WebhookStatus.ACTIVE
  });
  return this.save();
};

ShopSchema.methods.removeWebhook = async function(webhookId: string) {
  this.webhooks = this.webhooks.filter(w => w.webhookId !== webhookId);
  return this.save();
};

ShopSchema.methods.updateLastSeen = async function() {
  this.lastSeenAt = new Date();
  return this.save();
};

ShopSchema.methods.markUninstalled = async function() {
  this.appStatus = AppStatus.UNINSTALLED;
  this.uninstalledAt = new Date();
  return this.save();
};
```

**Definition of Done:**
- All methods work
- Webhook array updates correctly

---

#### Task 3.4.5: Export Shop Model
**File:** `app/models/Shop.ts`

**Description:**
Create and export model.

**Acceptance Criteria:**
- [ ] Model created and exported
- [ ] Can be imported
- [ ] TypeScript types preserved

**Implementation Details:**
```typescript
export const Shop = mongoose.model<IShop>('Shop', ShopSchema);
export default Shop;
```

**Definition of Done:**
- Can import and use model

---

### 3.5 Integration Tasks

#### Task 3.5.1: Create Model Index File
**File:** `app/models/index.ts`

**Description:**
Create central export file for all models.

**Acceptance Criteria:**
- [ ] File exports all 4 models
- [ ] Re-exports all TypeScript interfaces
- [ ] Re-exports all enums
- [ ] Can import all models from single file

**Implementation Details:**
```typescript
// app/models/index.ts
export { Recipe, IRecipe, RecipeCategory, ConditionOperator, ActionType } from './Recipe';
export { Setting, ISetting, Plan, BillingStatus } from './Setting';
export { AutomationLog, IAutomationLog, LogType, Severity, ActionResult } from './AutomationLog';
export { Shop, IShop, AppStatus, WebhookStatus } from './Shop';
```

**Definition of Done:**
- Can import: `import { Recipe, Setting, AutomationLog, Shop } from '~/models'`
- All types available via single import

---

#### Task 3.5.2: Update Mongoose Connection to Preload Models
**File:** `app/mongoose.server.ts`

**Description:**
Import all models in mongoose.server.ts to ensure they're registered on connection.

**Acceptance Criteria:**
- [ ] Import all models at top of file
- [ ] Models available after `connectToMongoDB()` call
- [ ] No duplicate model registration errors

**Implementation Details:**
```typescript
// Add to app/mongoose.server.ts after connectToMongoDB function
import '~/models/Recipe';
import '~/models/Setting';
import '~/models/AutomationLog';
import '~/models/Shop';
```

**Definition of Done:**
- Models work in Remix loaders/actions after connecting
- No registration errors in logs

---

#### Task 3.5.3: Add TypeScript Path Alias for Models
**File:** `tsconfig.json`

**Description:**
Ensure `~/models` path alias resolves correctly.

**Acceptance Criteria:**
- [ ] Path alias `~/models` points to `app/models`
- [ ] TypeScript resolves imports correctly
- [ ] No compilation errors

**Implementation Details:**
```json
// tsconfig.json (verify existing config)
{
  "compilerOptions": {
    "paths": {
      "~/*": ["./app/*"]
    }
  }
}
```

**Definition of Done:**
- Imports work: `import { Recipe } from '~/models'`
- No TypeScript errors

---

### 3.6 Testing Tasks

#### Task 3.6.1: Write Recipe Model Tests
**File:** `test/models/Recipe.test.ts`

**Description:**
Write unit tests for Recipe model validation and methods.

**Acceptance Criteria:**
- [ ] Test: Create valid recipe - succeeds
- [ ] Test: Create recipe without required fields - throws error
- [ ] Test: Enable recipe without conditions - throws error
- [ ] Test: Enable recipe without actions - throws error
- [ ] Test: Invalid webhook topic format - throws error
- [ ] Test: `incrementExecutionCount()` updates stats correctly
- [ ] Test: `toggleEnabled()` flips boolean
- [ ] Test: `findActiveByEvent()` returns only enabled recipes

**Implementation Details:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectToMongoDB, mongoose } from '~/mongoose.server';
import Recipe, { RecipeCategory, ConditionOperator, ActionType } from '~/models/Recipe';

describe('Recipe Model', () => {
  beforeAll(async () => {
    await connectToMongoDB();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a valid recipe', async () => {
    const recipe = await Recipe.create({
      shop: 'test-shop.myshopify.com',
      title: 'Test Recipe',
      description: 'Test description',
      category: RecipeCategory.CUSTOMER,
      enabled: false,
      trigger: {
        event: 'customers/update',
        resource: 'customer'
      },
      conditions: [{
        field: 'total_spent',
        operator: ConditionOperator.GREATER_THAN,
        value: 1000
      }],
      actions: [{
        type: ActionType.ADD_TAG,
        params: { tag: 'VIP' }
      }]
    });

    expect(recipe).toBeDefined();
    expect(recipe.shop).toBe('test-shop.myshopify.com');
    expect(recipe.stats.executionCount).toBe(0);
  });

  it('should throw error when enabling recipe without conditions', async () => {
    const recipe = new Recipe({
      shop: 'test-shop.myshopify.com',
      title: 'Test Recipe',
      description: 'Test description',
      category: RecipeCategory.CUSTOMER,
      enabled: true,
      trigger: { event: 'customers/update', resource: 'customer' },
      conditions: [],
      actions: [{ type: ActionType.ADD_TAG, params: { tag: 'VIP' } }]
    });

    await expect(recipe.save()).rejects.toThrow('at least one condition');
  });

  it('should increment execution count', async () => {
    const recipe = await Recipe.create({
      shop: 'test-shop.myshopify.com',
      title: 'Test Recipe',
      description: 'Test',
      category: RecipeCategory.CUSTOMER,
      trigger: { event: 'customers/update', resource: 'customer' },
      conditions: [{ field: 'test', operator: ConditionOperator.EQUALS, value: 1 }],
      actions: [{ type: ActionType.ADD_TAG, params: { tag: 'test' } }]
    });

    await recipe.incrementExecutionCount(true);

    expect(recipe.stats.executionCount).toBe(1);
    expect(recipe.stats.successCount).toBe(1);
    expect(recipe.stats.errorCount).toBe(0);
  });
});
```

**Definition of Done:**
- All tests pass
- Code coverage >80% for Recipe model

---

#### Task 3.6.2: Write Setting Model Tests
**File:** `test/models/Setting.test.ts`

**Description:**
Write unit tests for Setting model.

**Acceptance Criteria:**
- [ ] Test: Create setting with all fields - succeeds
- [ ] Test: Duplicate shop - throws unique constraint error
- [ ] Test: Access token is encrypted on save
- [ ] Test: `decryptAccessToken()` returns original token
- [ ] Test: `updatePlan()` updates features correctly
- [ ] Test: `hasFeature()` returns correct boolean
- [ ] Test: `isTrialExpired()` detects expired trials

**Definition of Done:**
- All tests pass
- Encryption/decryption verified

---

#### Task 3.6.3: Write AutomationLog Model Tests
**File:** `test/models/AutomationLog.test.ts`

**Description:**
Write unit tests for AutomationLog model.

**Acceptance Criteria:**
- [ ] Test: Create log with all fields - succeeds
- [ ] Test: `logRecipeExecution()` creates correct log entry
- [ ] Test: `logError()` creates error log
- [ ] Test: `findByShop()` returns paginated results
- [ ] Test: `findByRecipe()` filters by recipeId
- [ ] Test: TTL index exists (verify with getIndexes())

**Definition of Done:**
- All tests pass
- TTL functionality verified

---

#### Task 3.6.4: Write Shop Model Tests
**File:** `test/models/Shop.test.ts`

**Description:**
Write unit tests for Shop model.

**Acceptance Criteria:**
- [ ] Test: Create shop with all fields - succeeds
- [ ] Test: Invalid shopifyShopId format - throws error
- [ ] Test: `addWebhook()` adds to array
- [ ] Test: `removeWebhook()` removes from array
- [ ] Test: `updateLastSeen()` updates timestamp
- [ ] Test: `markUninstalled()` sets status and date

**Definition of Done:**
- All tests pass
- Webhook management verified

---

#### Task 3.6.5: Write Integration Tests
**File:** `test/integration/models.integration.test.ts`

**Description:**
Test cross-model relationships and queries.

**Acceptance Criteria:**
- [ ] Test: Create shop + setting + recipes - all succeed
- [ ] Test: Query recipes by shop - returns correct subset
- [ ] Test: Create automation logs for recipe - logs link correctly
- [ ] Test: Multi-tenant isolation - shop A cannot see shop B data

**Implementation Details:**
```typescript
describe('Multi-Tenant Data Isolation', () => {
  it('should isolate recipes by shop', async () => {
    await Recipe.create({
      shop: 'shop-a.myshopify.com',
      title: 'Shop A Recipe',
      // ... other fields
    });

    await Recipe.create({
      shop: 'shop-b.myshopify.com',
      title: 'Shop B Recipe',
      // ... other fields
    });

    const shopARecipes = await Recipe.find({ shop: 'shop-a.myshopify.com' });
    const shopBRecipes = await Recipe.find({ shop: 'shop-b.myshopify.com' });

    expect(shopARecipes).toHaveLength(1);
    expect(shopBRecipes).toHaveLength(1);
    expect(shopARecipes[0].title).toBe('Shop A Recipe');
    expect(shopBRecipes[0].title).toBe('Shop B Recipe');
  });
});
```

**Definition of Done:**
- All integration tests pass
- Multi-tenancy verified

---

### 3.7 Documentation Tasks

#### Task 3.7.1: Add JSDoc Comments to All Models
**Files:** `app/models/*.ts`

**Description:**
Add comprehensive JSDoc comments to all schemas, interfaces, and methods.

**Acceptance Criteria:**
- [ ] All interfaces have JSDoc comments
- [ ] All schema fields have comments
- [ ] All methods have parameter and return type docs
- [ ] Examples included for complex methods

**Implementation Details:**
```typescript
/**
 * Recipe automation rule configuration.
 *
 * Recipes define if/then logic for automating Shopify operations.
 * Each recipe triggers on a specific webhook event, evaluates conditions,
 * and executes actions if conditions are met.
 *
 * @example
 * ```typescript
 * const recipe = await Recipe.create({
 *   shop: 'example.myshopify.com',
 *   title: 'Tag VIP Customers',
 *   description: 'Add VIP tag to customers who spend over $1000',
 *   category: RecipeCategory.CUSTOMER,
 *   trigger: { event: 'customers/update', resource: 'customer' },
 *   conditions: [{
 *     field: 'total_spent',
 *     operator: ConditionOperator.GREATER_THAN,
 *     value: 1000
 *   }],
 *   actions: [{
 *     type: ActionType.ADD_TAG,
 *     params: { tag: 'VIP' }
 *   }]
 * });
 * ```
 */
export interface IRecipe {
  /**
   * Shopify shop domain (multi-tenant key).
   * @example "example.myshopify.com"
   */
  shop: string;

  // ... continue for all fields
}
```

**Definition of Done:**
- All public APIs documented
- TypeScript IntelliSense shows docs

---

#### Task 3.7.2: Create Schema Diagram
**File:** `docs/schema-diagram.md`

**Description:**
Create visual diagram showing all models and their relationships.

**Acceptance Criteria:**
- [ ] Diagram shows all 4 models
- [ ] Field names and types visible
- [ ] Relationships indicated (Recipe -> AutomationLog)
- [ ] Indexes documented
- [ ] Markdown-based (Mermaid or ASCII art)

**Implementation Details:**
```markdown
# MongoDB Schema Diagram

## Models Overview

```mermaid
erDiagram
    RECIPE {
        ObjectId _id
        String shop
        String title
        String category
        Boolean enabled
        Object trigger
        Array conditions
        Array actions
        Object stats
    }

    SETTING {
        ObjectId _id
        String shop UK
        String plan
        String billingStatus
        String accessToken
        Object features
        Object preferences
    }

    AUTOMATION_LOG {
        ObjectId _id
        String shop
        String logType
        String severity
        ObjectId recipeId
        String message
        Date createdAt TTL
    }

    SHOP {
        ObjectId _id
        String shop UK
        String shopifyShopId
        Array webhooks
        String appStatus
    }

    RECIPE ||--o{ AUTOMATION_LOG : "logs executions"
    SHOP ||--|| SETTING : "has one"
```

## Indexes

### Recipe
- `{ shop: 1, enabled: 1, category: 1 }`
- `{ shop: 1, 'trigger.event': 1, enabled: 1 }`
- `{ shop: 1, updatedAt: -1 }`

### Setting
- `{ shop: 1 }` (unique)
- `{ billingStatus: 1, trialEndsAt: 1 }`
- `{ plan: 1 }`

### AutomationLog
- `{ shop: 1, createdAt: -1 }`
- `{ shop: 1, recipeId: 1, createdAt: -1 }`
- `{ shop: 1, resourceId: 1 }`
- `{ createdAt: 1 }` (TTL: 90 days)

### Shop
- `{ shop: 1 }` (unique)
- `{ shopifyShopId: 1 }`
- `{ appStatus: 1, lastSeenAt: -1 }`
```
**Definition of Done:**
- Diagram renders correctly in Markdown
- All relationships shown

---

#### Task 3.7.3: Update ARCHITECTURE.md
**File:** `docs/ARCHITECTURE.md`

**Description:**
Update architecture doc to reflect actual implementation.

**Acceptance Criteria:**
- [ ] "Current Implementation Status" section updated
- [ ] Mark data models as complete
- [ ] Add notes about encryption implementation
- [ ] Add notes about TTL index configuration

**Implementation Details:**
```markdown
## Current Implementation Status

### Phase 0: Foundation ✅ Complete
- [x] Shopify OAuth & session management
- [x] MongoDB connection singleton
- [x] Redis session storage
- [x] Remix routing structure

### Phase 1: MVP (In Progress - 40% Complete)
- [✅] **Data Models** - All 4 Mongoose models implemented
  - Recipe model with validation and stats tracking
  - Setting model with encrypted access tokens (AES-256-GCM)
  - AutomationLog model with 90-day TTL index
  - Shop model with webhook tracking
- [✅] **UI Infrastructure** - Polaris components and mock data
- [ ] Recipe Engine - Planned
- [ ] BullMQ Job Queue - Planned
- [ ] Webhook Handlers - Planned
```

**Definition of Done:**
- ARCHITECTURE.md reflects current state
- Implementation notes added

---

## 4. Implementation Order

**Critical Path:** Tasks must be completed in this order to avoid blockers.

### Week 1: Model Creation (Days 1-3)

**Day 1: Recipe Model**
1. Task 3.1.1: Create Recipe TypeScript Interface (1 hour)
2. Task 3.1.2: Create Recipe Mongoose Schema (2 hours)
3. Task 3.1.3: Add Recipe Model Indexes (30 min)
4. Task 3.1.4: Add Recipe Model Validation (1 hour)
5. Task 3.1.5: Add Recipe Model Methods (1 hour)
6. Task 3.1.6: Export Recipe Model (15 min)

**Day 2: Setting & AutomationLog Models**
1. Task 3.2.1: Create Setting TypeScript Interface (1 hour)
2. Task 3.2.2: Create Setting Mongoose Schema (2 hours)
3. Task 3.2.3: Add Setting Model Indexes (30 min)
4. Task 3.2.4: Add Access Token Encryption (2 hours) - **Security Critical**
5. Task 3.2.5: Add Setting Model Methods (1 hour)
6. Task 3.2.6: Export Setting Model (15 min)

**Day 3: AutomationLog & Shop Models**
1. Task 3.3.1: Create AutomationLog TypeScript Interface (45 min)
2. Task 3.3.2: Create AutomationLog Mongoose Schema (1.5 hours)
3. Task 3.3.3: Add AutomationLog Model Indexes (30 min) - **Include TTL**
4. Task 3.3.4: Add AutomationLog Model Methods (1 hour)
5. Task 3.3.5: Export AutomationLog Model (15 min)
6. Task 3.4.1: Create Shop TypeScript Interface (45 min)
7. Task 3.4.2: Create Shop Mongoose Schema (1.5 hours)
8. Task 3.4.3: Add Shop Model Indexes (30 min)
9. Task 3.4.4: Add Shop Model Methods (1 hour)
10. Task 3.4.5: Export Shop Model (15 min)

### Week 2: Integration & Testing (Days 4-5)

**Day 4: Integration**
1. Task 3.5.1: Create Model Index File (30 min)
2. Task 3.5.2: Update Mongoose Connection to Preload Models (30 min)
3. Task 3.5.3: Add TypeScript Path Alias (15 min)
4. Manual smoke test: Create documents in MongoDB (1 hour)
5. Verify indexes in MongoDB shell (30 min)

**Day 5: Testing**
1. Task 3.6.1: Write Recipe Model Tests (2 hours)
2. Task 3.6.2: Write Setting Model Tests (2 hours)
3. Task 3.6.3: Write AutomationLog Model Tests (1.5 hours)
4. Task 3.6.4: Write Shop Model Tests (1.5 hours)
5. Task 3.6.5: Write Integration Tests (2 hours)

### Week 2: Documentation (Days 6-7)

**Day 6: Documentation**
1. Task 3.7.1: Add JSDoc Comments to All Models (3 hours)
2. Task 3.7.2: Create Schema Diagram (2 hours)
3. Task 3.7.3: Update ARCHITECTURE.md (1 hour)

**Day 7: Final Review & Polish**
1. Run full test suite (30 min)
2. Check code coverage (target: >80%) (30 min)
3. Lint and format all files (30 min)
4. Review all JSDoc comments (1 hour)
5. Test imports in Remix loader (1 hour)
6. Final smoke test with MongoDB (1 hour)

---

## 5. Code Quality Requirements

### TypeScript Standards
- **No `any` types** - Use `unknown` or proper types
- **Strict mode enabled** - All compiler checks on
- **Interfaces over types** - Use `interface` for object shapes
- **Enum for constants** - No magic strings
- **JSDoc on all exports** - Document public APIs

### Mongoose Best Practices
- **Always use `lean()`** for read-only queries (performance)
- **Atomic updates** - Use `$inc`, `$push`, etc. to avoid race conditions
- **Projection** - Only select needed fields in queries
- **Index hints** - Use `.hint()` for critical queries
- **Connection pooling** - Reuse singleton connection

### Validation Strategy
- **Schema validation** - Primary defense (Mongoose built-in)
- **Custom validators** - Business rules (pre-save hooks)
- **Service layer validation** - Secondary defense (future epic)
- **TypeScript types** - Compile-time checks

### Security Requirements
- **Encrypt sensitive data** - Access tokens must be encrypted (AES-256-GCM)
- **No secrets in code** - Use environment variables
- **Validate GID format** - Prevent injection attacks
- **Multi-tenant scoping** - ALWAYS query by shop field
- **Input sanitization** - Escape user input in queries

### Testing Requirements
- **Unit tests** - All models must have test coverage >80%
- **Integration tests** - Cross-model queries tested
- **TTL verification** - Test AutomationLog expiration
- **Multi-tenancy** - Test data isolation between shops
- **Encryption** - Test token encryption/decryption

### Performance Requirements
- **Index coverage** - All queries use indexes (verify with explain())
- **Query optimization** - Use `lean()` for reads, projections
- **Connection reuse** - Singleton pattern enforced
- **TTL for logs** - Prevent unbounded collection growth

---

## 6. Files to Create/Modify

### New Files (8 files)

**Models:**
1. `app/models/Recipe.ts` - Recipe model (interface + schema + methods)
2. `app/models/Setting.ts` - Setting model (interface + schema + encryption)
3. `app/models/AutomationLog.ts` - AutomationLog model (interface + schema + TTL)
4. `app/models/Shop.ts` - Shop model (interface + schema + methods)
5. `app/models/index.ts` - Central export file

**Tests:**
6. `test/models/Recipe.test.ts` - Recipe unit tests
7. `test/models/Setting.test.ts` - Setting unit tests
8. `test/models/AutomationLog.test.ts` - AutomationLog unit tests
9. `test/models/Shop.test.ts` - Shop unit tests
10. `test/integration/models.integration.test.ts` - Cross-model tests

**Documentation:**
11. `docs/schema-diagram.md` - Visual schema diagram

### Modified Files (3 files)

1. `app/mongoose.server.ts` - Add model imports (Task 3.5.2)
   - Line to add: `import '~/models/Recipe'; import '~/models/Setting'; ...`

2. `tsconfig.json` - Verify path alias (Task 3.5.3)
   - Ensure `"~/*": ["./app/*"]` exists in `paths`

3. `docs/ARCHITECTURE.md` - Update implementation status (Task 3.7.3)
   - Update "Current Implementation Status" section

### Environment Variables

Add to `.env`:
```bash
# Encryption key for access tokens (32 bytes hex = 64 characters)
ENCRYPTION_KEY=your_64_character_hex_string_here
```

Generate key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 7. Acceptance Criteria

### Functional Requirements
- [ ] All 4 models can be imported: `import { Recipe, Setting, AutomationLog, Shop } from '~/models'`
- [ ] Models work in Remix loaders/actions after `connectToMongoDB()`
- [ ] Recipe CRUD operations succeed
- [ ] Setting CRUD operations succeed
- [ ] AutomationLog CRUD operations succeed
- [ ] Shop CRUD operations succeed
- [ ] Recipe validation prevents invalid data (empty conditions/actions when enabled)
- [ ] Setting validation enforces unique shop constraint
- [ ] AutomationLog TTL index deletes old logs (verify after 90 days or manual test)
- [ ] Shop validation enforces GID format
- [ ] Access token encryption/decryption works correctly
- [ ] Recipe stats increment atomically
- [ ] Webhook tracking in Shop model works

### Performance Requirements
- [ ] All queries use indexes (verify with MongoDB explain())
- [ ] Recipe library query (shop + enabled + category) uses compound index
- [ ] Webhook routing query (shop + trigger.event + enabled) uses compound index
- [ ] Activity log query (shop + createdAt desc) uses compound index
- [ ] Setting lookup by shop uses unique index
- [ ] No collection scans in production queries

### Security Requirements
- [ ] Access tokens stored encrypted in MongoDB (not plaintext)
- [ ] Encryption uses AES-256-GCM with random IV
- [ ] Encryption key from environment variable (not hardcoded)
- [ ] All queries scoped by shop field (multi-tenant isolation)
- [ ] shopifyShopId validation prevents injection
- [ ] No sensitive data in logs or error messages

### Testing Requirements
- [ ] All model unit tests pass (`pnpm test test/models`)
- [ ] Integration tests pass (`pnpm test test/integration`)
- [ ] Code coverage >80% for all models
- [ ] Multi-tenancy verified (shop A cannot see shop B data)
- [ ] TTL index functionality verified
- [ ] Encryption round-trip verified (encrypt then decrypt = original)

### Code Quality Requirements
- [ ] TypeScript compiles without errors (`pnpm build`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] No `any` types in model files
- [ ] All exports have JSDoc comments
- [ ] All enums defined (no magic strings)
- [ ] All schema fields have comments

### Documentation Requirements
- [ ] Schema diagram created and renders correctly
- [ ] ARCHITECTURE.md updated with implementation status
- [ ] All models have usage examples in JSDoc
- [ ] README.md updated with model import examples (if applicable)

---

## 8. Epic Completion Checklist

### Pre-Implementation
- [ ] Read and understand ARCHITECTURE.md data model specifications
- [ ] Review existing MongoDB connection in `app/mongoose.server.ts`
- [ ] Verify MongoDB and Redis running (`docker-compose ps`)
- [ ] Create `app/models/` directory
- [ ] Create `test/models/` and `test/integration/` directories
- [ ] Generate encryption key and add to `.env`

### Implementation Phase
- [ ] Complete all Recipe model tasks (3.1.1 - 3.1.6)
- [ ] Complete all Setting model tasks (3.2.1 - 3.2.6)
- [ ] Complete all AutomationLog model tasks (3.3.1 - 3.3.5)
- [ ] Complete all Shop model tasks (3.4.1 - 3.4.5)
- [ ] Complete integration tasks (3.5.1 - 3.5.3)
- [ ] Verify all indexes created in MongoDB (`db.collection.getIndexes()`)
- [ ] Smoke test: Create documents via MongoDB shell or Remix loader

### Testing Phase
- [ ] Write and pass Recipe model tests (3.6.1)
- [ ] Write and pass Setting model tests (3.6.2)
- [ ] Write and pass AutomationLog model tests (3.6.3)
- [ ] Write and pass Shop model tests (3.6.4)
- [ ] Write and pass integration tests (3.6.5)
- [ ] Verify code coverage >80%
- [ ] Fix any failing tests

### Documentation Phase
- [ ] Add JSDoc comments to all models (3.7.1)
- [ ] Create schema diagram (3.7.2)
- [ ] Update ARCHITECTURE.md (3.7.3)
- [ ] Review all documentation for accuracy

### Final Review
- [ ] Run full test suite (`pnpm test`)
- [ ] Run TypeScript compiler (`pnpm build`)
- [ ] Run linter (`pnpm lint`)
- [ ] Verify all acceptance criteria met
- [ ] Test model imports in Remix loader
- [ ] Verify MongoDB indexes in production-like environment
- [ ] Code review by team (if applicable)
- [ ] Update git status: Mark epic-1-006 as complete

---

## 9. Definition of Done vs Not Done

### ✅ DONE Examples

**Example 1: Recipe Model Complete**
```typescript
// ✅ DONE: Can import and use Recipe model
import Recipe from '~/models/Recipe';

export async function loader({ request }: LoaderFunctionArgs) {
  await connectToMongoDB();
  const { session } = await authenticate.admin(request);

  const recipes = await Recipe.find({
    shop: session.shop,
    enabled: true,
    category: 'customer'
  }).lean();

  return json({ recipes });
}

// ✅ DONE: Validation works
const recipe = new Recipe({
  shop: 'test.myshopify.com',
  title: 'VIP Tagger',
  enabled: true,
  conditions: [], // Will throw error
  actions: [{ type: 'addTag', params: { tag: 'VIP' } }]
});

await recipe.save(); // ❌ Throws: "Enabled recipes must have at least one condition"

// ✅ DONE: Methods work
const recipe = await Recipe.findOne({ shop, enabled: true });
await recipe.incrementExecutionCount(true);
console.log(recipe.stats.successCount); // 1

// ✅ DONE: Queries use indexes
const recipes = await Recipe.find({ shop, enabled: true, category: 'customer' })
  .explain('executionStats');
console.log(recipes.executionStats.executionStages.indexName);
// "shop_1_enabled_1_category_1"
```

**Example 2: Setting Model Complete**
```typescript
// ✅ DONE: Access token encryption works
const setting = await Setting.create({
  shop: 'test.myshopify.com',
  accessToken: 'shpat_abc123xyz', // Plaintext
  plan: 'free',
  // ... other fields
});

// Check MongoDB - token is encrypted
const dbDoc = await Setting.collection.findOne({ shop: 'test.myshopify.com' });
console.log(dbDoc.accessToken);
// "a1b2c3d4e5f6:auth_tag:encrypted_data" ✅

// Decrypt works
const decrypted = setting.decryptAccessToken();
console.log(decrypted); // "shpat_abc123xyz" ✅
```

**Example 3: AutomationLog TTL Works**
```typescript
// ✅ DONE: Old logs auto-delete after 90 days
const log = await AutomationLog.create({
  shop: 'test.myshopify.com',
  logType: 'recipe_execution',
  severity: 'info',
  message: 'Test log',
  createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000) // 91 days ago
});

// Wait for MongoDB TTL monitor (runs every 60 seconds)
setTimeout(async () => {
  const found = await AutomationLog.findById(log._id);
  console.log(found); // null ✅ (automatically deleted)
}, 65000);
```

**Example 4: Tests Pass**
```bash
# ✅ DONE: All tests pass
$ pnpm test

 ✓ test/models/Recipe.test.ts (8 tests) 432ms
   ✓ should create a valid recipe
   ✓ should throw error when enabling recipe without conditions
   ✓ should increment execution count
   ✓ findActiveByEvent returns only enabled recipes

 ✓ test/models/Setting.test.ts (7 tests) 385ms
 ✓ test/models/AutomationLog.test.ts (6 tests) 298ms
 ✓ test/models/Shop.test.ts (6 tests) 311ms
 ✓ test/integration/models.integration.test.ts (4 tests) 502ms

Test Files  5 passed (5)
     Tests  31 passed (31)
  Code Coverage  Recipe: 85% | Setting: 88% | AutomationLog: 82% | Shop: 84%
```

---

### ❌ NOT DONE Examples

**Example 1: Models Don't Work in Remix**
```typescript
// ❌ NOT DONE: Import fails
import Recipe from '~/models/Recipe';
// Error: Cannot find module '~/models/Recipe'

// ❌ NOT DONE: Model not registered
const recipes = await Recipe.find({ shop });
// Error: Model 'Recipe' has not been registered

// ❌ NOT DONE: TypeScript errors
const recipe: IRecipe = await Recipe.findOne({ shop });
// Error: Property 'stats' does not exist on type 'any'
```

**Example 2: Validation Doesn't Work**
```typescript
// ❌ NOT DONE: Can save invalid data
const recipe = await Recipe.create({
  shop: 'test.myshopify.com',
  enabled: true,
  conditions: [], // Should throw error but doesn't
  actions: []     // Should throw error but doesn't
});
console.log(recipe); // Saved successfully ❌

// ❌ NOT DONE: Can insert duplicate shops in Setting
await Setting.create({ shop: 'test.myshopify.com', /* ... */ });
await Setting.create({ shop: 'test.myshopify.com', /* ... */ });
// Both succeed (should throw duplicate key error) ❌
```

**Example 3: Encryption Not Working**
```typescript
// ❌ NOT DONE: Access token stored in plaintext
const setting = await Setting.create({
  shop: 'test.myshopify.com',
  accessToken: 'shpat_secret_token',
  // ...
});

const dbDoc = await Setting.collection.findOne({ shop: 'test.myshopify.com' });
console.log(dbDoc.accessToken); // "shpat_secret_token" ❌ (not encrypted!)
```

**Example 4: Indexes Missing**
```bash
# ❌ NOT DONE: Indexes not created
$ mongo
> use shopops
> db.recipes.getIndexes()
[
  { v: 2, key: { _id: 1 }, name: "_id_" }
]
# Missing compound indexes ❌

# ❌ NOT DONE: Queries do collection scan
> db.recipes.find({ shop: 'test.myshopify.com', enabled: true }).explain()
{
  "executionStats": {
    "executionStages": {
      "stage": "COLLSCAN"  // ❌ Should use index!
    }
  }
}
```

**Example 5: Tests Failing**
```bash
# ❌ NOT DONE: Tests fail
$ pnpm test

 ✓ test/models/Recipe.test.ts (5/8 tests passed)
   ✓ should create a valid recipe
   ✗ should throw error when enabling recipe without conditions
     Expected error but none was thrown
   ✗ should increment execution count
     TypeError: recipe.incrementExecutionCount is not a function

 ✗ test/models/Setting.test.ts (0/7 tests passed)
   ✗ All tests failing - model not found

Test Files  2/5 passed
     Tests  5/31 passed
  Code Coverage  Recipe: 45% | Setting: 0%

# Epic is NOT DONE ❌
```

**Example 6: Documentation Missing**
```markdown
# ❌ NOT DONE: No JSDoc comments
export interface IRecipe {
  shop: string; // No comment explaining what this is
  title: string;
  // ...
}

// ❌ NOT DONE: No schema diagram
# docs/schema-diagram.md does not exist

// ❌ NOT DONE: ARCHITECTURE.md not updated
## Current Implementation Status
### Phase 1: MVP (In Progress - 25% Complete)
- [ ] Data Models - Planned  // ❌ Should be marked complete
```

---

## 10. Notes and Considerations

### Encryption Key Management
**Critical Security Note:** The `ENCRYPTION_KEY` environment variable must be:
- Generated using cryptographically secure random number generator
- 32 bytes (64 hex characters) for AES-256
- Stored securely (never commit to git)
- Same key across all app instances (for decryption)
- Rotated periodically (requires re-encryption migration)

**Key Rotation Plan (Future Epic):**
When rotating encryption keys, create migration script:
1. Decrypt all access tokens with old key
2. Re-encrypt with new key
3. Update all Setting documents
4. Deploy new key to environment

### TTL Index Behavior
MongoDB's TTL monitor runs **every 60 seconds**, so logs won't delete immediately after expiration. For testing TTL functionality:
```javascript
// Force TTL monitor to run (MongoDB 4.4+)
db.adminCommand({ setParameter: 1, ttlMonitorSleepSecs: 1 });

// Create test document with past createdAt
db.automation_logs.insertOne({
  shop: 'test.myshopify.com',
  logType: 'system',
  severity: 'info',
  message: 'Test TTL',
  createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000) // 91 days ago
});

// Wait 65 seconds, then check if deleted
```

### Multi-Tenant Query Performance
**Always include `shop` field first in compound indexes:**
```javascript
// ✅ GOOD: shop first (supports multi-tenancy)
{ shop: 1, enabled: 1, category: 1 }

// ❌ BAD: shop not first (poor query performance)
{ enabled: 1, category: 1, shop: 1 }
```

MongoDB uses left-to-right index prefix matching. Queries must include `shop` to use the index efficiently.

### Mongoose Lean Queries
For read-only operations, use `.lean()` to return plain JavaScript objects (5-10x faster):
```typescript
// ✅ GOOD: Read-only query
const recipes = await Recipe.find({ shop }).lean();

// ❌ BAD: Full Mongoose document (unnecessary overhead)
const recipes = await Recipe.find({ shop });
```

Only omit `.lean()` when you need Mongoose methods (e.g., `recipe.save()`, `recipe.toggleEnabled()`).

### Atomic Updates for Stats
Use MongoDB atomic operators to prevent race conditions:
```typescript
// ✅ GOOD: Atomic update
await Recipe.updateOne(
  { _id: recipeId },
  {
    $inc: {
      'stats.executionCount': 1,
      'stats.successCount': 1
    },
    $set: { 'stats.lastExecutedAt': new Date() }
  }
);

// ❌ BAD: Read-modify-write (race condition)
const recipe = await Recipe.findById(recipeId);
recipe.stats.executionCount += 1;
await recipe.save(); // Another request could overwrite this
```

### Testing with Docker MongoDB
For testing, use Docker Compose MongoDB instance:
```bash
# Start MongoDB
docker-compose up -d mongodb

# Access MongoDB shell
docker-compose exec mongodb mongosh

# View collections
> use shopops
> show collections
> db.recipes.find().pretty()

# Check indexes
> db.recipes.getIndexes()
> db.automation_logs.getIndexes()

# Manually test TTL
> db.automation_logs.insertOne({
    shop: 'test.myshopify.com',
    logType: 'system',
    severity: 'info',
    message: 'TTL test',
    createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000)
  })
```

### Future Enhancements (Out of Scope)
These features will be implemented in later epics:
- **Data migrations:** Script to migrate existing data when schema changes
- **Soft deletes:** Add `deletedAt` field instead of hard deletes
- **Audit trail:** Track all changes to Recipe/Setting models
- **Schema versioning:** Version field for breaking changes
- **Custom validators:** More complex business rule validation
- **Virtual fields:** Computed properties (e.g., `recipe.isActive`)
- **Population:** Mongoose populate for recipe logs
- **Aggregations:** Complex stats queries using MongoDB aggregation pipeline

### Known Limitations
- **TTL precision:** Logs expire within 0-60 seconds of deadline (MongoDB monitor frequency)
- **Encryption performance:** AES-256-GCM adds ~1-2ms per encrypt/decrypt operation
- **Index storage:** Each compound index adds ~5-10% to collection size
- **Embedded documents:** Recipe conditions/actions cannot be queried efficiently as separate documents
- **No transactions:** Individual model operations are atomic, but cross-model updates are not

### Dependencies for Next Epic
This epic must be **100% complete** before starting:
- **Epic 1-007: Recipe Engine** - Depends on Recipe and AutomationLog models
- **Epic 1-008: BullMQ Job Queue** - Depends on all models for job payloads
- **Epic 1-009: Webhook Handlers** - Depends on Recipe, Shop, AutomationLog models

---

**Epic End**

---

## Appendix: Quick Reference

### Model Import Syntax
```typescript
// Import all models
import { Recipe, Setting, AutomationLog, Shop } from '~/models';

// Import individual model
import Recipe from '~/models/Recipe';

// Import types
import type { IRecipe, RecipeCategory } from '~/models/Recipe';
```

### Common Query Patterns
```typescript
// Find recipes for shop
const recipes = await Recipe.find({ shop }).lean();

// Find enabled recipes for webhook
const recipes = await Recipe.find({
  shop,
  enabled: true,
  'trigger.event': 'customers/update'
}).lean();

// Get setting for shop
const setting = await Setting.findOne({ shop });

// Create log entry
await AutomationLog.logRecipeExecution({
  shop,
  recipeId,
  recipeTitle,
  resourceType: 'customer',
  resourceId: 'gid://shopify/Customer/123',
  resourceTitle: 'John Doe',
  action: { type: 'addTag', params: { tag: 'VIP' }, result: 'success' },
  duration: 123
});

// Update shop last seen
const shop = await Shop.findOne({ shop });
await shop.updateLastSeen();
```

### Environment Variables
```bash
# .env
MONGODB_URL=mongodb://localhost:27017/shopops
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=your_64_char_hex_key_here  # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test Commands
```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test test/models/Recipe.test.ts

# Run tests with coverage
pnpm test --coverage

# Run tests in watch mode
pnpm test --watch
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-19
**Epic Status:** 🔵 Planned
**Estimated Completion:** Week of 2025-01-27

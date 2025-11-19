# Epic 1-007: Recipe Execution Engine

**Status:** 🔵 Planned
**Phase:** Phase 1 - MVP
**Priority:** P0 - Critical Path
**Estimated Complexity:** Large (6-10 days)
**Dependencies:** Epic 1-006 Complete (Mongoose Data Models)
**Blocks:** Epic 1-008 (BullMQ Job Queue), Epic 1-009 (Webhook Handlers)

---

## 1. Understanding (Objective, Scope, and Context)

### Objective
Build the core recipe execution engine that evaluates conditions against Shopify resource data and executes actions via the Shopify Admin GraphQL API. This is the heart of Shop-Ops Suite's automation capabilities.

### Scope

**In Scope:**
- Condition evaluator with JSONPath field access
- Support all operators: `>`, `<`, `=`, `!=`, `contains`, `starts_with`, `in`
- Logical operator support: `AND`, `OR` for multiple conditions
- Action executor for 4 action types:
  - `addTag` - Add tags to resources
  - `removeTag` - Remove tags from resources
  - `setMetafield` - Create/update metafields
  - `removeMetafield` - Delete metafields
- Recipe orchestrator (find → evaluate → execute → log)
- Error handling and retry logic for API failures
- Performance metrics tracking (execution duration)
- Integration with AutomationLog model
- GraphQL mutation builders for all actions
- Service layer architecture (`app/services/`)

**Out of Scope:**
- BullMQ job queue integration (deferred to Epic 1-008)
- Webhook handlers (deferred to Epic 1-009)
- Scheduled/cron-based recipe execution (Phase 2 feature)
- Advanced condition operators (regex, date comparisons) - Phase 2
- Bulk operations (defer to Phase 2)
- Custom JavaScript conditions (security risk, not planned)
- Frontend recipe builder UI (separate epic)

### Context

**Current State:**
- Recipe model exists with conditions and actions schema
- AutomationLog model ready for logging
- Shopify GraphQL Admin API configured (`admin.graphql()`)
- No service layer exists yet
- No condition evaluation logic
- No action execution logic

**Target State:**
- Service layer in `app/services/` with clear separation of concerns
- Recipe engine can evaluate any condition against resource data
- Recipe engine can execute any action via Shopify API
- All executions logged to AutomationLog
- Comprehensive error handling with detailed error messages
- Unit tests with 80%+ coverage
- Integration tests with real GraphQL mutations (mocked API)

**Why This Matters:**
- **Core value proposition:** Recipe engine IS the product - without it, app does nothing
- **Blocks all automation:** Webhook handlers and job queue depend on this engine
- **Data integrity:** Proper error handling prevents partial updates
- **User trust:** Detailed logs show exactly what happened and why
- **MVP delivery:** Cannot ship Phase 1 without working recipe execution

---

## 2. Planning (Architecture, Design Decisions, and Strategy)

### Architecture Overview

**Service Layer Structure:**
```
app/services/
├── recipeEngine/
│   ├── index.ts                    # Main orchestrator
│   ├── conditionEvaluator.ts       # Evaluate if/then conditions
│   ├── actionExecutor.ts           # Execute actions via GraphQL
│   ├── fieldAccessor.ts            # JSONPath field access
│   └── types.ts                    # Shared TypeScript types
│
├── shopify/
│   ├── graphql.ts                  # GraphQL mutation builders
│   ├── tags.ts                     # Tag operations
│   └── metafields.ts               # Metafield operations
│
└── logging/
    └── automationLogger.ts         # AutomationLog wrapper
```

**Recipe Execution Flow:**
```
1. Trigger Event (webhook payload received)
   ↓
2. Find Matching Recipes
   - Query: { shop, enabled: true, 'trigger.event': event }
   ↓
3. For Each Recipe:
   a. Evaluate Conditions
      - Extract field values from payload (JSONPath)
      - Apply operators (>, <, =, etc.)
      - Combine with logical operators (AND/OR)
      - Result: true/false
   b. If Conditions Match:
      - Execute Actions (in sequence)
      - GraphQL mutations via Shopify API
      - Handle errors/retries
   c. Log Execution
      - AutomationLog.logRecipeExecution()
      - Include success/failure, duration, error details
   ↓
4. Return Results
   - Summary: recipes evaluated, actions executed, errors
```

### Component Design

#### 2.1 Condition Evaluator

**Responsibility:** Evaluate recipe conditions against resource data

**Input:**
```typescript
{
  conditions: IRecipeCondition[],  // From Recipe model
  resourceData: any                // Webhook payload or GraphQL response
}
```

**Output:**
```typescript
{
  matches: boolean,
  evaluations: Array<{
    condition: IRecipeCondition,
    fieldValue: any,
    result: boolean,
    error?: string
  }>
}
```

**Algorithm:**
```typescript
1. Initialize result = true (for AND logic) or false (for OR logic)
2. For each condition:
   a. Extract field value using JSONPath
   b. Apply operator (>, <, =, contains, etc.)
   c. Combine with previous result using logicalOperator
3. Return final boolean result
```

**JSONPath Examples:**
- `total_spent` → Direct field access
- `addresses[0].city` → Nested array access
- `line_items[*].price` → All line item prices (array)
- `tags` → Array field (for 'contains' operator)

#### 2.2 Action Executor

**Responsibility:** Execute recipe actions via Shopify GraphQL API

**Supported Actions:**

**1. Add Tag**
```graphql
mutation tagsAdd($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) {
    node { id }
    userErrors { field message }
  }
}
```

**2. Remove Tag**
```graphql
mutation tagsRemove($id: ID!, $tags: [String!]!) {
  tagsRemove(id: $id, tags: $tags) {
    node { id }
    userErrors { field message }
  }
}
```

**3. Set Metafield**
```graphql
mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id namespace key value }
    userErrors { field message }
  }
}
```

**4. Remove Metafield**
```graphql
mutation metafieldDelete($input: MetafieldDeleteInput!) {
  metafieldDelete(input: $input) {
    deletedId
    userErrors { field message }
  }
}
```

**Error Handling:**
- Detect `userErrors` in GraphQL response
- Retry on rate limit errors (429)
- Log all errors to AutomationLog
- Continue execution even if one action fails (fail gracefully)

#### 2.3 Recipe Orchestrator

**Responsibility:** High-level coordination of recipe execution

**Public API:**
```typescript
class RecipeEngine {
  /**
   * Execute all matching recipes for a webhook event
   */
  async executeForWebhook(params: {
    shop: string;
    event: string;           // e.g., "customers/update"
    resourceId: string;      // Shopify GID
    resourceData: any;       // Webhook payload
    admin: AdminApiContext;  // Shopify API client
  }): Promise<ExecutionSummary>

  /**
   * Execute a single recipe (for manual testing)
   */
  async executeSingleRecipe(params: {
    recipeId: string;
    resourceId: string;
    resourceData: any;
    admin: AdminApiContext;
  }): Promise<ExecutionResult>

  /**
   * Preview recipe execution (dry run, no mutations)
   */
  async previewRecipe(params: {
    recipeId: string;
    resourceData: any;
  }): Promise<PreviewResult>
}
```

**Execution Summary:**
```typescript
interface ExecutionSummary {
  recipesEvaluated: number;
  recipesMatched: number;
  actionsExecuted: number;
  errors: Array<{
    recipeId: string;
    recipeTitle: string;
    error: string;
  }>;
  duration: number;  // Total execution time in ms
}
```

### Design Decisions

**Decision 1: JSONPath Library**
- **Choice:** Use `jsonpath-plus` library for field access
- **Rationale:**
  - Mature library with excellent TypeScript support
  - Handles nested objects, arrays, wildcards
  - More powerful than manual dot notation parsing
  - Supports complex queries like `$.line_items[?(@.price > 100)]`
- **Trade-off:** External dependency, but worth it for robustness
- **Alternative considered:** Manual field parsing - too error-prone

**Decision 2: Sequential Action Execution**
- **Choice:** Execute actions in sequence (not parallel)
- **Rationale:**
  - Shopify API rate limits (50 points/second)
  - Actions may have dependencies (e.g., tag then metafield)
  - Easier to debug (clear execution order)
  - Simpler error handling
- **Trade-off:** Slower execution, but typical recipe has 1-3 actions
- **Future optimization:** Parallel execution for independent actions (Phase 2)

**Decision 3: Fail Gracefully on Action Errors**
- **Choice:** Continue executing remaining actions even if one fails
- **Rationale:**
  - Partial success better than total failure
  - User can see which actions succeeded in logs
  - Shopify API errors may be transient
- **Trade-off:** More complex error handling
- **Implementation:** Log each action result individually

**Decision 4: No Transaction Support**
- **Choice:** Do not implement rollback for failed actions
- **Rationale:**
  - Shopify API doesn't support transactions
  - Rollback would require inverse operations (complex, error-prone)
  - Logs provide visibility into partial executions
  - User can manually fix issues or disable recipe
- **Trade-off:** Potential inconsistent state, mitigated by logs and monitoring

**Decision 5: Dry Run Mode for Previews**
- **Choice:** Implement preview mode that evaluates conditions without executing actions
- **Rationale:**
  - Users want to test recipes before enabling
  - Shows which resources would be affected
  - No API calls needed (free preview)
  - Builds user confidence
- **Implementation:** Same evaluation logic, skip GraphQL mutations

**Decision 6: Resource Type Detection**
- **Choice:** Infer resource type from Shopify GID format
- **Rationale:**
  - GID format: `gid://shopify/Customer/123456` (type is "Customer")
  - Eliminates need to pass resource type separately
  - Works for all Shopify resources
- **Implementation:** Regex extraction: `/gid:\/\/shopify\/(\w+)\//`

### Error Handling Strategy

**Error Categories:**

1. **Validation Errors** (Pre-execution)
   - Recipe has no conditions/actions
   - Invalid JSONPath in condition
   - Missing required action params
   - Action: Skip recipe, log error

2. **Evaluation Errors** (During condition check)
   - Field not found in resource data
   - Type mismatch (comparing string to number)
   - Invalid operator for field type
   - Action: Treat condition as false, log warning

3. **API Errors** (During action execution)
   - GraphQL `userErrors` (invalid input)
   - Rate limit errors (429)
   - Network errors (timeout, connection)
   - Action: Retry (max 3 attempts), then log failure

4. **System Errors** (Unexpected)
   - MongoDB connection lost
   - Out of memory
   - Uncaught exceptions
   - Action: Catch, log, fail gracefully

**Retry Logic:**
```typescript
async function executeWithRetry(
  fn: () => Promise<any>,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Retry on rate limit or network errors
      if (isRetryable(error)) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await sleep(delay);
        continue;
      }

      // Don't retry validation errors
      throw error;
    }
  }

  throw lastError;
}

function isRetryable(error: any): boolean {
  return (
    error.message?.includes('rate limit') ||
    error.message?.includes('timeout') ||
    error.code === 'ECONNRESET'
  );
}
```

### Performance Considerations

**Optimization 1: Lean Queries**
```typescript
// ✅ GOOD: Fetch only enabled recipes
const recipes = await Recipe.find({
  shop,
  enabled: true,
  'trigger.event': event
}).lean();
```

**Optimization 2: Early Exit**
```typescript
// ✅ GOOD: Stop evaluating conditions on first failure (AND logic)
for (const condition of conditions) {
  if (!evaluate(condition)) {
    return false; // No need to check remaining conditions
  }
}
```

**Optimization 3: GraphQL Field Selection**
```typescript
// ✅ GOOD: Only request fields we need
const query = `
  query getCustomer($id: ID!) {
    customer(id: $id) {
      id
      tags
      metafields(first: 10) { edges { node { id namespace key } } }
    }
  }
`;

// ❌ BAD: Fetch entire resource (wasteful)
```

**Optimization 4: Batch Mutations**
```typescript
// Future optimization (Phase 2)
// Instead of 3 separate mutations for 3 tags:
tagsAdd(id: $id, tags: ["VIP", "Loyal", "Premium"])

// Instead of:
tagsAdd(id: $id, tags: ["VIP"])
tagsAdd(id: $id, tags: ["Loyal"])
tagsAdd(id: $id, tags: ["Premium"])
```

**Expected Performance:**
- **Simple recipe** (1 condition, 1 action): ~200-500ms
- **Complex recipe** (5 conditions, 3 actions): ~800-1200ms
- **10 recipes evaluated**: ~2-5 seconds
- **Bottleneck:** Shopify GraphQL API latency (100-300ms per request)

---

## 3. Breakdown (Detailed Task List with Acceptance Criteria)

### 3.1 Field Accessor Implementation

#### Task 3.1.1: Install JSONPath Library
**File:** `package.json`

**Description:**
Install `jsonpath-plus` library for JSONPath field access.

**Acceptance Criteria:**
- [ ] `jsonpath-plus` added to dependencies
- [ ] Package installed via `pnpm install`
- [ ] TypeScript types available (@types/jsonpath-plus)

**Implementation:**
```bash
pnpm add jsonpath-plus
pnpm add -D @types/jsonpath-plus
```

**Definition of Done:**
- Can import: `import { JSONPath } from 'jsonpath-plus'`
- TypeScript autocomplete works

---

#### Task 3.1.2: Create Field Accessor Module
**File:** `app/services/recipeEngine/fieldAccessor.ts`

**Description:**
Create module for extracting field values from resource data using JSONPath.

**Acceptance Criteria:**
- [ ] Function `getFieldValue(data, path)` implemented
- [ ] Handles nested objects and arrays
- [ ] Returns `undefined` for non-existent fields (no errors)
- [ ] TypeScript types defined
- [ ] Unit tests cover edge cases

**Implementation:**
```typescript
import { JSONPath } from 'jsonpath-plus';

/**
 * Extract field value from resource data using JSONPath.
 *
 * @param data - Resource data (webhook payload or GraphQL response)
 * @param path - JSONPath expression (e.g., "total_spent", "addresses[0].city")
 * @returns Field value or undefined if not found
 *
 * @example
 * const customer = { total_spent: 1500, tags: ["VIP", "Loyal"] };
 * getFieldValue(customer, "total_spent") // 1500
 * getFieldValue(customer, "tags") // ["VIP", "Loyal"]
 * getFieldValue(customer, "invalid") // undefined
 */
export function getFieldValue(data: any, path: string): any {
  try {
    // Normalize path (add $ prefix if missing)
    const normalizedPath = path.startsWith('$') ? path : `$.${path}`;

    const result = JSONPath({
      path: normalizedPath,
      json: data,
      wrap: false
    });

    return result;
  } catch (error) {
    // Invalid JSONPath expression
    console.warn(`Failed to extract field "${path}":`, error);
    return undefined;
  }
}

/**
 * Check if a field exists in resource data.
 */
export function hasField(data: any, path: string): boolean {
  return getFieldValue(data, path) !== undefined;
}
```

**Definition of Done:**
- Function works for nested fields
- Returns undefined for missing fields (doesn't throw)
- Tests pass

---

### 3.2 Condition Evaluator Implementation

#### Task 3.2.1: Create Condition Evaluator Module
**File:** `app/services/recipeEngine/conditionEvaluator.ts`

**Description:**
Implement condition evaluation logic with support for all operators.

**Acceptance Criteria:**
- [ ] Function `evaluateCondition(condition, data)` implemented
- [ ] All operators supported: `>`, `<`, `=`, `!=`, `contains`, `starts_with`, `in`
- [ ] Type-aware comparisons (number vs string)
- [ ] Array operations for `contains` and `in`
- [ ] Returns boolean result
- [ ] Unit tests for all operators

**Implementation:**
```typescript
import type { IRecipeCondition } from '~/models/Recipe';
import { getFieldValue } from './fieldAccessor';

/**
 * Evaluate a single condition against resource data.
 *
 * @param condition - Recipe condition (field, operator, value)
 * @param resourceData - Resource data to evaluate against
 * @returns true if condition matches, false otherwise
 */
export function evaluateCondition(
  condition: IRecipeCondition,
  resourceData: any
): boolean {
  const fieldValue = getFieldValue(resourceData, condition.field);

  // Field not found - condition fails
  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  const { operator, value } = condition;

  switch (operator) {
    case '>':
      return Number(fieldValue) > Number(value);

    case '<':
      return Number(fieldValue) < Number(value);

    case '=':
      return fieldValue == value; // Loose equality (handles type coercion)

    case '!=':
      return fieldValue != value;

    case 'contains':
      // For arrays: check if value is in array
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      // For strings: check if substring exists
      return String(fieldValue).includes(String(value));

    case 'starts_with':
      return String(fieldValue).startsWith(String(value));

    case 'in':
      // Check if fieldValue is in the value array
      if (!Array.isArray(value)) {
        console.warn('Operator "in" requires array value');
        return false;
      }
      return value.includes(fieldValue);

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Evaluation result for a single condition.
 */
export interface ConditionEvaluation {
  condition: IRecipeCondition;
  fieldValue: any;
  result: boolean;
  error?: string;
}

/**
 * Evaluate all conditions with AND/OR logic.
 *
 * @param conditions - Array of recipe conditions
 * @param resourceData - Resource data to evaluate against
 * @returns Evaluation result with detailed breakdown
 */
export function evaluateConditions(
  conditions: IRecipeCondition[],
  resourceData: any
): {
  matches: boolean;
  evaluations: ConditionEvaluation[];
} {
  const evaluations: ConditionEvaluation[] = [];

  // Default to AND logic for first condition
  let matches = true;

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const fieldValue = getFieldValue(resourceData, condition.field);

    let result: boolean;
    let error: string | undefined;

    try {
      result = evaluateCondition(condition, resourceData);
    } catch (err) {
      result = false;
      error = err instanceof Error ? err.message : String(err);
    }

    evaluations.push({
      condition,
      fieldValue,
      result,
      error
    });

    // Combine with previous result using logical operator
    const logicalOp = condition.logicalOperator || 'AND';

    if (logicalOp === 'AND') {
      matches = matches && result;
    } else if (logicalOp === 'OR') {
      matches = matches || result;
    }
  }

  return { matches, evaluations };
}
```

**Definition of Done:**
- All operators work correctly
- AND/OR logic implemented
- Tests cover all operators and edge cases

---

### 3.3 Shopify GraphQL Mutation Builders

#### Task 3.3.1: Create Tags Service
**File:** `app/services/shopify/tags.ts`

**Description:**
Create service for tag operations via GraphQL mutations.

**Acceptance Criteria:**
- [ ] Function `addTags(admin, resourceId, tags)` implemented
- [ ] Function `removeTags(admin, resourceId, tags)` implemented
- [ ] GraphQL mutations use typed responses
- [ ] Error handling for `userErrors`
- [ ] Unit tests with mocked admin.graphql

**Implementation:**
```typescript
import type { AdminApiContext } from '@shopify/shopify-app-remix/server';

/**
 * Add tags to a Shopify resource.
 *
 * @param admin - Shopify Admin API context
 * @param resourceId - Shopify GID (e.g., "gid://shopify/Customer/123")
 * @param tags - Array of tags to add
 * @returns Success status and any errors
 */
export async function addTags(
  admin: AdminApiContext,
  resourceId: string,
  tags: string[]
): Promise<{ success: boolean; errors?: string[] }> {
  const response = await admin.graphql(
    `#graphql
      mutation tagsAdd($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          node { id }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        id: resourceId,
        tags
      }
    }
  );

  const data = await response.json();
  const result = data.data?.tagsAdd;

  if (result?.userErrors?.length > 0) {
    return {
      success: false,
      errors: result.userErrors.map((e: any) => e.message)
    };
  }

  return { success: true };
}

/**
 * Remove tags from a Shopify resource.
 */
export async function removeTags(
  admin: AdminApiContext,
  resourceId: string,
  tags: string[]
): Promise<{ success: boolean; errors?: string[] }> {
  const response = await admin.graphql(
    `#graphql
      mutation tagsRemove($id: ID!, $tags: [String!]!) {
        tagsRemove(id: $id, tags: $tags) {
          node { id }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        id: resourceId,
        tags
      }
    }
  );

  const data = await response.json();
  const result = data.data?.tagsRemove;

  if (result?.userErrors?.length > 0) {
    return {
      success: false,
      errors: result.userErrors.map((e: any) => e.message)
    };
  }

  return { success: true };
}
```

**Definition of Done:**
- Both functions work with mocked API
- Error handling tested
- TypeScript types correct

---

#### Task 3.3.2: Create Metafields Service
**File:** `app/services/shopify/metafields.ts`

**Description:**
Create service for metafield operations via GraphQL mutations.

**Acceptance Criteria:**
- [ ] Function `setMetafield(admin, resourceId, metafield)` implemented
- [ ] Function `removeMetafield(admin, metafieldId)` implemented
- [ ] Support all value types: string, integer, json
- [ ] Error handling for `userErrors`
- [ ] Unit tests with mocked admin.graphql

**Implementation:**
```typescript
import type { AdminApiContext } from '@shopify/shopify-app-remix/server';

export interface MetafieldInput {
  namespace: string;
  key: string;
  value: string;
  valueType: 'string' | 'integer' | 'json';
}

/**
 * Set a metafield on a Shopify resource.
 *
 * @param admin - Shopify Admin API context
 * @param resourceId - Shopify GID
 * @param metafield - Metafield data (namespace, key, value, type)
 * @returns Success status and any errors
 */
export async function setMetafield(
  admin: AdminApiContext,
  resourceId: string,
  metafield: MetafieldInput
): Promise<{ success: boolean; errors?: string[] }> {
  const response = await admin.graphql(
    `#graphql
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
    `,
    {
      variables: {
        metafields: [
          {
            ownerId: resourceId,
            namespace: metafield.namespace,
            key: metafield.key,
            value: metafield.value,
            type: metafield.valueType
          }
        ]
      }
    }
  );

  const data = await response.json();
  const result = data.data?.metafieldsSet;

  if (result?.userErrors?.length > 0) {
    return {
      success: false,
      errors: result.userErrors.map((e: any) => e.message)
    };
  }

  return { success: true };
}

/**
 * Remove a metafield from a Shopify resource.
 *
 * Note: Requires metafield ID, not just namespace/key.
 * You may need to query the metafield first to get its ID.
 */
export async function removeMetafield(
  admin: AdminApiContext,
  metafieldId: string
): Promise<{ success: boolean; errors?: string[] }> {
  const response = await admin.graphql(
    `#graphql
      mutation metafieldDelete($input: MetafieldDeleteInput!) {
        metafieldDelete(input: $input) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        input: { id: metafieldId }
      }
    }
  );

  const data = await response.json();
  const result = data.data?.metafieldDelete;

  if (result?.userErrors?.length > 0) {
    return {
      success: false,
      errors: result.userErrors.map((e: any) => e.message)
    };
  }

  return { success: true };
}

/**
 * Query metafield ID by namespace and key (helper for removeMetafield).
 */
export async function getMetafieldId(
  admin: AdminApiContext,
  resourceId: string,
  namespace: string,
  key: string
): Promise<string | null> {
  const response = await admin.graphql(
    `#graphql
      query getMetafield($id: ID!, $namespace: String!, $key: String!) {
        node(id: $id) {
          ... on HasMetafields {
            metafield(namespace: $namespace, key: $key) {
              id
            }
          }
        }
      }
    `,
    {
      variables: {
        id: resourceId,
        namespace,
        key
      }
    }
  );

  const data = await response.json();
  return data.data?.node?.metafield?.id || null;
}
```

**Definition of Done:**
- Set and remove metafield work
- Helper function to query metafield ID works
- Tests pass

---

### 3.4 Action Executor Implementation

#### Task 3.4.1: Create Action Executor Module
**File:** `app/services/recipeEngine/actionExecutor.ts`

**Description:**
Implement action execution logic that dispatches to appropriate Shopify services.

**Acceptance Criteria:**
- [ ] Function `executeAction(action, resourceId, admin)` implemented
- [ ] Dispatches to correct service based on action type
- [ ] Handles all 4 action types: addTag, removeTag, setMetafield, removeMetafield
- [ ] Returns execution result with success/failure status
- [ ] Error handling and retry logic
- [ ] Unit tests with mocked Shopify services

**Implementation:**
```typescript
import type { AdminApiContext } from '@shopify/shopify-app-remix/server';
import type { IRecipeAction } from '~/models/Recipe';
import { addTags, removeTags } from '~/services/shopify/tags';
import { setMetafield, removeMetafield, getMetafieldId } from '~/services/shopify/metafields';

export interface ActionExecutionResult {
  action: IRecipeAction;
  success: boolean;
  error?: string;
  duration: number; // Execution time in ms
}

/**
 * Execute a single recipe action via Shopify GraphQL API.
 *
 * @param action - Recipe action to execute
 * @param resourceId - Shopify GID of target resource
 * @param admin - Shopify Admin API context
 * @returns Execution result with success status and timing
 */
export async function executeAction(
  action: IRecipeAction,
  resourceId: string,
  admin: AdminApiContext
): Promise<ActionExecutionResult> {
  const startTime = Date.now();

  try {
    let result: { success: boolean; errors?: string[] };

    switch (action.type) {
      case 'addTag':
        if (!action.params.tag) {
          throw new Error('Missing required parameter: tag');
        }
        result = await addTags(admin, resourceId, [action.params.tag]);
        break;

      case 'removeTag':
        if (!action.params.tag) {
          throw new Error('Missing required parameter: tag');
        }
        result = await removeTags(admin, resourceId, [action.params.tag]);
        break;

      case 'setMetafield':
        if (!action.params.namespace || !action.params.key || !action.params.value) {
          throw new Error('Missing required parameters: namespace, key, value');
        }
        result = await setMetafield(admin, resourceId, {
          namespace: action.params.namespace,
          key: action.params.key,
          value: action.params.value,
          valueType: action.params.valueType || 'string'
        });
        break;

      case 'removeMetafield':
        if (!action.params.namespace || !action.params.key) {
          throw new Error('Missing required parameters: namespace, key');
        }
        // First, get metafield ID
        const metafieldId = await getMetafieldId(
          admin,
          resourceId,
          action.params.namespace,
          action.params.key
        );

        if (!metafieldId) {
          // Metafield doesn't exist - not an error, just skip
          result = { success: true };
        } else {
          result = await removeMetafield(admin, metafieldId);
        }
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    const duration = Date.now() - startTime;

    if (!result.success) {
      return {
        action,
        success: false,
        error: result.errors?.join(', '),
        duration
      };
    }

    return {
      action,
      success: true,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration
    };
  }
}

/**
 * Execute multiple actions in sequence.
 *
 * Continues executing even if one action fails (fail gracefully).
 */
export async function executeActions(
  actions: IRecipeAction[],
  resourceId: string,
  admin: AdminApiContext
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    const result = await executeAction(action, resourceId, admin);
    results.push(result);

    // Continue even if action failed (fail gracefully)
    if (!result.success) {
      console.warn(`Action failed but continuing:`, result.error);
    }
  }

  return results;
}
```

**Definition of Done:**
- All action types execute correctly
- Error handling works
- Graceful failure (continues on error)
- Tests pass

---

### 3.5 Automation Logger Service

#### Task 3.5.1: Create Automation Logger Service
**File:** `app/services/logging/automationLogger.ts`

**Description:**
Create wrapper service for AutomationLog model with convenience methods.

**Acceptance Criteria:**
- [ ] Function `logRecipeExecution(params)` wraps AutomationLog.logRecipeExecution
- [ ] Function `logError(shop, message, metadata)` wraps AutomationLog.logError
- [ ] Additional helper: `logRecipeEvaluation(recipe, matched, evaluations)`
- [ ] TypeScript types for all parameters
- [ ] Unit tests

**Implementation:**
```typescript
import { AutomationLog, ActionResult } from '~/models/AutomationLog';
import type { IRecipe } from '~/models/Recipe';
import type { ActionExecutionResult } from '~/services/recipeEngine/actionExecutor';
import type { ConditionEvaluation } from '~/services/recipeEngine/conditionEvaluator';
import mongoose from 'mongoose';

/**
 * Log a recipe execution with all action results.
 */
export async function logRecipeExecution(params: {
  shop: string;
  recipe: IRecipe;
  resourceId: string;
  resourceTitle: string;
  resourceType: string;
  conditionsMatched: boolean;
  actionResults: ActionExecutionResult[];
  duration: number;
}): Promise<void> {
  const {
    shop,
    recipe,
    resourceId,
    resourceTitle,
    resourceType,
    conditionsMatched,
    actionResults,
    duration
  } = params;

  // Log overall recipe execution
  const allSucceeded = actionResults.every(r => r.success);
  const overallResult = conditionsMatched
    ? (allSucceeded ? ActionResult.SUCCESS : ActionResult.FAILURE)
    : ActionResult.SKIPPED;

  await AutomationLog.logRecipeExecution({
    shop,
    recipeId: recipe._id as mongoose.Types.ObjectId,
    recipeTitle: recipe.title,
    resourceType,
    resourceId,
    resourceTitle,
    action: {
      type: 'recipe_execution',
      params: {
        conditionsMatched,
        actionsExecuted: actionResults.length
      },
      result: overallResult,
      errorMessage: actionResults
        .filter(r => !r.success)
        .map(r => r.error)
        .join('; ')
    },
    duration
  });

  // Log each individual action result
  for (const actionResult of actionResults) {
    await AutomationLog.create({
      shop,
      logType: 'recipe_execution',
      severity: actionResult.success ? 'info' : 'error',
      recipeId: recipe._id,
      recipeTitle: recipe.title,
      resourceType,
      resourceId,
      resourceTitle,
      action: {
        type: actionResult.action.type,
        params: actionResult.action.params,
        result: actionResult.success ? ActionResult.SUCCESS : ActionResult.FAILURE,
        errorMessage: actionResult.error
      },
      message: `Action "${actionResult.action.type}" ${actionResult.success ? 'succeeded' : 'failed'} for ${resourceType} ${resourceId}`,
      duration: actionResult.duration
    });
  }
}

/**
 * Log recipe evaluation (for preview/dry-run mode).
 */
export async function logRecipeEvaluation(params: {
  shop: string;
  recipe: IRecipe;
  resourceId: string;
  matched: boolean;
  evaluations: ConditionEvaluation[];
}): Promise<void> {
  const { shop, recipe, resourceId, matched, evaluations } = params;

  await AutomationLog.create({
    shop,
    logType: 'system',
    severity: 'info',
    recipeId: recipe._id,
    recipeTitle: recipe.title,
    message: `Recipe evaluation: ${matched ? 'MATCHED' : 'NOT MATCHED'} for resource ${resourceId}`,
    metadata: {
      evaluations: evaluations.map(e => ({
        field: e.condition.field,
        operator: e.condition.operator,
        expectedValue: e.condition.value,
        actualValue: e.fieldValue,
        result: e.result
      }))
    }
  });
}

/**
 * Log error during recipe execution.
 */
export async function logExecutionError(
  shop: string,
  recipe: IRecipe,
  error: Error,
  metadata?: Record<string, any>
): Promise<void> {
  await AutomationLog.logError(shop, `Recipe execution failed: ${error.message}`, {
    recipeId: recipe._id,
    recipeTitle: recipe.title,
    errorStack: error.stack,
    ...metadata
  });
}
```

**Definition of Done:**
- All logging functions work
- Logs created in MongoDB
- Tests pass

---

### 3.6 Recipe Engine Orchestrator

#### Task 3.6.1: Create Recipe Engine Main Module
**File:** `app/services/recipeEngine/index.ts`

**Description:**
Create main Recipe Engine class that orchestrates the entire execution flow.

**Acceptance Criteria:**
- [ ] Class `RecipeEngine` with public API methods
- [ ] Method: `executeForWebhook(params)` - main execution entry point
- [ ] Method: `executeSingleRecipe(params)` - execute one recipe
- [ ] Method: `previewRecipe(params)` - dry run mode
- [ ] Integration with all sub-modules (evaluator, executor, logger)
- [ ] Comprehensive error handling
- [ ] Performance tracking (execution duration)
- [ ] Unit and integration tests

**Implementation:**
```typescript
import type { AdminApiContext } from '@shopify/shopify-app-remix/server';
import Recipe, { type IRecipe } from '~/models/Recipe';
import { connectToMongoDB } from '~/mongoose.server';
import { evaluateConditions } from './conditionEvaluator';
import { executeActions } from './actionExecutor';
import { logRecipeExecution, logRecipeEvaluation, logExecutionError } from '~/services/logging/automationLogger';

export interface ExecuteForWebhookParams {
  shop: string;
  event: string;          // e.g., "customers/update"
  resourceId: string;     // Shopify GID
  resourceData: any;      // Webhook payload
  admin: AdminApiContext;
}

export interface ExecutionSummary {
  recipesEvaluated: number;
  recipesMatched: number;
  actionsExecuted: number;
  errors: Array<{
    recipeId: string;
    recipeTitle: string;
    error: string;
  }>;
  duration: number;
}

export interface ExecutionResult {
  recipe: IRecipe;
  conditionsMatched: boolean;
  actionsExecuted: number;
  success: boolean;
  errors: string[];
  duration: number;
}

export interface PreviewResult {
  conditionsMatched: boolean;
  evaluations: any[];
  actionsToExecute: any[];
}

/**
 * Recipe Execution Engine
 *
 * Core service for evaluating recipe conditions and executing actions.
 */
export class RecipeEngine {
  /**
   * Execute all matching recipes for a webhook event.
   *
   * This is the main entry point called by webhook handlers.
   */
  async executeForWebhook(params: ExecuteForWebhookParams): Promise<ExecutionSummary> {
    const startTime = Date.now();
    const { shop, event, resourceId, resourceData, admin } = params;

    await connectToMongoDB();

    // Find all enabled recipes for this event
    const recipes = await Recipe.find({
      shop,
      enabled: true,
      'trigger.event': event
    }).lean();

    const summary: ExecutionSummary = {
      recipesEvaluated: recipes.length,
      recipesMatched: 0,
      actionsExecuted: 0,
      errors: [],
      duration: 0
    };

    // Execute each recipe
    for (const recipe of recipes) {
      try {
        const result = await this.executeSingleRecipe({
          recipe: recipe as IRecipe,
          resourceId,
          resourceData,
          admin
        });

        if (result.conditionsMatched) {
          summary.recipesMatched++;
          summary.actionsExecuted += result.actionsExecuted;
        }

        if (!result.success) {
          summary.errors.push({
            recipeId: recipe._id.toString(),
            recipeTitle: recipe.title,
            error: result.errors.join('; ')
          });
        }

      } catch (error) {
        summary.errors.push({
          recipeId: recipe._id.toString(),
          recipeTitle: recipe.title,
          error: error instanceof Error ? error.message : String(error)
        });

        // Log error
        await logExecutionError(shop, recipe as IRecipe, error as Error, {
          resourceId,
          event
        });
      }
    }

    summary.duration = Date.now() - startTime;
    return summary;
  }

  /**
   * Execute a single recipe (for manual testing or direct invocation).
   */
  async executeSingleRecipe(params: {
    recipe: IRecipe;
    resourceId: string;
    resourceData: any;
    admin: AdminApiContext;
  }): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { recipe, resourceId, resourceData, admin } = params;

    // 1. Evaluate conditions
    const evaluation = evaluateConditions(recipe.conditions, resourceData);

    // Extract resource type from GID (e.g., "gid://shopify/Customer/123" -> "Customer")
    const resourceType = this.extractResourceType(resourceId);
    const resourceTitle = this.extractResourceTitle(resourceData, resourceType);

    // 2. If conditions don't match, skip execution
    if (!evaluation.matches) {
      const duration = Date.now() - startTime;

      // Log evaluation (for audit trail)
      await logRecipeEvaluation({
        shop: recipe.shop,
        recipe,
        resourceId,
        matched: false,
        evaluations: evaluation.evaluations
      });

      return {
        recipe,
        conditionsMatched: false,
        actionsExecuted: 0,
        success: true,
        errors: [],
        duration
      };
    }

    // 3. Execute actions
    const actionResults = await executeActions(recipe.actions, resourceId, admin);

    const duration = Date.now() - startTime;

    // 4. Log execution
    await logRecipeExecution({
      shop: recipe.shop,
      recipe,
      resourceId,
      resourceTitle,
      resourceType,
      conditionsMatched: true,
      actionResults,
      duration
    });

    // 5. Update recipe stats
    const allSucceeded = actionResults.every(r => r.success);
    await Recipe.updateOne(
      { _id: recipe._id },
      {
        $inc: {
          'stats.executionCount': 1,
          'stats.successCount': allSucceeded ? 1 : 0,
          'stats.errorCount': allSucceeded ? 0 : 1
        },
        $set: {
          'stats.lastExecutedAt': new Date()
        }
      }
    );

    return {
      recipe,
      conditionsMatched: true,
      actionsExecuted: actionResults.length,
      success: allSucceeded,
      errors: actionResults.filter(r => !r.success).map(r => r.error || 'Unknown error'),
      duration
    };
  }

  /**
   * Preview recipe execution (dry run - no mutations).
   *
   * Useful for testing recipes before enabling them.
   */
  async previewRecipe(params: {
    recipe: IRecipe;
    resourceData: any;
  }): Promise<PreviewResult> {
    const { recipe, resourceData } = params;

    // Evaluate conditions
    const evaluation = evaluateConditions(recipe.conditions, resourceData);

    return {
      conditionsMatched: evaluation.matches,
      evaluations: evaluation.evaluations,
      actionsToExecute: evaluation.matches ? recipe.actions : []
    };
  }

  /**
   * Extract resource type from Shopify GID.
   *
   * @example "gid://shopify/Customer/123" -> "Customer"
   */
  private extractResourceType(gid: string): string {
    const match = gid.match(/gid:\/\/shopify\/(\w+)\//);
    return match ? match[1].toLowerCase() : 'unknown';
  }

  /**
   * Extract resource display name from data.
   */
  private extractResourceTitle(data: any, resourceType: string): string {
    // Try common title fields
    return (
      data.title ||
      data.name ||
      data.displayName ||
      `${resourceType} ${data.id || 'unknown'}`
    );
  }
}

// Export singleton instance
export const recipeEngine = new RecipeEngine();
```

**Definition of Done:**
- All methods work correctly
- Integration between all sub-modules works
- Stats update atomically
- Tests pass

---

#### Task 3.6.2: Create Recipe Engine Types
**File:** `app/services/recipeEngine/types.ts`

**Description:**
Define shared TypeScript types for recipe engine.

**Acceptance Criteria:**
- [ ] All interfaces exported
- [ ] Types match function signatures
- [ ] JSDoc comments on all types

**Implementation:**
```typescript
import type { IRecipe, IRecipeCondition, IRecipeAction } from '~/models/Recipe';
import type { AdminApiContext } from '@shopify/shopify-app-remix/server';

export interface ExecuteForWebhookParams {
  shop: string;
  event: string;
  resourceId: string;
  resourceData: any;
  admin: AdminApiContext;
}

export interface ExecutionSummary {
  recipesEvaluated: number;
  recipesMatched: number;
  actionsExecuted: number;
  errors: Array<{
    recipeId: string;
    recipeTitle: string;
    error: string;
  }>;
  duration: number;
}

export interface ExecutionResult {
  recipe: IRecipe;
  conditionsMatched: boolean;
  actionsExecuted: number;
  success: boolean;
  errors: string[];
  duration: number;
}

export interface PreviewResult {
  conditionsMatched: boolean;
  evaluations: ConditionEvaluation[];
  actionsToExecute: IRecipeAction[];
}

export interface ConditionEvaluation {
  condition: IRecipeCondition;
  fieldValue: any;
  result: boolean;
  error?: string;
}

export interface ActionExecutionResult {
  action: IRecipeAction;
  success: boolean;
  error?: string;
  duration: number;
}
```

**Definition of Done:**
- All types defined
- Can be imported

---

### 3.7 Testing Tasks

#### Task 3.7.1: Write Field Accessor Tests
**File:** `test/services/recipeEngine/fieldAccessor.test.ts`

**Description:**
Unit tests for field accessor module.

**Acceptance Criteria:**
- [ ] Test: Extract top-level field
- [ ] Test: Extract nested field
- [ ] Test: Extract array field
- [ ] Test: Extract array element by index
- [ ] Test: Non-existent field returns undefined
- [ ] Test: Invalid JSONPath returns undefined (no errors)
- [ ] Code coverage >80%

**Definition of Done:**
- All tests pass
- Edge cases covered

---

#### Task 3.7.2: Write Condition Evaluator Tests
**File:** `test/services/recipeEngine/conditionEvaluator.test.ts`

**Description:**
Unit tests for condition evaluator.

**Acceptance Criteria:**
- [ ] Test all operators: `>`, `<`, `=`, `!=`, `contains`, `starts_with`, `in`
- [ ] Test AND logic (all conditions must pass)
- [ ] Test OR logic (any condition passes)
- [ ] Test mixed AND/OR logic
- [ ] Test missing field (condition fails)
- [ ] Test type coercion (string "123" == number 123)
- [ ] Code coverage >80%

**Definition of Done:**
- All tests pass
- All operators verified

---

#### Task 3.7.3: Write Action Executor Tests
**File:** `test/services/recipeEngine/actionExecutor.test.ts`

**Description:**
Unit tests for action executor with mocked Shopify API.

**Acceptance Criteria:**
- [ ] Test addTag action succeeds
- [ ] Test removeTag action succeeds
- [ ] Test setMetafield action succeeds
- [ ] Test removeMetafield action succeeds
- [ ] Test action with missing params fails gracefully
- [ ] Test GraphQL userErrors handled correctly
- [ ] Test graceful failure (continues on error)
- [ ] Code coverage >80%

**Definition of Done:**
- All tests pass
- Mocked API used (no real GraphQL calls)

---

#### Task 3.7.4: Write Recipe Engine Integration Tests
**File:** `test/services/recipeEngine/recipeEngine.integration.test.ts`

**Description:**
Integration tests for full recipe execution flow.

**Acceptance Criteria:**
- [ ] Test: Recipe with matching conditions executes actions
- [ ] Test: Recipe with non-matching conditions skips execution
- [ ] Test: Recipe with multiple actions executes all
- [ ] Test: Recipe execution logs created in AutomationLog
- [ ] Test: Recipe stats updated after execution
- [ ] Test: Preview mode doesn't execute actions
- [ ] Test: Multiple recipes execute in sequence
- [ ] Code coverage >70%

**Definition of Done:**
- All integration tests pass
- Uses test MongoDB database
- Mocked Shopify API

---

### 3.8 Documentation Tasks

#### Task 3.8.1: Add JSDoc Comments to All Services
**Files:** `app/services/**/*.ts`

**Description:**
Add comprehensive JSDoc comments to all service modules.

**Acceptance Criteria:**
- [ ] All exported functions have JSDoc
- [ ] All classes and methods have JSDoc
- [ ] All parameters documented with @param
- [ ] All return values documented with @returns
- [ ] Examples included for complex functions

**Definition of Done:**
- TypeScript IntelliSense shows docs
- All public APIs documented

---

#### Task 3.8.2: Create Recipe Engine Usage Guide
**File:** `docs/recipe-engine-guide.md`

**Description:**
Create developer guide for using the recipe engine.

**Acceptance Criteria:**
- [ ] Document all public APIs
- [ ] Include usage examples
- [ ] Explain condition operators
- [ ] Explain action types
- [ ] Document error handling
- [ ] Include troubleshooting section

**Definition of Done:**
- Guide complete and accurate
- Examples work

---

#### Task 3.8.3: Update ARCHITECTURE.md
**File:** `docs/ARCHITECTURE.md`

**Description:**
Update architecture doc with recipe engine implementation details.

**Acceptance Criteria:**
- [ ] Service layer architecture diagram added
- [ ] Recipe execution flow documented
- [ ] Mark recipe engine as complete in roadmap
- [ ] Add performance benchmarks

**Definition of Done:**
- ARCHITECTURE.md reflects current implementation

---

## 4. Implementation Order

### Week 1: Foundation (Days 1-3)

**Day 1: Field Access & Condition Evaluation**
1. Task 3.1.1: Install JSONPath Library (15 min)
2. Task 3.1.2: Create Field Accessor Module (2 hours)
3. Task 3.7.1: Write Field Accessor Tests (1.5 hours)
4. Task 3.2.1: Create Condition Evaluator Module (3 hours)
5. Task 3.7.2: Write Condition Evaluator Tests (2 hours)

**Day 2: Shopify GraphQL Services**
1. Task 3.3.1: Create Tags Service (2 hours)
2. Task 3.3.2: Create Metafields Service (3 hours)
3. Run `pnpm graphql-codegen` to generate types (15 min)
4. Manual test with Shopify dev store (1 hour)

**Day 3: Action Execution**
1. Task 3.4.1: Create Action Executor Module (3 hours)
2. Task 3.7.3: Write Action Executor Tests (2 hours)
3. Task 3.5.1: Create Automation Logger Service (2 hours)

### Week 2: Integration & Testing (Days 4-7)

**Day 4: Recipe Engine Orchestrator**
1. Task 3.6.2: Create Recipe Engine Types (1 hour)
2. Task 3.6.1: Create Recipe Engine Main Module (4 hours)
3. Manual smoke test with test recipe (1 hour)

**Day 5: Integration Testing**
1. Task 3.7.4: Write Recipe Engine Integration Tests (4 hours)
2. Fix any failing tests (2 hours)
3. Code coverage analysis (1 hour)

**Day 6: Documentation**
1. Task 3.8.1: Add JSDoc Comments to All Services (3 hours)
2. Task 3.8.2: Create Recipe Engine Usage Guide (2 hours)
3. Task 3.8.3: Update ARCHITECTURE.md (1 hour)

**Day 7: Polish & Review**
1. Run full test suite (30 min)
2. Lint and format all code (30 min)
3. Performance testing (1 hour)
4. Code review (2 hours)
5. Final smoke test with real webhook (1 hour)

---

## 5. Code Quality Requirements

### TypeScript Standards
- **Strict typing** - No `any` types without justification
- **Interface over type** - Use interfaces for object shapes
- **Async/await** - No raw promises or callbacks
- **Error types** - Catch and type all errors

### Testing Requirements
- **Unit test coverage** - >80% for all service modules
- **Integration tests** - Full execution flow tested
- **Mock Shopify API** - No real API calls in tests
- **Test MongoDB** - Use separate test database

### Performance Requirements
- **Simple recipe** - <500ms execution time
- **Complex recipe** - <1500ms execution time
- **Lean queries** - Always use `.lean()` for read-only
- **Early exit** - Stop evaluation on first failed condition (AND logic)

### Error Handling
- **Catch all errors** - No uncaught exceptions
- **Graceful degradation** - Continue on non-critical errors
- **Detailed logging** - Log all errors to AutomationLog
- **User-friendly messages** - No stack traces in logs

---

## 6. Files to Create/Modify

### New Files (17 files)

**Services:**
1. `app/services/recipeEngine/index.ts` - Main orchestrator
2. `app/services/recipeEngine/conditionEvaluator.ts` - Condition logic
3. `app/services/recipeEngine/actionExecutor.ts` - Action execution
4. `app/services/recipeEngine/fieldAccessor.ts` - JSONPath field access
5. `app/services/recipeEngine/types.ts` - TypeScript types
6. `app/services/shopify/tags.ts` - Tag operations
7. `app/services/shopify/metafields.ts` - Metafield operations
8. `app/services/logging/automationLogger.ts` - Logging wrapper

**Tests:**
9. `test/services/recipeEngine/fieldAccessor.test.ts`
10. `test/services/recipeEngine/conditionEvaluator.test.ts`
11. `test/services/recipeEngine/actionExecutor.test.ts`
12. `test/services/recipeEngine/recipeEngine.integration.test.ts`

**Documentation:**
13. `docs/recipe-engine-guide.md` - Developer guide

### Modified Files (2 files)

1. `package.json` - Add `jsonpath-plus` dependency
2. `docs/ARCHITECTURE.md` - Update implementation status

---

## 7. Acceptance Criteria

### Functional Requirements
- [ ] Can import: `import { recipeEngine } from '~/services/recipeEngine'`
- [ ] Recipe with matching conditions executes all actions
- [ ] Recipe with non-matching conditions skips execution
- [ ] All 4 action types work: addTag, removeTag, setMetafield, removeMetafield
- [ ] All 7 operators work: `>`, `<`, `=`, `!=`, `contains`, `starts_with`, `in`
- [ ] AND/OR logical operators work correctly
- [ ] Recipe stats update after execution (executionCount, successCount, errorCount)
- [ ] AutomationLog entries created for all executions
- [ ] Preview mode evaluates conditions without executing actions
- [ ] Graceful failure - continues executing actions even if one fails

### Performance Requirements
- [ ] Simple recipe (1 condition, 1 action) executes in <500ms
- [ ] Complex recipe (5 conditions, 3 actions) executes in <1500ms
- [ ] No collection scans in MongoDB queries (use indexes)
- [ ] Early exit on first failed condition (AND logic)

### Error Handling
- [ ] Invalid JSONPath doesn't crash - returns undefined
- [ ] Missing action params logged as error
- [ ] GraphQL userErrors captured and logged
- [ ] Network errors trigger retry logic (max 3 attempts)
- [ ] All errors logged to AutomationLog with stack traces

### Testing Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Code coverage >80% for all services
- [ ] No real Shopify API calls in tests (all mocked)

---

## 8. Epic Completion Checklist

### Pre-Implementation
- [ ] Review ARCHITECTURE.md recipe engine specifications
- [ ] Verify Epic 1-006 (Mongoose Models) is complete
- [ ] Create `app/services/` directory structure
- [ ] Install `jsonpath-plus` dependency

### Implementation Phase
- [ ] Complete field accessor (3.1.x)
- [ ] Complete condition evaluator (3.2.1)
- [ ] Complete Shopify GraphQL services (3.3.x)
- [ ] Complete action executor (3.4.1)
- [ ] Complete automation logger (3.5.1)
- [ ] Complete recipe engine orchestrator (3.6.x)
- [ ] Verify all services integrate correctly

### Testing Phase
- [ ] Write and pass field accessor tests (3.7.1)
- [ ] Write and pass condition evaluator tests (3.7.2)
- [ ] Write and pass action executor tests (3.7.3)
- [ ] Write and pass integration tests (3.7.4)
- [ ] Verify code coverage >80%
- [ ] Fix failing tests

### Documentation Phase
- [ ] Add JSDoc to all services (3.8.1)
- [ ] Create usage guide (3.8.2)
- [ ] Update ARCHITECTURE.md (3.8.3)

### Final Review
- [ ] Run full test suite
- [ ] Run TypeScript compiler
- [ ] Run linter
- [ ] Test with real webhook in dev store
- [ ] Verify all acceptance criteria met
- [ ] Mark epic-1-007 as complete

---

## 9. Definition of Done vs Not Done

### ✅ DONE Examples

**Example 1: Condition Evaluation Works**
```typescript
// ✅ DONE: Can evaluate conditions
import { evaluateConditions } from '~/services/recipeEngine/conditionEvaluator';

const customer = {
  total_spent: 1500,
  tags: ["Loyal", "VIP"]
};

const conditions = [
  { field: "total_spent", operator: ">", value: 1000 },
  { field: "tags", operator: "contains", value: "VIP", logicalOperator: "AND" }
];

const result = evaluateConditions(conditions, customer);
console.log(result.matches); // true ✅
```

**Example 2: Recipe Execution Works**
```typescript
// ✅ DONE: Recipe executes actions
import { recipeEngine } from '~/services/recipeEngine';

const summary = await recipeEngine.executeForWebhook({
  shop: 'test-shop.myshopify.com',
  event: 'customers/update',
  resourceId: 'gid://shopify/Customer/123',
  resourceData: { total_spent: 1500, tags: [] },
  admin
});

console.log(summary);
// {
//   recipesEvaluated: 3,
//   recipesMatched: 1,
//   actionsExecuted: 2,
//   errors: [],
//   duration: 432
// } ✅
```

**Example 3: Logs Created**
```typescript
// ✅ DONE: AutomationLog entries created
import { AutomationLog } from '~/models/AutomationLog';

const logs = await AutomationLog.find({ shop: 'test-shop.myshopify.com' })
  .sort({ createdAt: -1 })
  .limit(5);

console.log(logs[0]);
// {
//   logType: 'recipe_execution',
//   severity: 'info',
//   recipeTitle: 'Tag VIP Customers',
//   action: { type: 'addTag', result: 'success' },
//   duration: 234
// } ✅
```

### ❌ NOT DONE Examples

**Example 1: Import Fails**
```typescript
// ❌ NOT DONE: Module not found
import { recipeEngine } from '~/services/recipeEngine';
// Error: Cannot find module '~/services/recipeEngine'
```

**Example 2: Conditions Don't Evaluate**
```typescript
// ❌ NOT DONE: Evaluation throws error
const result = evaluateConditions(conditions, customer);
// Error: getFieldValue is not defined
```

**Example 3: Actions Don't Execute**
```typescript
// ❌ NOT DONE: Actions fail silently
const summary = await recipeEngine.executeForWebhook({...});
console.log(summary.actionsExecuted); // 0 (should be 2) ❌
```

---

## 10. Notes and Considerations

### JSONPath Performance
- JSONPath is powerful but can be slow for complex queries
- Cache extracted field values when possible
- Avoid wildcard queries in conditions (e.g., `$.items[*].price`)

### Shopify API Rate Limits
- **GraphQL:** 50 cost points per second (bucket leak algorithm)
- **Cost per mutation:** 10 points typically
- **Max 5 mutations per second** to stay under limit
- Implement exponential backoff on 429 errors

### Action Dependencies
- Some actions may depend on previous actions
- Example: Set metafield after adding tag
- Current implementation: Sequential execution (safe but slower)
- Future: Analyze dependencies, parallelize independent actions

### Testing with Real Webhooks
For manual testing, use Shopify CLI:
```bash
# Trigger test webhook
shopify app webhook trigger --topic customers/update --api-version 2025-01
```

### Error Recovery
- Failed actions are logged but don't stop execution
- User must manually fix partial failures
- Future: Implement "undo" functionality (rollback)

### Future Enhancements (Out of Scope)
- **Advanced operators:** Regex matching, date comparisons
- **Computed fields:** Recipe can define custom field calculations
- **Action batching:** Execute multiple actions in one GraphQL call
- **Parallel execution:** Run independent actions concurrently
- **Scheduled recipes:** Cron-based execution (not webhook-triggered)
- **Recipe templates:** Pre-built recipes for common use cases

---

**Epic End**

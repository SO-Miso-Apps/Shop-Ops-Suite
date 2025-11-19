/**
 * Mock Data Types for Shop-Ops Suite
 *
 * These TypeScript interfaces define the structure of mock data used during development.
 * They align with the planned Mongoose schemas from docs/ARCHITECTURE.md.
 */

/**
 * Recipe category types matching PRD specifications
 */
export type RecipeCategory = 'customer' | 'order' | 'product';

/**
 * Recipe execution status
 */
export type RecipeStatus = 'enabled' | 'disabled';

/**
 * Automation log status types
 */
export type LogStatus = 'success' | 'failure' | 'partial' | 'pending';

/**
 * Resource types that recipes can operate on
 */
export type ResourceType = 'product' | 'customer' | 'order';

/**
 * Action types that recipes can perform
 */
export type ActionType = 'addTag' | 'removeTag' | 'setMetafield' | 'deleteMetafield';

/**
 * Subscription plan types
 */
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled';

/**
 * Condition operator types for recipe logic
 */
export type ConditionOperator = 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'contains' | 'notContains' | 'exists' | 'notExists';

/**
 * Recipe condition definition
 */
export interface RecipeCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

/**
 * Recipe action definition
 */
export interface RecipeAction {
  type: ActionType;
  field?: string;
  value?: string;
  tag?: string;
  metafieldNamespace?: string;
  metafieldKey?: string;
  metafieldValue?: string;
  metafieldType?: string;
}

/**
 * Mock Recipe matching planned Recipe.ts Mongoose schema
 */
export interface MockRecipe {
  /** Unique recipe identifier */
  recipeId: string;

  /** Shop domain (for multi-tenant scoping) */
  shop: string;

  /** Display name of the recipe */
  title: string;

  /** Detailed description of what the recipe does */
  description: string;

  /** Recipe category (customer, order, product) */
  category: RecipeCategory;

  /** Whether the recipe is currently active */
  enabled: boolean;

  /** Array of conditions that must be met (AND logic) */
  conditions: RecipeCondition[];

  /** Array of actions to execute when conditions match */
  actions: RecipeAction[];

  /** Number of times this recipe has been executed */
  executionCount: number;

  /** Timestamp when recipe was created */
  createdAt: Date;

  /** Timestamp when recipe was last updated */
  updatedAt: Date;

  /** Timestamp when recipe was last executed (optional) */
  lastExecutedAt?: Date;
}

/**
 * Mock Automation Log matching planned AutomationLog.ts Mongoose schema
 */
export interface MockAutomationLog {
  /** Unique log identifier */
  logId: string;

  /** Shop domain (for multi-tenant scoping) */
  shop: string;

  /** Reference to the recipe that was executed */
  recipeId: string;

  /** Recipe title (denormalized for quick display) */
  recipeTitle: string;

  /** Resource type that was processed */
  resourceType: ResourceType;

  /** Shopify resource ID (e.g., gid://shopify/Product/123) */
  resourceId: string;

  /** Resource title/name for display */
  resourceTitle: string;

  /** Execution status */
  status: LogStatus;

  /** Actions that were performed */
  actionsPerformed: RecipeAction[];

  /** Execution time in milliseconds */
  executionTime: number;

  /** How the recipe was triggered */
  triggeredBy: 'webhook' | 'manual' | 'scheduled';

  /** Error message if status is 'failure' */
  errorMessage?: string;

  /** Before state (for audit trail) */
  beforeState?: Record<string, unknown>;

  /** After state (for audit trail) */
  afterState?: Record<string, unknown>;

  /** Timestamp when log was created */
  createdAt: Date;
}

/**
 * Mock Shop Settings matching planned Setting.ts Mongoose schema
 */
export interface MockSetting {
  /** Shop domain (for multi-tenant scoping) */
  shop: string;

  /** Subscription plan type */
  plan: SubscriptionPlan;

  /** Subscription status */
  subscriptionStatus: SubscriptionStatus;

  /** Billing status (for trial tracking) */
  billingStatus: 'active' | 'trial' | 'expired' | 'cancelled';

  /** Trial end date (if on trial) */
  trialEndsAt?: Date;

  /** Current usage statistics */
  usage: {
    /** Number of active recipes */
    recipesUsed: number;

    /** Maximum recipes allowed for plan */
    recipesLimit: number;

    /** Number of executions this month */
    executionsThisMonth: number;

    /** Maximum executions allowed per month */
    executionsLimit: number;

    /** Number of bulk operations used this week */
    bulkOperationsUsed: number;

    /** Maximum bulk operations allowed per week */
    bulkOperationsLimit: number;
  };

  /** User preferences */
  preferences: {
    /** Enable email notifications */
    emailNotifications: boolean;

    /** Shop timezone (IANA format, e.g., "America/New_York") */
    timezone: string;

    /** Activity log retention in days */
    logRetentionDays: number;
  };

  /** Shop timezone (IANA format, e.g., "America/New_York") - DEPRECATED: use preferences.timezone */
  timezone: string;

  /** Email notification preferences - DEPRECATED: use preferences */
  notifications: {
    /** Send daily summary emails */
    dailySummary: boolean;

    /** Send error notifications */
    onError: boolean;

    /** Email address for notifications */
    email: string;
  };

  /** Timestamp when settings were created */
  createdAt: Date;

  /** Timestamp when settings were last updated */
  updatedAt: Date;
}

/**
 * Mock Shop metadata matching planned Shop.ts Mongoose schema
 */
export interface MockShop {
  /** Shop domain (unique identifier) */
  shop: string;

  /** Shop display name */
  name: string;

  /** Shop display name (alias for name) */
  shopName: string;

  /** Shop owner email */
  email: string;

  /** Shop currency code (e.g., "USD", "EUR") */
  currency: string;

  /** Shop country code (ISO 3166-1 alpha-2, e.g., "US", "CA") */
  country: string;

  /** Shopify plan (e.g., "basic", "shopify", "advanced", "plus") */
  shopifyPlan: string;

  /** Timestamp when shop installed the app */
  installedAt: Date;

  /** Timestamp of last sync with Shopify */
  lastSyncAt?: Date;
}

/**
 * Filter options for recipes
 */
export interface RecipeFilters {
  category?: RecipeCategory;
  enabled?: boolean;
  search?: string;
}

/**
 * Filter options for activity logs
 */
export interface LogFilters {
  recipeId?: string;
  status?: LogStatus;
  actionType?: ActionType;
  resourceType?: ResourceType;
  dateStart?: Date;
  dateEnd?: Date;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

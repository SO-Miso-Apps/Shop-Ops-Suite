import { Schema, model, Document } from 'mongoose';
import type mongoose from 'mongoose';

/**
 * Log type enumeration.
 */
export enum LogType {
  RECIPE_EXECUTION = 'recipe_execution',
  WEBHOOK_RECEIVED = 'webhook_received',
  ERROR = 'error',
  SYSTEM = 'system',
}

/**
 * Log severity enumeration.
 */
export enum Severity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * Action result enumeration.
 */
export enum ActionResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  SKIPPED = 'skipped',
}

/**
 * Action execution details.
 */
export interface IActionDetails {
  /** Action type (e.g., "addTag", "setMetafield") */
  type: string;
  /** Action parameters */
  params: Record<string, any>;
  /** Execution result */
  result: ActionResult;
  /** Error message (if failed) */
  errorMessage?: string;
}

/**
 * Automation log entry for audit trail.
 *
 * Records all recipe executions, webhook events, and system actions.
 * Logs automatically expire after 90 days (configurable via TTL index).
 *
 * @example
 * ```typescript
 * // Log recipe execution
 * await AutomationLog.logRecipeExecution({
 *   shop: 'example.myshopify.com',
 *   recipeId: recipe._id,
 *   recipeTitle: 'Tag VIP Customers',
 *   resourceType: 'customer',
 *   resourceId: 'gid://shopify/Customer/123',
 *   resourceTitle: 'John Doe',
 *   action: {
 *     type: 'addTag',
 *     params: { tag: 'VIP' },
 *     result: ActionResult.SUCCESS
 *   },
 *   duration: 234
 * });
 *
 * // Log error
 * await AutomationLog.logError(
 *   'example.myshopify.com',
 *   'Recipe execution failed',
 *   { recipeId: '123', error: 'Network timeout' }
 * );
 * ```
 */
export interface IAutomationLog extends Document {
  /** Shopify shop domain (multi-tenant key) */
  shop: string;

  /** Log entry type */
  logType: LogType;

  /** Severity level */
  severity: Severity;

  /** Recipe ID (if recipe-related) */
  recipeId?: mongoose.Types.ObjectId;

  /** Recipe title (denormalized for deleted recipes) */
  recipeTitle?: string;

  /** Resource type (e.g., "customer", "order", "product") */
  resourceType?: 'customer' | 'order' | 'product' | 'inventory';

  /** Shopify resource GID */
  resourceId?: string;

  /** Resource display name (denormalized) */
  resourceTitle?: string;

  /** Action execution details */
  action?: IActionDetails;

  /** Human-readable log message */
  message: string;

  /** Additional metadata (JSON) */
  metadata?: Record<string, any>;

  /** Execution duration in milliseconds */
  duration?: number;

  /** Creation timestamp (auto-expires after 90 days) */
  createdAt: Date;
}

/**
 * AutomationLog model with static methods.
 */
export interface IAutomationLogModel extends mongoose.Model<IAutomationLog> {
  logRecipeExecution(params: {
    shop: string;
    recipeId: mongoose.Types.ObjectId;
    recipeTitle: string;
    resourceType: string;
    resourceId: string;
    resourceTitle: string;
    action: IActionDetails;
    duration: number;
  }): Promise<IAutomationLog>;

  logError(
    shop: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<IAutomationLog>;

  findByShop(
    shop: string,
    limit?: number,
    skip?: number
  ): Promise<IAutomationLog[]>;

  findByRecipe(
    shop: string,
    recipeId: mongoose.Types.ObjectId,
    limit?: number
  ): Promise<IAutomationLog[]>;
}

// Main AutomationLog schema
const AutomationLogSchema = new Schema<IAutomationLog, IAutomationLogModel>(
  {
    shop: {
      type: String,
      required: true,
      index: true,
    },
    logType: {
      type: String,
      required: true,
      enum: Object.values(LogType),
    },
    severity: {
      type: String,
      required: true,
      enum: Object.values(Severity),
    },
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
    },
    recipeTitle: String,
    resourceType: {
      type: String,
      enum: ['customer', 'order', 'product', 'inventory'],
    },
    resourceId: String,
    resourceTitle: String,
    action: {
      type: {
        type: String,
      },
      params: {
        type: Schema.Types.Mixed,
      },
      result: {
        type: String,
        enum: Object.values(ActionResult),
      },
      errorMessage: String,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    duration: Number,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 7776000, // TTL: 90 days in seconds (90 * 24 * 60 * 60)
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'automation_logs',
  }
);

// Indexes for query performance
AutomationLogSchema.index({ shop: 1, createdAt: -1 });
AutomationLogSchema.index({ shop: 1, recipeId: 1, createdAt: -1 });
AutomationLogSchema.index({ shop: 1, resourceId: 1 });
AutomationLogSchema.index({ shop: 1, logType: 1, severity: 1 });
AutomationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Static Methods

/**
 * Log a recipe execution with action details.
 *
 * @param params - Recipe execution parameters
 * @returns Created log entry
 */
AutomationLogSchema.statics.logRecipeExecution = function (params: {
  shop: string;
  recipeId: mongoose.Types.ObjectId;
  recipeTitle: string;
  resourceType: string;
  resourceId: string;
  resourceTitle: string;
  action: IActionDetails;
  duration: number;
}): Promise<IAutomationLog> {
  const {
    shop,
    recipeId,
    recipeTitle,
    resourceType,
    resourceId,
    resourceTitle,
    action,
    duration,
  } = params;

  return this.create({
    shop,
    logType: LogType.RECIPE_EXECUTION,
    severity:
      action.result === ActionResult.SUCCESS ? Severity.INFO : Severity.ERROR,
    recipeId,
    recipeTitle,
    resourceType,
    resourceId,
    resourceTitle,
    action,
    message: `Recipe "${recipeTitle}" executed for ${resourceType} ${resourceId}`,
    duration,
  });
};

/**
 * Log an error event.
 *
 * @param shop - Shopify shop domain
 * @param message - Error message
 * @param metadata - Additional context
 * @returns Created log entry
 */
AutomationLogSchema.statics.logError = function (
  shop: string,
  message: string,
  metadata?: Record<string, any>
): Promise<IAutomationLog> {
  return this.create({
    shop,
    logType: LogType.ERROR,
    severity: Severity.ERROR,
    message,
    metadata,
  });
};

/**
 * Find logs for a shop with pagination.
 *
 * @param shop - Shopify shop domain
 * @param limit - Maximum number of logs to return (default: 50)
 * @param skip - Number of logs to skip (default: 0)
 * @returns Array of log entries sorted by most recent
 */
AutomationLogSchema.statics.findByShop = function (
  shop: string,
  limit: number = 50,
  skip: number = 0
): Promise<IAutomationLog[]> {
  return this.find({ shop })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

/**
 * Find logs for a specific recipe.
 *
 * @param shop - Shopify shop domain
 * @param recipeId - Recipe ObjectId
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of log entries sorted by most recent
 */
AutomationLogSchema.statics.findByRecipe = function (
  shop: string,
  recipeId: mongoose.Types.ObjectId,
  limit: number = 50
): Promise<IAutomationLog[]> {
  return this.find({ shop, recipeId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Export model
export const AutomationLog = model<IAutomationLog, IAutomationLogModel>(
  'AutomationLog',
  AutomationLogSchema
);
export default AutomationLog;

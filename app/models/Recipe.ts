import { Schema, model, Document } from 'mongoose';
import type mongoose from 'mongoose';

/**
 * Recipe category enumeration.
 */
export enum RecipeCategory {
  CUSTOMER = 'customer',
  ORDER = 'order',
  PRODUCT = 'product',
  INVENTORY = 'inventory',
}

/**
 * Condition operator enumeration.
 */
export enum ConditionOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  EQUALS = '=',
  NOT_EQUALS = '!=',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  IN = 'in',
}

/**
 * Action type enumeration.
 */
export enum ActionType {
  ADD_TAG = 'addTag',
  REMOVE_TAG = 'removeTag',
  SET_METAFIELD = 'setMetafield',
  REMOVE_METAFIELD = 'removeMetafield',
}

/**
 * Recipe trigger configuration.
 */
export interface IRecipeTrigger {
  /** Webhook topic (e.g., "customers/update") */
  event: string;
  /** Resource type (e.g., "customer") */
  resource: string;
}

/**
 * Recipe condition for if/then logic.
 */
export interface IRecipeCondition {
  /** JSONPath to field (e.g., "total_spent", "addresses[0].city") */
  field: string;
  /** Comparison operator */
  operator: ConditionOperator;
  /** Value to compare against */
  value: any;
  /** How to combine with next condition (default: "AND") */
  logicalOperator?: 'AND' | 'OR';
}

/**
 * Recipe action parameters.
 */
export interface IRecipeActionParams {
  /** Tag name (for tag actions) */
  tag?: string;
  /** Metafield namespace (for metafield actions) */
  namespace?: string;
  /** Metafield key (for metafield actions) */
  key?: string;
  /** Metafield value (for setMetafield action) */
  value?: string;
  /** Metafield value type (default: "string") */
  valueType?: 'string' | 'integer' | 'json';
}

/**
 * Recipe action to execute.
 */
export interface IRecipeAction {
  /** Action type */
  type: ActionType;
  /** Action parameters */
  params: IRecipeActionParams;
}

/**
 * Recipe execution statistics.
 */
export interface IRecipeStats {
  /** Total times recipe has executed */
  executionCount: number;
  /** Most recent execution timestamp */
  lastExecutedAt?: Date;
  /** Successful executions */
  successCount: number;
  /** Failed executions */
  errorCount: number;
}

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
export interface IRecipe extends Document {
  /** Shopify shop domain (multi-tenant key) */
  shop: string;

  /** Display name (e.g., "Tag VIP Customers") */
  title: string;

  /** User-facing description */
  description: string;

  /** Recipe category */
  category: RecipeCategory;

  /** Active/inactive toggle */
  enabled: boolean;

  /** Webhook trigger configuration */
  trigger: IRecipeTrigger;

  /** Conditions to evaluate (if/then logic) */
  conditions: IRecipeCondition[];

  /** Actions to execute when conditions match */
  actions: IRecipeAction[];

  /** Execution statistics */
  stats: IRecipeStats;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  // Instance methods
  incrementExecutionCount(success: boolean): Promise<IRecipe>;
  toggleEnabled(): Promise<IRecipe>;
}

/**
 * Recipe model with static methods.
 */
export interface IRecipeModel extends mongoose.Model<IRecipe> {
  findByShopAndCategory(shop: string, category: RecipeCategory): Promise<IRecipe[]>;
  findActiveByEvent(shop: string, event: string): Promise<IRecipe[]>;
}

// Subdocument schemas
const RecipeConditionSchema = new Schema<IRecipeCondition>(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      required: true,
      enum: Object.values(ConditionOperator),
    },
    value: { type: Schema.Types.Mixed, required: true },
    logicalOperator: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND',
    },
  },
  { _id: false }
);

const RecipeActionSchema = new Schema<IRecipeAction>(
  {
    type: {
      type: String,
      required: true,
      enum: Object.values(ActionType),
    },
    params: {
      tag: String,
      namespace: String,
      key: String,
      value: String,
      valueType: {
        type: String,
        enum: ['string', 'integer', 'json'],
      },
    },
  },
  { _id: false }
);

// Main Recipe schema
const RecipeSchema = new Schema<IRecipe, IRecipeModel>(
  {
    shop: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    category: {
      type: String,
      required: true,
      enum: Object.values(RecipeCategory),
    },
    enabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    trigger: {
      event: { type: String, required: true },
      resource: { type: String, required: true },
    },
    conditions: {
      type: [RecipeConditionSchema],
      default: [],
    },
    actions: {
      type: [RecipeActionSchema],
      default: [],
    },
    stats: {
      executionCount: { type: Number, default: 0 },
      lastExecutedAt: Date,
      successCount: { type: Number, default: 0 },
      errorCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    collection: 'recipes',
  }
);

// Indexes for query performance
RecipeSchema.index({ shop: 1, enabled: 1, category: 1 });
RecipeSchema.index({ shop: 1, 'trigger.event': 1, enabled: 1 });
RecipeSchema.index({ shop: 1, updatedAt: -1 });

// Validation: Enabled recipes must have conditions and actions
RecipeSchema.pre('save', function (next) {
  if (this.enabled) {
    if (!this.conditions || this.conditions.length === 0) {
      return next(new Error('Enabled recipes must have at least one condition'));
    }
    if (!this.actions || this.actions.length === 0) {
      return next(new Error('Enabled recipes must have at least one action'));
    }
  }

  // Validate webhook topic format (e.g., "products/update")
  const validTopicPattern = /^[a-z_]+\/[a-z_]+$/;
  if (!validTopicPattern.test(this.trigger.event)) {
    return next(
      new Error(
        'Invalid webhook topic format. Expected format: "resource/action" (e.g., "customers/update")'
      )
    );
  }

  next();
});

// Static Methods

/**
 * Find recipes by shop and category.
 *
 * @param shop - Shopify shop domain
 * @param category - Recipe category
 * @returns Array of recipes sorted by most recently updated
 */
RecipeSchema.statics.findByShopAndCategory = function (
  shop: string,
  category: RecipeCategory
): Promise<IRecipe[]> {
  return this.find({ shop, category }).sort({ updatedAt: -1 });
};

/**
 * Find active (enabled) recipes for a specific webhook event.
 *
 * Used by webhook handlers to find recipes to execute.
 *
 * @param shop - Shopify shop domain
 * @param event - Webhook topic (e.g., "customers/update")
 * @returns Array of enabled recipes for this event
 */
RecipeSchema.statics.findActiveByEvent = function (
  shop: string,
  event: string
): Promise<IRecipe[]> {
  return this.find({
    shop,
    enabled: true,
    'trigger.event': event,
  });
};

// Instance Methods

/**
 * Increment recipe execution count and update statistics.
 *
 * Uses atomic operations to prevent race conditions.
 *
 * @param success - Whether the execution succeeded
 * @returns Updated recipe document
 */
RecipeSchema.methods.incrementExecutionCount = async function (
  success: boolean
): Promise<IRecipe> {
  this.stats.executionCount += 1;
  this.stats.lastExecutedAt = new Date();

  if (success) {
    this.stats.successCount += 1;
  } else {
    this.stats.errorCount += 1;
  }

  return this.save();
};

/**
 * Toggle recipe enabled state.
 *
 * @returns Updated recipe document
 */
RecipeSchema.methods.toggleEnabled = async function (): Promise<IRecipe> {
  this.enabled = !this.enabled;
  return this.save();
};

// Export model
export const Recipe = model<IRecipe, IRecipeModel>('Recipe', RecipeSchema);
export default Recipe;

/**
 * Central export file for all Mongoose models.
 *
 * Import all models from here for consistency:
 * ```typescript
 * import { Recipe, Setting, AutomationLog, Shop } from '~/models';
 * ```
 */

// Recipe model
export { Recipe, RecipeCategory, ConditionOperator, ActionType } from './Recipe';
export type {
  IRecipe,
  IRecipeTrigger,
  IRecipeCondition,
  IRecipeAction,
  IRecipeActionParams,
  IRecipeStats,
  IRecipeModel,
} from './Recipe';

// Setting model
export { Setting, Plan, BillingStatus } from './Setting';
export type {
  ISetting,
  IFeatures,
  IPreferences,
  IShopMetadata,
  ISettingModel,
} from './Setting';

// AutomationLog model
export { AutomationLog, LogType, Severity, ActionResult } from './AutomationLog';
export type {
  IAutomationLog,
  IActionDetails,
  IAutomationLogModel,
} from './AutomationLog';

// Shop model
export { Shop, AppStatus, WebhookStatus } from './Shop';
export type { IShop, IWebhook, IShopModel } from './Shop';

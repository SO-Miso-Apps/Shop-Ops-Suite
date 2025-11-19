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

import { AutomationLog, ActionResult } from '~/models/AutomationLog';
import type { IRecipe } from '~/models/Recipe';
import type { ActionExecutionResult } from '~/services/recipeEngine/actionExecutor';
import type { ConditionEvaluation } from '~/services/recipeEngine/conditionEvaluator';
import mongoose from 'mongoose';

/**
 * Log a recipe execution with all action results.
 *
 * @param params - Recipe execution parameters
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
    duration,
  } = params;

  // Log overall recipe execution
  const allSucceeded = actionResults.every((r) => r.success);
  const overallResult = conditionsMatched
    ? allSucceeded
      ? ActionResult.SUCCESS
      : ActionResult.FAILURE
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
        actionsExecuted: actionResults.length,
      },
      result: overallResult,
      errorMessage: actionResults
        .filter((r) => !r.success)
        .map((r) => r.error)
        .join('; '),
    },
    duration,
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
        result: actionResult.success
          ? ActionResult.SUCCESS
          : ActionResult.FAILURE,
        errorMessage: actionResult.error,
      },
      message: `Action "${actionResult.action.type}" ${actionResult.success ? 'succeeded' : 'failed'} for ${resourceType} ${resourceId}`,
      duration: actionResult.duration,
    });
  }
}

/**
 * Log recipe evaluation (for preview/dry-run mode).
 *
 * @param params - Evaluation parameters
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
      evaluations: evaluations.map((e) => ({
        field: e.condition.field,
        operator: e.condition.operator,
        expectedValue: e.condition.value,
        actualValue: e.fieldValue,
        result: e.result,
      })),
    },
  });
}

/**
 * Log error during recipe execution.
 *
 * @param shop - Shop domain
 * @param recipe - Recipe document
 * @param error - Error object
 * @param metadata - Additional context
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
    ...metadata,
  });
}

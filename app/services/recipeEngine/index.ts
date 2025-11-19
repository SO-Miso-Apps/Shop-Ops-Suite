import type { AdminApiContext } from '@shopify/shopify-app-remix/server';
import Recipe, { type IRecipe } from '~/models/Recipe';
import { connectToMongoDB } from '~/mongoose.server';
import { evaluateConditions } from './conditionEvaluator';
import { executeActions } from './actionExecutor';
import {
  logRecipeExecution,
  logRecipeEvaluation,
  logExecutionError,
} from '~/services/logging/automationLogger';

export interface ExecuteForWebhookParams {
  shop: string;
  event: string; // e.g., "customers/update"
  resourceId: string; // Shopify GID
  resourceData: any; // Webhook payload
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
  async executeForWebhook(
    params: ExecuteForWebhookParams
  ): Promise<ExecutionSummary> {
    const startTime = Date.now();
    const { shop, event, resourceId, resourceData, admin } = params;

    await connectToMongoDB();

    // Find all enabled recipes for this event
    const recipes = await Recipe.find({
      shop,
      enabled: true,
      'trigger.event': event,
    }).lean();

    const summary: ExecutionSummary = {
      recipesEvaluated: recipes.length,
      recipesMatched: 0,
      actionsExecuted: 0,
      errors: [],
      duration: 0,
    };

    // Execute each recipe
    for (const recipe of recipes) {
      try {
        const result = await this.executeSingleRecipe({
          recipe: recipe as IRecipe,
          resourceId,
          resourceData,
          admin,
        });

        if (result.conditionsMatched) {
          summary.recipesMatched++;
          summary.actionsExecuted += result.actionsExecuted;
        }

        if (!result.success) {
          summary.errors.push({
            recipeId: recipe._id.toString(),
            recipeTitle: recipe.title,
            error: result.errors.join('; '),
          });
        }
      } catch (error) {
        summary.errors.push({
          recipeId: recipe._id.toString(),
          recipeTitle: recipe.title,
          error: error instanceof Error ? error.message : String(error),
        });

        // Log error
        await logExecutionError(shop, recipe as IRecipe, error as Error, {
          resourceId,
          event,
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

    // Extract resource type from GID (e.g., "gid://shopify/Customer/123" -> "customer")
    const resourceType = this.extractResourceType(resourceId);
    const resourceTitle = this.extractResourceTitle(
      resourceData,
      resourceType
    );

    // 2. If conditions don't match, skip execution
    if (!evaluation.matches) {
      const duration = Date.now() - startTime;

      // Log evaluation (for audit trail)
      await logRecipeEvaluation({
        shop: recipe.shop,
        recipe,
        resourceId,
        matched: false,
        evaluations: evaluation.evaluations,
      });

      return {
        recipe,
        conditionsMatched: false,
        actionsExecuted: 0,
        success: true,
        errors: [],
        duration,
      };
    }

    // 3. Execute actions
    const actionResults = await executeActions(
      recipe.actions,
      resourceId,
      admin
    );

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
      duration,
    });

    // 5. Update recipe stats
    const allSucceeded = actionResults.every((r) => r.success);
    await Recipe.updateOne(
      { _id: recipe._id },
      {
        $inc: {
          'stats.executionCount': 1,
          'stats.successCount': allSucceeded ? 1 : 0,
          'stats.errorCount': allSucceeded ? 0 : 1,
        },
        $set: {
          'stats.lastExecutedAt': new Date(),
        },
      }
    );

    return {
      recipe,
      conditionsMatched: true,
      actionsExecuted: actionResults.length,
      success: allSucceeded,
      errors: actionResults
        .filter((r) => !r.success)
        .map((r) => r.error || 'Unknown error'),
      duration,
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
      actionsToExecute: evaluation.matches ? recipe.actions : [],
    };
  }

  /**
   * Extract resource type from Shopify GID.
   *
   * @example "gid://shopify/Customer/123" -> "customer"
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
      data.display_name ||
      `${resourceType} ${data.id || 'unknown'}`
    );
  }
}

// Export singleton instance
export const recipeEngine = new RecipeEngine();

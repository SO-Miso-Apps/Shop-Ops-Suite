import type { AdminApiContext } from '@shopify/shopify-app-remix/server';
import type { IRecipeAction } from '~/models/Recipe';
import { addTags, removeTags } from '~/services/shopify/tags';
import {
  setMetafield,
  removeMetafield,
  getMetafieldId,
} from '~/services/shopify/metafields';

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
        if (
          !action.params.namespace ||
          !action.params.key ||
          !action.params.value
        ) {
          throw new Error(
            'Missing required parameters: namespace, key, value'
          );
        }
        result = await setMetafield(admin, resourceId, {
          namespace: action.params.namespace,
          key: action.params.key,
          value: action.params.value,
          valueType: action.params.valueType || 'string',
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
        duration,
      };
    }

    return {
      action,
      success: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      action,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

/**
 * Execute multiple actions in sequence.
 *
 * Continues executing even if one action fails (fail gracefully).
 *
 * @param actions - Array of recipe actions
 * @param resourceId - Shopify GID of target resource
 * @param admin - Shopify Admin API context
 * @returns Array of execution results
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

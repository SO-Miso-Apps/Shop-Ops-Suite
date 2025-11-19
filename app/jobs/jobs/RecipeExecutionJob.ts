import { recipeExecutionQueue } from '../config/queues';
import type { RecipeExecutionJobPayload } from './types';

/**
 * Recipe Execution Job
 *
 * Handles enqueueing recipe execution jobs.
 */
export class RecipeExecutionJob {
  /**
   * Enqueue a recipe execution job.
   *
   * Called by webhook handlers.
   *
   * @param payload - Job payload
   * @returns Job ID
   */
  static async enqueue(payload: RecipeExecutionJobPayload): Promise<string> {
    // Validate required fields
    if (!payload.shop || !payload.event || !payload.resourceId) {
      throw new Error('Missing required fields: shop, event, resourceId');
    }

    // Add job to queue
    const job = await recipeExecutionQueue.add('execute-recipe', payload, {
      priority: payload.priority || 5, // Default: normal priority
      jobId: `${payload.shop}-${payload.event}-${Date.now()}`, // Unique ID
    });

    console.log(`Enqueued recipe execution job: ${job.id}`);
    return job.id || '';
  }

  /**
   * Enqueue multiple jobs at once (bulk).
   */
  static async enqueueBulk(
    payloads: RecipeExecutionJobPayload[]
  ): Promise<string[]> {
    const jobs = await recipeExecutionQueue.addBulk(
      payloads.map((payload) => ({
        name: 'execute-recipe',
        data: payload,
        opts: {
          priority: payload.priority || 5,
        },
      }))
    );

    return jobs.map((job) => job.id || '');
  }
}

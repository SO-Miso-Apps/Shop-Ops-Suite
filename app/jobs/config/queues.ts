import { Queue } from 'bullmq';
import { getBullMQConnection, defaultJobOptions } from './bullmq';
import type {
  RecipeExecutionJobPayload,
  ScheduledCleanupJobPayload,
} from '../jobs/types';

// Queue names (type-safe)
export const QUEUE_NAMES = {
  RECIPE_EXECUTION: 'recipe-execution',
  SCHEDULED_CLEANUP: 'scheduled-cleanup',
} as const;

// Shared Redis connection
const connection = getBullMQConnection();

/**
 * Recipe Execution Queue
 *
 * Processes recipe executions triggered by webhooks.
 */
export const recipeExecutionQueue = new Queue<RecipeExecutionJobPayload>(
  QUEUE_NAMES.RECIPE_EXECUTION,
  {
    connection,
    defaultJobOptions,
  }
);

/**
 * Scheduled Cleanup Queue
 *
 * Processes periodic cleanup tasks (old logs, stale data).
 */
export const scheduledCleanupQueue = new Queue<ScheduledCleanupJobPayload>(
  QUEUE_NAMES.SCHEDULED_CLEANUP,
  {
    connection,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 1, // Don't retry cleanup jobs
    },
  }
);

/**
 * Get queue by name (type-safe).
 */
export function getQueue(name: keyof typeof QUEUE_NAMES): Queue {
  switch (name) {
    case 'RECIPE_EXECUTION':
      return recipeExecutionQueue;
    case 'SCHEDULED_CLEANUP':
      return scheduledCleanupQueue;
    default:
      throw new Error(`Unknown queue: ${name}`);
  }
}

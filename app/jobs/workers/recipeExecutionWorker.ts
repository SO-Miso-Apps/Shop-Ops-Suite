import { Worker, Job } from 'bullmq';
import { getBullMQConnection } from '../config/bullmq';
import { QUEUE_NAMES } from '../config/queues';
import type { RecipeExecutionJobPayload, JobResult } from '../jobs/types';
import { recipeEngine } from '~/services/recipeEngine';
import { connectToMongoDB } from '~/mongoose.server';
import { updateJobMetrics } from '../monitoring/jobMetrics';
import { AutomationLog } from '~/models/AutomationLog';
import { Setting } from '~/models/Setting';
import { shopify } from '~/shopify.server';

/**
 * Get Shopify Admin API context from stored access token.
 *
 * Used in background jobs where session is not available.
 *
 * @param shop - Shopify shop domain
 * @returns Admin API context
 */
async function getAdminContext(shop: string): Promise<any> {
  // Get shop settings (includes encrypted access token)
  const setting = await Setting.findByShop(shop);

  if (!setting) {
    throw new Error(`Shop settings not found for: ${shop}`);
  }

  // Decrypt access token
  const accessToken = setting.decryptAccessToken();

  // Create session-like object for GraphQL client
  const session = {
    id: `offline_${shop}`,
    shop,
    state: shop,
    isOnline: false,
    accessToken,
    scope: setting.scopes.join(','),
  };

  // Create admin GraphQL client
  const admin = new shopify.api.clients.Graphql({ session });

  return { admin };
}

/**
 * Process recipe execution job.
 */
async function processRecipeExecution(
  job: Job<RecipeExecutionJobPayload>
): Promise<JobResult> {
  const startTime = Date.now();
  const { shop, event, resourceId, resourceData } = job.data;

  console.log(`Processing recipe execution job ${job.id} for shop ${shop}`);

  try {
    // Connect to MongoDB
    await connectToMongoDB();

    // Get Shopify Admin API context
    const admin = await getAdminContext(shop);

    // Execute recipes
    const summary = await recipeEngine.executeForWebhook({
      shop,
      event,
      resourceId,
      resourceData,
      admin,
    });

    const duration = Date.now() - startTime;

    // Update metrics
    await updateJobMetrics({
      shop,
      queueName: QUEUE_NAMES.RECIPE_EXECUTION,
      success: summary.errors.length === 0,
      duration,
    });

    return {
      success: true,
      recipesEvaluated: summary.recipesEvaluated,
      recipesMatched: summary.recipesMatched,
      actionsExecuted: summary.actionsExecuted,
      errors: summary.errors.map((e) => e.error),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error
    await AutomationLog.logError(
      shop,
      `Recipe execution job failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        jobId: job.id,
        event,
        resourceId,
        errorStack: error instanceof Error ? error.stack : undefined,
      }
    );

    // Update metrics
    await updateJobMetrics({
      shop,
      queueName: QUEUE_NAMES.RECIPE_EXECUTION,
      success: false,
      duration,
    });

    // Re-throw to trigger retry
    throw error;
  }
}

/**
 * Recipe Execution Worker
 *
 * Processes jobs from the recipe-execution queue.
 */
export const recipeExecutionWorker = new Worker<RecipeExecutionJobPayload>(
  QUEUE_NAMES.RECIPE_EXECUTION,
  processRecipeExecution,
  {
    connection: getBullMQConnection(),
    concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
    limiter: {
      max: 50, // Max 50 jobs per minute
      duration: 60000,
    },
  }
);

// Event handlers
recipeExecutionWorker.on('completed', (job, result: JobResult) => {
  console.log(`Job ${job.id} completed in ${result.duration}ms`);
});

recipeExecutionWorker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

recipeExecutionWorker.on('error', (error) => {
  console.error('Worker error:', error);
});

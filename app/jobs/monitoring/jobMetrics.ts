import { JobMetric } from '~/models/JobMetric';

export interface UpdateJobMetricsParams {
  shop: string;
  queueName: string;
  success: boolean;
  duration: number;
}

/**
 * Update job metrics after job completion.
 *
 * Errors are logged but don't propagate (metric updates shouldn't crash workers).
 */
export async function updateJobMetrics(
  params: UpdateJobMetricsParams
): Promise<void> {
  try {
    await JobMetric.updateMetrics(params);
  } catch (error) {
    console.error('Failed to update job metrics:', error);
    // Don't re-throw - metric updates are non-critical
  }
}

/**
 * Get job metrics for a shop and queue.
 *
 * @param params - Query parameters
 * @returns Array of metrics sorted by date (most recent first)
 */
export async function getJobMetrics(params: {
  shop: string;
  queueName?: string;
  daysBack?: number;
}): Promise<any[]> {
  const { shop, queueName, daysBack = 7 } = params;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const query: any = {
    shop,
    date: { $gte: startDate },
  };

  if (queueName) {
    query.queueName = queueName;
  }

  return JobMetric.find(query).sort({ date: -1 }).lean();
}

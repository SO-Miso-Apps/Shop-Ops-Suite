import mongoose, { Schema, model, Document } from 'mongoose';

/**
 * Job metrics for monitoring and analytics.
 *
 * Tracks job execution statistics aggregated by shop, queue, and day.
 * Automatically expires after 30 days via TTL index.
 *
 * @example
 * ```typescript
 * // Update metrics after job completion
 * await JobMetric.updateMetrics({
 *   shop: 'example.myshopify.com',
 *   queueName: 'recipe-execution',
 *   success: true,
 *   duration: 234
 * });
 *
 * // Get metrics for last 7 days
 * const metrics = await getJobMetrics({
 *   shop: 'example.myshopify.com',
 *   queueName: 'recipe-execution',
 *   daysBack: 7
 * });
 * ```
 */
export interface IJobMetric extends Document {
  /** Shopify shop domain */
  shop: string;

  /** Queue name (e.g., "recipe-execution") */
  queueName: string;

  /** Aggregation date (start of day) */
  date: Date;

  /** Total jobs processed */
  totalJobs: number;

  /** Successfully completed jobs */
  completedJobs: number;

  /** Failed jobs */
  failedJobs: number;

  /** Sum of all job durations (ms) */
  totalDuration: number;

  /** Average job duration (ms) */
  avgDuration: number;

  /** Success rate percentage (0-100) */
  successRate: number;

  /** Last job processed timestamp */
  lastProcessedAt: Date;

  /** Creation timestamp (with TTL) */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * JobMetric model with static methods.
 */
export interface IJobMetricModel extends mongoose.Model<IJobMetric> {
  updateMetrics(params: {
    shop: string;
    queueName: string;
    success: boolean;
    duration: number;
  }): Promise<void>;
}

const JobMetricSchema = new Schema<IJobMetric, IJobMetricModel>(
  {
    shop: {
      type: String,
      required: true,
      index: true,
    },
    queueName: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    totalJobs: {
      type: Number,
      default: 0,
    },
    completedJobs: {
      type: Number,
      default: 0,
    },
    failedJobs: {
      type: Number,
      default: 0,
    },
    totalDuration: {
      type: Number,
      default: 0,
    },
    avgDuration: {
      type: Number,
      default: 0,
    },
    successRate: {
      type: Number,
      default: 100,
    },
    lastProcessedAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 2592000, // TTL: 30 days in seconds
    },
  },
  {
    timestamps: true,
    collection: 'job_metrics',
  }
);

// Indexes
JobMetricSchema.index({ shop: 1, queueName: 1, date: 1 }, { unique: true });
JobMetricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

/**
 * Update metrics for a job execution.
 *
 * @param params - Job execution parameters
 */
JobMetricSchema.statics.updateMetrics = async function (params: {
  shop: string;
  queueName: string;
  success: boolean;
  duration: number;
}) {
  const { shop, queueName, success, duration } = params;

  // Get start of today (for aggregation)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upsert metrics document
  const metric = await this.findOneAndUpdate(
    { shop, queueName, date: today },
    {
      $inc: {
        totalJobs: 1,
        completedJobs: success ? 1 : 0,
        failedJobs: success ? 0 : 1,
        totalDuration: duration,
      },
      $set: {
        lastProcessedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  // Calculate average duration and success rate
  metric.avgDuration = Math.round(metric.totalDuration / metric.totalJobs);
  metric.successRate = Math.round(
    (metric.completedJobs / metric.totalJobs) * 100
  );

  await metric.save();
};

export const JobMetric = mongoose.models['JobMetrics'] || model<IJobMetric, IJobMetricModel>(
  'JobMetric',
  JobMetricSchema
);
export default JobMetric;

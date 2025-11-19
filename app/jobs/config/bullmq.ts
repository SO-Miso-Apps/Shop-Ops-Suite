import IORedis from 'ioredis';

/**
 * Get Redis connection for BullMQ.
 *
 * Reuses connection across queues for efficiency.
 */
export function getBullMQConnection(): IORedis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  });

  connection.on('error', (error) => {
    console.error('BullMQ Redis connection error:', error);
  });

  connection.on('connect', () => {
    console.log('BullMQ Redis connected');
  });

  return connection;
}

/**
 * Default job options for all queues.
 */
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000, // 5 seconds initial delay
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: false, // Keep failed jobs for debugging
};

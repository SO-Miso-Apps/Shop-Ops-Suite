import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
});

export const webhookQueue = new Queue("webhook-processing", { connection });
export const bulkQueue = new Queue("bulk-operations", { connection });
export const cronQueue = new Queue("cron-tasks", { connection });
export const cleanerQueue = new Queue("cleaner-jobs", { connection });

import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
});

// --- Queues ---

export const webhookQueue = new Queue("webhook-processing", { connection });
export const bulkQueue = new Queue("bulk-operations", { connection });
export const cronQueue = new Queue("cron-tasks", { connection });
export const cleanerQueue = new Queue("cleaner-jobs", { connection });

// --- Workers ---

// We need to ensure workers are only initialized once in development to avoid duplicates during HMR
let webhookWorker: Worker;
let bulkWorker: Worker;
let cronWorker: Worker;
let cleanerWorker: Worker;

declare global {
    var __webhookWorker: Worker | undefined;
    var __bulkWorker: Worker | undefined;
    var __cronWorker: Worker | undefined;
    var __cleanerWorker: Worker | undefined;
}

if (process.env.NODE_ENV !== "production") {
    if (global.__webhookWorker) global.__webhookWorker.close();
    if (global.__bulkWorker) global.__bulkWorker.close();
    if (global.__cronWorker) global.__cronWorker.close();
    if (global.__cleanerWorker) global.__cleanerWorker.close();
}

import { processWebhookJob as taggerProcessor } from "./services/tagger.server";
import { processBulkJob as bulkProcessor } from "./services/bulk.server";
import { processCleanerJob as cleanerProcessor } from "./services/cleaner.server";

const processWebhookJob = async (job: Job) => {
    console.log(`Processing webhook job ${job.id}:`, job.name);
    await taggerProcessor(job);
    return { status: "processed" };
};

const processBulkJob = async (job: Job) => {
    console.log(`Processing bulk job ${job.id}:`, job.name);
    await bulkProcessor(job);
    return { status: "processed" };
};

const processCronJob = async (job: Job) => {
    console.log(`Processing cron job ${job.id}:`, job.name);
    // In a real app, we would import a service function to run the logic
    // e.g. await runAutoUntag();
    return { status: "processed" };
};

const processCleanerJob = async (job: Job) => {
    console.log(`Processing cleaner job ${job.id}:`, job.name);
    await cleanerProcessor(job);
    return { status: "processed" };
};

webhookWorker = new Worker("webhook-processing", processWebhookJob, { connection });
bulkWorker = new Worker("bulk-operations", processBulkJob, { connection });
cronWorker = new Worker("cron-tasks", processCronJob, { connection });
cleanerWorker = new Worker("cleaner-jobs", processCleanerJob, { connection });

// Schedule nightly job if not exists
// Note: In dev, this might run multiple times on restart, but add is idempotent with same job ID
cronQueue.add("nightly-cleanup", {}, {
    repeat: {
        pattern: "0 0 * * *", // Every night at midnight
    },
    jobId: "nightly-cleanup"
});

if (process.env.NODE_ENV !== "production") {
    global.__webhookWorker = webhookWorker;
    global.__bulkWorker = bulkWorker;
    global.__cronWorker = cronWorker;
    global.__cleanerWorker = cleanerWorker;
}

console.log("🚀 Background workers started");

export { webhookWorker, bulkWorker, cronWorker, cleanerWorker };

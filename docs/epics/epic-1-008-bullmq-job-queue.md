# Epic 1-008: BullMQ Job Queue System

**Status:** 🔵 Planned
**Phase:** Phase 1 - MVP
**Priority:** P0 - Critical Path
**Estimated Complexity:** Medium (4-6 days)
**Dependencies:** Epic 1-006 (Mongoose Models), Epic 1-007 (Recipe Engine)
**Blocks:** Epic 1-009 (Webhook Handlers)

---

## 1. Understanding (Objective, Scope, and Context)

### Objective
Implement a robust background job processing system using BullMQ and Redis to handle recipe executions asynchronously. This decouples webhook handlers from recipe processing, enabling fast webhook responses (<500ms) and reliable job execution with retry logic.

### Scope

**In Scope:**
- BullMQ setup with Redis connection
- Job queue configuration (recipe-execution, scheduled-cleanup)
- Worker processes for job execution
- Job retry logic with exponential backoff
- Job monitoring and metrics (success rate, failure rate, queue depth)
- Error handling and dead letter queue
- Job priority support (high, normal, low)
- Concurrency control (max workers per queue)
- Integration with Recipe Engine
- Integration with AutomationLog for job tracking
- Job dashboard data endpoint (for future UI)

**Out of Scope:**
- Job queue UI (use Bull Board as external tool)
- Scheduled/cron-based recipe execution (Phase 2)
- Job result caching (Phase 2)
- Multi-server job distribution (Phase 2 - single server for MVP)
- Custom job schedulers (use BullMQ built-in)
- Job chaining/workflows (Phase 2)

### Context

**Current State:**
- Recipe engine exists and can execute recipes synchronously
- Webhook handlers don't exist yet (Epic 1-009)
- Redis configured for session storage (can reuse connection)
- No background job processing
- No async execution capability

**Target State:**
- BullMQ configured with Redis
- Worker processes running in background
- Webhook handlers enqueue jobs (fast response)
- Workers process jobs asynchronously
- Failed jobs retry automatically
- Job metrics tracked in MongoDB
- Development: Workers run in same process as web server
- Production: Workers can run in separate processes

**Why This Matters:**
- **Webhook timeouts:** Shopify requires <500ms webhook response - can't execute recipes synchronously
- **Reliability:** Jobs retry on failure (network issues, rate limits)
- **Scalability:** Process jobs in background, scale workers independently
- **Observability:** Track job status, failures, performance
- **User experience:** Fast API responses, background processing

---

## 2. Planning (Architecture, Design Decisions, and Strategy)

### Architecture Overview

**Job Queue Structure:**
```
Redis (Bull Queue)
├── Queue: recipe-execution
│   ├── Job: { recipeId, resourceId, resourceData, shop, event }
│   ├── Priority: high (1), normal (5), low (10)
│   └── Retry: 3 attempts with exponential backoff
│
├── Queue: scheduled-cleanup
│   └── Job: { cleanupType: 'old-logs', daysToKeep: 90 }
│
└── Failed Jobs (Dead Letter Queue)
    └── Jobs that failed after max retries
```

**Worker Architecture:**
```
app/jobs/
├── config/
│   ├── bullmq.ts                  # BullMQ connection config
│   └── queues.ts                  # Queue definitions
│
├── workers/
│   ├── recipeExecutionWorker.ts   # Process recipe execution jobs
│   ├── scheduledCleanupWorker.ts  # Process cleanup jobs
│   └── index.ts                   # Worker manager (start/stop all)
│
├── jobs/
│   ├── RecipeExecutionJob.ts      # Recipe execution job class
│   ├── ScheduledCleanupJob.ts     # Cleanup job class
│   └── types.ts                   # Job payload types
│
└── monitoring/
    ├── jobMetrics.ts              # Track job success/failure rates
    └── queueMonitor.ts            # Monitor queue depth, latency
```

**Job Execution Flow:**
```
1. Webhook Handler (app/routes/webhooks.*.tsx)
   ↓ (enqueue job - <50ms)
2. Redis Job Queue
   ↓ (worker picks up job)
3. Recipe Execution Worker
   ↓ (calls Recipe Engine)
4. Recipe Engine (evaluates & executes)
   ↓ (GraphQL mutations)
5. Shopify API
   ↓ (update resource)
6. Log Result to AutomationLog
   ↓
7. Update Job Metrics
```

### Component Design

#### 2.1 Job Queue Configuration

**Queue Definition:**
```typescript
interface QueueConfig {
  name: string;
  redis: RedisOptions;
  defaultJobOptions: {
    attempts: number;        // Max retry attempts
    backoff: {
      type: 'exponential';   // Backoff strategy
      delay: number;         // Initial delay (ms)
    };
    removeOnComplete: number;  // Keep completed jobs (count)
    removeOnFail: boolean;     // Keep failed jobs for debugging
  };
}
```

**Queues:**
1. **recipe-execution** - Main job queue for recipe processing
2. **scheduled-cleanup** - Periodic cleanup tasks (future)

#### 2.2 Worker Configuration

**Worker Settings:**
```typescript
interface WorkerConfig {
  concurrency: number;       // Max concurrent jobs (default: 5)
  limiter: {
    max: number;            // Max jobs per duration
    duration: number;       // Time window (ms)
  };
  settings: {
    stalledInterval: number;  // Check for stalled jobs (ms)
    maxStalledCount: number;  // Mark as failed after N stalls
  };
}
```

**Concurrency Strategy:**
- Development: 2 concurrent jobs (low resource usage)
- Production: 10 concurrent jobs (configurable via env)
- Rate limiting: Max 50 jobs per minute (Shopify API limits)

#### 2.3 Job Payload Schema

**Recipe Execution Job:**
```typescript
interface RecipeExecutionJobPayload {
  shop: string;              // Multi-tenant key
  event: string;             // Webhook topic (e.g., "customers/update")
  resourceId: string;        // Shopify GID
  resourceData: any;         // Full webhook payload
  priority?: number;         // Job priority (1=high, 5=normal, 10=low)
  metadata?: {
    webhookId: string;       // For tracking
    receivedAt: string;      // ISO timestamp
  };
}
```

**Scheduled Cleanup Job:**
```typescript
interface ScheduledCleanupJobPayload {
  cleanupType: 'old-logs' | 'stale-sessions';
  daysToKeep: number;
}
```

#### 2.4 Job Retry Strategy

**Retry Configuration:**
```typescript
{
  attempts: 3,               // Try 3 times total
  backoff: {
    type: 'exponential',
    delay: 5000             // 5s, 25s, 125s (5^n seconds)
  }
}
```

**Retryable Errors:**
- Network timeouts
- Shopify rate limit errors (429)
- Temporary Redis connection issues
- Temporary MongoDB connection issues

**Non-Retryable Errors:**
- Invalid job payload (missing required fields)
- Recipe not found
- Recipe disabled
- Shopify API validation errors (invalid input)

#### 2.5 Job Monitoring

**Metrics to Track:**
```typescript
interface JobMetrics {
  shop: string;
  queueName: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgDuration: number;       // Average job duration (ms)
  successRate: number;       // Percentage (0-100)
  lastProcessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Store in MongoDB:**
- Collection: `job_metrics`
- TTL: 30 days
- Aggregated by shop, queue, day

### Design Decisions

**Decision 1: BullMQ vs Agenda vs Bee-Queue**
- **Choice:** BullMQ
- **Rationale:**
  - Best TypeScript support
  - Active maintenance (most GitHub stars)
  - Built on Redis (we already use Redis)
  - Advanced features (priority, rate limiting, repeatable jobs)
  - Excellent documentation
- **Trade-off:** More complex than simpler alternatives
- **Alternatives considered:**
  - Agenda (MongoDB-based, but slower)
  - Bee-Queue (simpler but fewer features)

**Decision 2: Workers in Same Process (Dev) vs Separate Process (Prod)**
- **Choice:** Configurable - same process for dev, separate for prod
- **Rationale:**
  - Dev: Simpler setup, faster iteration
  - Prod: Independent scaling, fault isolation
  - Use `NODE_ENV` to determine mode
- **Implementation:**
  - Dev: Start workers in `entry.server.ts` (same process)
  - Prod: Run workers via separate script (`pnpm workers:start`)

**Decision 3: Job Payload Size Limit**
- **Choice:** Store full webhook payload in job (no size limit initially)
- **Rationale:**
  - Webhook payloads typically <100KB
  - Avoids additional database lookups
  - Redis can handle it (default max value size: 512MB)
  - Simplifies debugging (full context in job)
- **Trade-off:** Larger Redis memory usage
- **Future optimization:** Store only resource ID, fetch data in worker (if payloads grow large)

**Decision 4: Failed Job Retention**
- **Choice:** Keep failed jobs indefinitely (don't auto-delete)
- **Rationale:**
  - Need to debug failures
  - Show errors in activity log UI
  - Allows manual retry
- **Implementation:**
  - `removeOnFail: false` in job options
  - Manual cleanup script for old failed jobs (future)

**Decision 5: Job Priority Levels**
- **Choice:** 3 levels - high (1), normal (5), low (10)
- **Rationale:**
  - High: Customer-facing operations (order updates)
  - Normal: Standard automation (product tagging)
  - Low: Bulk operations (future), cleanup tasks
- **Implementation:** Set priority when enqueueing job

**Decision 6: Job Metrics Storage**
- **Choice:** Store aggregated metrics in MongoDB (not Redis)
- **Rationale:**
  - Persistent storage (Redis is cache)
  - Easy to query and display in UI
  - Can aggregate by shop, date, queue
- **Trade-off:** Extra MongoDB writes, but metrics are low-volume

### Error Handling Strategy

**Error Categories:**

1. **Job Validation Errors** (Non-Retryable)
   - Missing required fields
   - Invalid shop format
   - Action: Fail immediately, log error

2. **Recipe Errors** (Non-Retryable)
   - Recipe not found
   - Recipe disabled
   - Action: Fail immediately, log warning

3. **API Errors** (Retryable)
   - Shopify rate limits (429)
   - Network timeouts
   - Action: Retry with backoff (max 3 attempts)

4. **System Errors** (Retryable)
   - MongoDB connection lost
   - Redis connection lost
   - Action: Retry with backoff

**Error Logging:**
```typescript
// Log all errors to AutomationLog
await AutomationLog.logError(shop, `Job failed: ${error.message}`, {
  jobId: job.id,
  queueName: queue.name,
  payload: job.data,
  errorStack: error.stack
});
```

### Performance Considerations

**Optimization 1: Connection Pooling**
```typescript
// ✅ GOOD: Reuse Redis connection for all queues
const connection = new IORedis(process.env.REDIS_URL);
const recipeQueue = new Queue('recipe-execution', { connection });
const cleanupQueue = new Queue('scheduled-cleanup', { connection });
```

**Optimization 2: Concurrency Limits**
```typescript
// ✅ GOOD: Limit concurrent jobs to avoid overwhelming Shopify API
const worker = new Worker('recipe-execution', processor, {
  concurrency: 10,  // Max 10 jobs at once
  limiter: {
    max: 50,        // Max 50 jobs per minute
    duration: 60000
  }
});
```

**Optimization 3: Lean Database Queries**
```typescript
// ✅ GOOD: Use lean() when fetching recipe
const recipe = await Recipe.findById(recipeId).lean();
```

**Expected Performance:**
- **Job enqueue time:** <50ms
- **Job processing time:** 500-2000ms (depends on recipe complexity)
- **Queue throughput:** 50 jobs/minute (Shopify rate limit)
- **Worker startup time:** <5 seconds

---

## 3. Breakdown (Detailed Task List with Acceptance Criteria)

### 3.1 BullMQ Setup and Configuration

#### Task 3.1.1: Install BullMQ Dependencies
**File:** `package.json`

**Description:**
Install BullMQ, IORedis, and related dependencies.

**Acceptance Criteria:**
- [ ] `bullmq` added to dependencies
- [ ] `ioredis` added to dependencies (if not already present)
- [ ] `@types/ioredis` added to devDependencies
- [ ] Packages installed via `pnpm install`

**Implementation:**
```bash
pnpm add bullmq ioredis
pnpm add -D @types/ioredis
```

**Definition of Done:**
- Can import: `import { Queue, Worker } from 'bullmq'`
- TypeScript types available

---

#### Task 3.1.2: Create BullMQ Connection Config
**File:** `app/jobs/config/bullmq.ts`

**Description:**
Create Redis connection configuration for BullMQ.

**Acceptance Criteria:**
- [ ] Redis connection configuration exported
- [ ] Connection URL from environment variable
- [ ] Connection error handling
- [ ] TypeScript types defined

**Implementation:**
```typescript
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
  removeOnFail: false,   // Keep failed jobs for debugging
};
```

**Definition of Done:**
- Connection function works
- Error handlers registered
- Can be imported in other modules

---

#### Task 3.1.3: Create Queue Definitions
**File:** `app/jobs/config/queues.ts`

**Description:**
Define all job queues (recipe-execution, scheduled-cleanup).

**Acceptance Criteria:**
- [ ] Queue instances created and exported
- [ ] Each queue uses shared Redis connection
- [ ] Default job options applied
- [ ] TypeScript types for queue names

**Implementation:**
```typescript
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
```

**Definition of Done:**
- All queues created
- Can enqueue jobs: `recipeExecutionQueue.add('job-name', payload)`
- TypeScript autocomplete works

---

### 3.2 Job Payload Types

#### Task 3.2.1: Create Job Payload Types
**File:** `app/jobs/jobs/types.ts`

**Description:**
Define TypeScript interfaces for all job payloads.

**Acceptance Criteria:**
- [ ] Interface for RecipeExecutionJobPayload
- [ ] Interface for ScheduledCleanupJobPayload
- [ ] JSDoc comments on all fields
- [ ] Exported for use in workers and handlers

**Implementation:**
```typescript
/**
 * Payload for recipe execution job.
 *
 * Triggered by Shopify webhooks.
 */
export interface RecipeExecutionJobPayload {
  /** Shopify shop domain (multi-tenant key) */
  shop: string;

  /** Webhook topic (e.g., "customers/update") */
  event: string;

  /** Shopify resource GID (e.g., "gid://shopify/Customer/123") */
  resourceId: string;

  /** Full webhook payload from Shopify */
  resourceData: any;

  /** Job priority (1=high, 5=normal, 10=low) */
  priority?: number;

  /** Additional metadata for tracking */
  metadata?: {
    webhookId?: string;
    receivedAt?: string; // ISO timestamp
  };
}

/**
 * Payload for scheduled cleanup job.
 */
export interface ScheduledCleanupJobPayload {
  /** Type of cleanup to perform */
  cleanupType: 'old-logs' | 'stale-sessions';

  /** Days of data to keep (older data deleted) */
  daysToKeep: number;
}

/**
 * Job result (returned by worker processor).
 */
export interface JobResult {
  success: boolean;
  recipesEvaluated?: number;
  recipesMatched?: number;
  actionsExecuted?: number;
  errors?: string[];
  duration: number;
}
```

**Definition of Done:**
- All interfaces defined
- Can be imported and used

---

### 3.3 Recipe Execution Job and Worker

#### Task 3.3.1: Create Recipe Execution Job Class
**File:** `app/jobs/jobs/RecipeExecutionJob.ts`

**Description:**
Create job class for recipe execution with enqueue helper.

**Acceptance Criteria:**
- [ ] Static method `enqueue(payload)` to add job to queue
- [ ] Validates payload before enqueueing
- [ ] Sets job priority
- [ ] Returns job ID
- [ ] Unit tests

**Implementation:**
```typescript
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
    const job = await recipeExecutionQueue.add(
      'execute-recipe',
      payload,
      {
        priority: payload.priority || 5, // Default: normal priority
        jobId: `${payload.shop}-${payload.event}-${Date.now()}`, // Unique ID
      }
    );

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
```

**Definition of Done:**
- Can enqueue job: `RecipeExecutionJob.enqueue(payload)`
- Job appears in Redis queue
- Tests pass

---

#### Task 3.3.2: Create Recipe Execution Worker
**File:** `app/jobs/workers/recipeExecutionWorker.ts`

**Description:**
Create worker to process recipe execution jobs.

**Acceptance Criteria:**
- [ ] Worker processes jobs from recipe-execution queue
- [ ] Calls Recipe Engine to execute recipes
- [ ] Handles errors and retries
- [ ] Updates job metrics
- [ ] Logs to AutomationLog
- [ ] Integration tests

**Implementation:**
```typescript
import { Worker, Job } from 'bullmq';
import { getBullMQConnection } from '../config/bullmq';
import { QUEUE_NAMES } from '../config/queues';
import type { RecipeExecutionJobPayload, JobResult } from '../jobs/types';
import { recipeEngine } from '~/services/recipeEngine';
import { connectToMongoDB } from '~/mongoose.server';
import { authenticate } from '~/shopify.server';
import { updateJobMetrics } from '../monitoring/jobMetrics';
import { AutomationLog } from '~/models/AutomationLog';

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
    // Note: In webhook context, we need to create admin client from stored access token
    // This will be implemented in Epic 1-009 (Webhook Handlers)
    // For now, assume we have access to admin context
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
 * Get Shopify Admin API context from stored access token.
 *
 * TODO: Implement in Epic 1-009
 */
async function getAdminContext(shop: string): Promise<any> {
  // This will be implemented when we have webhook handlers
  // For now, return mock
  throw new Error('Not implemented - will be added in Epic 1-009');
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
      max: 50,       // Max 50 jobs per minute
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
```

**Definition of Done:**
- Worker processes jobs correctly
- Errors trigger retries
- Metrics updated
- Event handlers working

---

### 3.4 Job Metrics and Monitoring

#### Task 3.4.1: Create Job Metrics Model
**File:** `app/models/JobMetric.ts`

**Description:**
Create Mongoose model for storing job metrics.

**Acceptance Criteria:**
- [ ] Schema defined with all fields
- [ ] TTL index (30 days retention)
- [ ] Compound index on shop + queue + date
- [ ] Static method for updating metrics
- [ ] Unit tests

**Implementation:**
```typescript
import { Schema, model, Document } from 'mongoose';

export interface IJobMetric extends Document {
  shop: string;
  queueName: string;
  date: Date;                 // Aggregated by day
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalDuration: number;      // Sum of all job durations
  avgDuration: number;        // Average duration
  successRate: number;        // Percentage (0-100)
  lastProcessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobMetricSchema = new Schema<IJobMetric>(
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

export const JobMetric = model<IJobMetric>('JobMetric', JobMetricSchema);
export default JobMetric;
```

**Definition of Done:**
- Model works
- Metrics update correctly
- TTL index configured

---

#### Task 3.4.2: Create Job Metrics Service
**File:** `app/jobs/monitoring/jobMetrics.ts`

**Description:**
Create service wrapper for updating job metrics.

**Acceptance Criteria:**
- [ ] Function `updateJobMetrics(params)` wraps JobMetric.updateMetrics
- [ ] Error handling (failed metric updates don't crash worker)
- [ ] TypeScript types

**Implementation:**
```typescript
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
```

**Definition of Done:**
- Update function works
- Get function works
- Error handling tested

---

### 3.5 Worker Management

#### Task 3.5.1: Create Worker Manager
**File:** `app/jobs/workers/index.ts`

**Description:**
Create module to start/stop all workers.

**Acceptance Criteria:**
- [ ] Function `startWorkers()` starts all workers
- [ ] Function `stopWorkers()` gracefully stops all workers
- [ ] Handles process signals (SIGTERM, SIGINT)
- [ ] Logs worker status

**Implementation:**
```typescript
import { recipeExecutionWorker } from './recipeExecutionWorker';
// Import other workers as they're created

const workers = [recipeExecutionWorker];

/**
 * Start all BullMQ workers.
 */
export async function startWorkers(): Promise<void> {
  console.log('Starting BullMQ workers...');

  for (const worker of workers) {
    console.log(`Started worker: ${worker.name}`);
  }

  // Graceful shutdown on process signals
  process.on('SIGTERM', () => stopWorkers());
  process.on('SIGINT', () => stopWorkers());
}

/**
 * Stop all workers gracefully.
 */
export async function stopWorkers(): Promise<void> {
  console.log('Stopping BullMQ workers...');

  for (const worker of workers) {
    await worker.close();
    console.log(`Stopped worker: ${worker.name}`);
  }

  process.exit(0);
}

/**
 * Check if workers should run in this process.
 *
 * In development: workers run in same process as web server
 * In production: workers run in separate process
 */
export function shouldRunWorkers(): boolean {
  // Check environment variable
  if (process.env.RUN_WORKERS === 'false') {
    return false;
  }

  // In production, only run workers if explicitly enabled
  if (process.env.NODE_ENV === 'production') {
    return process.env.RUN_WORKERS === 'true';
  }

  // In development, run workers by default
  return true;
}
```

**Definition of Done:**
- Can start all workers: `startWorkers()`
- Can stop all workers: `stopWorkers()`
- Graceful shutdown works

---

#### Task 3.5.2: Integrate Workers with Remix Server
**File:** `app/entry.server.tsx`

**Description:**
Start workers when Remix server starts (development mode).

**Acceptance Criteria:**
- [ ] Workers start when server starts (if `shouldRunWorkers()` is true)
- [ ] Workers don't start in production (separate process)
- [ ] No impact on server startup time

**Implementation:**
```typescript
// Add to app/entry.server.tsx

import { startWorkers, shouldRunWorkers } from '~/jobs/workers';

// Start workers if enabled
if (shouldRunWorkers()) {
  startWorkers().catch((error) => {
    console.error('Failed to start workers:', error);
  });
}

// Rest of entry.server.tsx code...
```

**Definition of Done:**
- Workers start in development mode
- Workers don't start in production (unless RUN_WORKERS=true)
- Server starts normally

---

### 3.6 Testing Tasks

#### Task 3.6.1: Write Job Enqueue Tests
**File:** `test/jobs/RecipeExecutionJob.test.ts`

**Description:**
Unit tests for job enqueueing.

**Acceptance Criteria:**
- [ ] Test: Enqueue job successfully
- [ ] Test: Job validation (missing required fields)
- [ ] Test: Job priority setting
- [ ] Test: Bulk enqueue
- [ ] Code coverage >80%

**Definition of Done:**
- All tests pass
- Jobs added to Redis queue

---

#### Task 3.6.2: Write Worker Tests
**File:** `test/jobs/workers/recipeExecutionWorker.test.ts`

**Description:**
Integration tests for recipe execution worker.

**Acceptance Criteria:**
- [ ] Test: Worker processes job successfully
- [ ] Test: Worker retries on failure
- [ ] Test: Worker updates metrics
- [ ] Test: Worker logs errors
- [ ] Code coverage >70%

**Definition of Done:**
- All tests pass
- Mocked Recipe Engine
- Test Redis instance

---

#### Task 3.6.3: Write Metrics Tests
**File:** `test/models/JobMetric.test.ts`

**Description:**
Unit tests for job metrics model.

**Acceptance Criteria:**
- [ ] Test: Metrics update correctly
- [ ] Test: Average duration calculated
- [ ] Test: Success rate calculated
- [ ] Test: TTL index works
- [ ] Code coverage >80%

**Definition of Done:**
- All tests pass
- Metrics calculation verified

---

### 3.7 Documentation Tasks

#### Task 3.7.1: Add JSDoc Comments
**Files:** `app/jobs/**/*.ts`

**Description:**
Add comprehensive JSDoc to all job-related code.

**Acceptance Criteria:**
- [ ] All exported functions documented
- [ ] All classes documented
- [ ] Examples included

**Definition of Done:**
- TypeScript IntelliSense shows docs

---

#### Task 3.7.2: Create Job Queue Guide
**File:** `docs/job-queue-guide.md`

**Description:**
Create developer guide for job queue system.

**Acceptance Criteria:**
- [ ] Document how to enqueue jobs
- [ ] Document worker configuration
- [ ] Document monitoring and metrics
- [ ] Include troubleshooting section

**Definition of Done:**
- Guide complete and accurate

---

#### Task 3.7.3: Update ARCHITECTURE.md
**File:** `docs/ARCHITECTURE.md`

**Description:**
Update architecture doc with job queue implementation.

**Acceptance Criteria:**
- [ ] Job queue architecture diagram added
- [ ] Worker configuration documented
- [ ] Mark job queue as complete in roadmap

**Definition of Done:**
- ARCHITECTURE.md updated

---

## 4. Implementation Order

### Week 1: Setup and Core Implementation (Days 1-3)

**Day 1: BullMQ Setup**
1. Task 3.1.1: Install BullMQ Dependencies (15 min)
2. Task 3.1.2: Create BullMQ Connection Config (1 hour)
3. Task 3.1.3: Create Queue Definitions (1.5 hours)
4. Task 3.2.1: Create Job Payload Types (1 hour)
5. Manual test: Enqueue and process test job (1 hour)

**Day 2: Jobs and Workers**
1. Task 3.3.1: Create Recipe Execution Job Class (2 hours)
2. Task 3.3.2: Create Recipe Execution Worker (3 hours)
3. Task 3.4.1: Create Job Metrics Model (2 hours)

**Day 3: Monitoring and Management**
1. Task 3.4.2: Create Job Metrics Service (1.5 hours)
2. Task 3.5.1: Create Worker Manager (2 hours)
3. Task 3.5.2: Integrate Workers with Remix Server (1 hour)

### Week 2: Testing and Documentation (Days 4-6)

**Day 4: Testing**
1. Task 3.6.1: Write Job Enqueue Tests (2 hours)
2. Task 3.6.2: Write Worker Tests (3 hours)
3. Task 3.6.3: Write Metrics Tests (1.5 hours)

**Day 5: Documentation and Polish**
1. Task 3.7.1: Add JSDoc Comments (2 hours)
2. Task 3.7.2: Create Job Queue Guide (2 hours)
3. Task 3.7.3: Update ARCHITECTURE.md (1 hour)

**Day 6: Final Testing**
1. Run full test suite (30 min)
2. Performance testing (1 hour)
3. End-to-end test with webhook simulation (2 hours)
4. Code review (2 hours)

---

## 5. Code Quality Requirements

### TypeScript Standards
- Strict typing, no `any` without justification
- All job payloads typed
- Worker processors typed

### Testing Requirements
- Unit tests for all job classes
- Integration tests for workers
- Mock Recipe Engine in tests
- Code coverage >75%

### Performance Requirements
- Job enqueue <50ms
- Worker startup <5 seconds
- Process 50 jobs/minute minimum

### Error Handling
- All errors caught and logged
- Failed jobs kept for debugging
- Retry logic for transient errors

---

## 6. Files to Create/Modify

### New Files (15 files)

**Configuration:**
1. `app/jobs/config/bullmq.ts`
2. `app/jobs/config/queues.ts`

**Jobs:**
3. `app/jobs/jobs/types.ts`
4. `app/jobs/jobs/RecipeExecutionJob.ts`

**Workers:**
5. `app/jobs/workers/recipeExecutionWorker.ts`
6. `app/jobs/workers/index.ts`

**Monitoring:**
7. `app/jobs/monitoring/jobMetrics.ts`
8. `app/models/JobMetric.ts`

**Tests:**
9. `test/jobs/RecipeExecutionJob.test.ts`
10. `test/jobs/workers/recipeExecutionWorker.test.ts`
11. `test/models/JobMetric.test.ts`

**Documentation:**
12. `docs/job-queue-guide.md`

### Modified Files (3 files)

1. `package.json` - Add BullMQ dependencies
2. `app/entry.server.tsx` - Start workers
3. `docs/ARCHITECTURE.md` - Update implementation status

---

## 7. Acceptance Criteria

### Functional Requirements
- [ ] Can enqueue jobs: `RecipeExecutionJob.enqueue(payload)`
- [ ] Workers process jobs from queue
- [ ] Failed jobs retry automatically (max 3 attempts)
- [ ] Job metrics tracked in MongoDB
- [ ] Workers start/stop gracefully
- [ ] Workers run in development mode by default
- [ ] Workers configurable for production (separate process)

### Performance Requirements
- [ ] Job enqueue time <50ms
- [ ] Worker processes 50 jobs/minute
- [ ] Worker startup time <5 seconds

### Testing Requirements
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Code coverage >75%

---

## 8. Epic Completion Checklist

### Pre-Implementation
- [ ] Verify Epic 1-007 (Recipe Engine) complete
- [ ] Redis running
- [ ] Create `app/jobs/` directory

### Implementation Phase
- [ ] BullMQ setup (3.1.x)
- [ ] Job types (3.2.1)
- [ ] Jobs and workers (3.3.x)
- [ ] Metrics (3.4.x)
- [ ] Worker management (3.5.x)

### Testing Phase
- [ ] All tests written and passing (3.6.x)

### Documentation Phase
- [ ] JSDoc added (3.7.1)
- [ ] Guide created (3.7.2)
- [ ] ARCHITECTURE.md updated (3.7.3)

### Final Review
- [ ] Full test suite passes
- [ ] Manual testing complete
- [ ] Mark epic-1-008 complete

---

## 9. Definition of Done vs Not Done

### ✅ DONE Examples

```typescript
// ✅ DONE: Can enqueue job
import { RecipeExecutionJob } from '~/jobs/jobs/RecipeExecutionJob';

const jobId = await RecipeExecutionJob.enqueue({
  shop: 'test-shop.myshopify.com',
  event: 'customers/update',
  resourceId: 'gid://shopify/Customer/123',
  resourceData: { /* webhook payload */ }
});

console.log(`Job enqueued: ${jobId}`); // ✅
```

### ❌ NOT DONE Examples

```typescript
// ❌ NOT DONE: Module not found
import { RecipeExecutionJob } from '~/jobs/jobs/RecipeExecutionJob';
// Error: Cannot find module
```

---

## 10. Notes and Considerations

### Redis Memory Usage
- Each job ~10-50KB depending on payload size
- 1000 jobs = ~10-50MB Redis memory
- Monitor Redis memory usage in production

### Worker Scaling
- Development: 2-5 concurrent workers
- Production: 10-20 concurrent workers
- Can scale horizontally by running multiple worker processes

### Future Enhancements
- Bull Board UI for job monitoring
- Job scheduling (cron-based recipes)
- Job chaining and workflows
- Custom retry strategies per job type

---

**Epic End**

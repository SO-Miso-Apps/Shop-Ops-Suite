import { recipeExecutionWorker } from './recipeExecutionWorker';

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

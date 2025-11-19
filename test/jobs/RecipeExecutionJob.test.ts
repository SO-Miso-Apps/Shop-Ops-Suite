import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { RecipeExecutionJob } from '~/jobs/jobs/RecipeExecutionJob';
import { recipeExecutionQueue } from '~/jobs/config/queues';
import type { RecipeExecutionJobPayload } from '~/jobs/jobs/types';

describe('RecipeExecutionJob', () => {
  beforeAll(async () => {
    // Clean queue before tests
    await recipeExecutionQueue.obliterate({ force: true });
  });

  afterAll(async () => {
    // Clean up after tests
    await recipeExecutionQueue.obliterate({ force: true });
    await recipeExecutionQueue.close();
  });

  beforeEach(async () => {
    // Clean queue between tests
    await recipeExecutionQueue.drain();
  });

  describe('enqueue()', () => {
    it('should enqueue a recipe execution job', async () => {
      const payload: RecipeExecutionJobPayload = {
        shop: 'test-shop.myshopify.com',
        event: 'products/update',
        resourceId: 'gid://shopify/Product/123',
        resourceData: {
          id: 'gid://shopify/Product/123',
          title: 'Test Product',
          tags: ['test'],
        },
      };

      const job = await RecipeExecutionJob.enqueue(payload);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data).toEqual(payload);
      expect(job.name).toBe('recipe-execution');

      // Verify job is in queue
      const jobs = await recipeExecutionQueue.getJobs(['waiting']);
      expect(jobs).toHaveLength(1);
      expect(jobs[0].data).toEqual(payload);
    });

    it('should assign unique job ID based on shop and event', async () => {
      const payload: RecipeExecutionJobPayload = {
        shop: 'test-shop.myshopify.com',
        event: 'products/update',
        resourceId: 'gid://shopify/Product/123',
        resourceData: { id: 'gid://shopify/Product/123' },
      };

      const job = await RecipeExecutionJob.enqueue(payload);

      expect(job.opts?.jobId).toBe('test-shop.myshopify.com:products/update:gid://shopify/Product/123');
    });

    it('should throw error if shop is missing', async () => {
      const payload = {
        shop: '',
        event: 'products/update',
        resourceId: 'gid://shopify/Product/123',
        resourceData: {},
      } as RecipeExecutionJobPayload;

      await expect(RecipeExecutionJob.enqueue(payload)).rejects.toThrow('Shop is required');
    });

    it('should throw error if event is missing', async () => {
      const payload = {
        shop: 'test-shop.myshopify.com',
        event: '',
        resourceId: 'gid://shopify/Product/123',
        resourceData: {},
      } as RecipeExecutionJobPayload;

      await expect(RecipeExecutionJob.enqueue(payload)).rejects.toThrow('Event is required');
    });

    it('should throw error if resourceId is missing', async () => {
      const payload = {
        shop: 'test-shop.myshopify.com',
        event: 'products/update',
        resourceId: '',
        resourceData: {},
      } as RecipeExecutionJobPayload;

      await expect(RecipeExecutionJob.enqueue(payload)).rejects.toThrow('Resource ID is required');
    });
  });

  describe('enqueueBulk()', () => {
    it('should enqueue multiple jobs at once', async () => {
      const payloads: RecipeExecutionJobPayload[] = [
        {
          shop: 'test-shop.myshopify.com',
          event: 'products/update',
          resourceId: 'gid://shopify/Product/1',
          resourceData: { id: 'gid://shopify/Product/1' },
        },
        {
          shop: 'test-shop.myshopify.com',
          event: 'products/update',
          resourceId: 'gid://shopify/Product/2',
          resourceData: { id: 'gid://shopify/Product/2' },
        },
        {
          shop: 'test-shop.myshopify.com',
          event: 'products/update',
          resourceId: 'gid://shopify/Product/3',
          resourceData: { id: 'gid://shopify/Product/3' },
        },
      ];

      const jobs = await RecipeExecutionJob.enqueueBulk(payloads);

      expect(jobs).toHaveLength(3);
      jobs.forEach((job, index) => {
        expect(job.data).toEqual(payloads[index]);
      });

      // Verify jobs are in queue
      const queuedJobs = await recipeExecutionQueue.getJobs(['waiting']);
      expect(queuedJobs).toHaveLength(3);
    });

    it('should handle empty array', async () => {
      const jobs = await RecipeExecutionJob.enqueueBulk([]);
      expect(jobs).toHaveLength(0);
    });

    it('should validate all payloads before enqueueing', async () => {
      const payloads: RecipeExecutionJobPayload[] = [
        {
          shop: 'test-shop.myshopify.com',
          event: 'products/update',
          resourceId: 'gid://shopify/Product/1',
          resourceData: {},
        },
        {
          shop: '', // Invalid
          event: 'products/update',
          resourceId: 'gid://shopify/Product/2',
          resourceData: {},
        },
      ];

      await expect(RecipeExecutionJob.enqueueBulk(payloads)).rejects.toThrow('Shop is required');

      // Verify no jobs were enqueued
      const queuedJobs = await recipeExecutionQueue.getJobs(['waiting']);
      expect(queuedJobs).toHaveLength(0);
    });
  });

  describe('Job deduplication', () => {
    it('should not create duplicate jobs for same resource', async () => {
      const payload: RecipeExecutionJobPayload = {
        shop: 'test-shop.myshopify.com',
        event: 'products/update',
        resourceId: 'gid://shopify/Product/123',
        resourceData: { id: 'gid://shopify/Product/123' },
      };

      // Enqueue same job twice
      const job1 = await RecipeExecutionJob.enqueue(payload);
      const job2 = await RecipeExecutionJob.enqueue(payload);

      // Should be the same job ID
      expect(job1.opts?.jobId).toBe(job2.opts?.jobId);

      // Should only have 1 job in queue
      const jobs = await recipeExecutionQueue.getJobs(['waiting']);
      expect(jobs).toHaveLength(1);
    });
  });
});

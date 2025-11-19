import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectToMongoDB, disconnectFromMongoDB } from '~/mongoose.server';
import { JobMetric } from '~/models/JobMetric';

describe('JobMetric Model', () => {
  beforeAll(async () => {
    await connectToMongoDB();
  });

  afterAll(async () => {
    await disconnectFromMongoDB();
  });

  beforeEach(async () => {
    await JobMetric.deleteMany({});
  });

  describe('Schema validation', () => {
    it('should create a valid job metric', async () => {
      const metric = await JobMetric.create({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        date: new Date('2025-01-01'),
        totalJobs: 10,
        completedJobs: 8,
        failedJobs: 2,
        totalDuration: 5000,
        avgDuration: 500,
        successRate: 80,
      });

      expect(metric).toBeDefined();
      expect(metric.shop).toBe('test-shop.myshopify.com');
      expect(metric.queueName).toBe('recipe-execution');
      expect(metric.totalJobs).toBe(10);
      expect(metric.completedJobs).toBe(8);
      expect(metric.failedJobs).toBe(2);
      expect(metric.successRate).toBe(80);
    });

    it('should require shop field', async () => {
      const metric = new JobMetric({
        queueName: 'recipe-execution',
        date: new Date(),
      });

      await expect(metric.save()).rejects.toThrow();
    });

    it('should require queueName field', async () => {
      const metric = new JobMetric({
        shop: 'test-shop.myshopify.com',
        date: new Date(),
      });

      await expect(metric.save()).rejects.toThrow();
    });

    it('should require date field', async () => {
      const metric = new JobMetric({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
      });

      await expect(metric.save()).rejects.toThrow();
    });

    it('should set default values for numeric fields', async () => {
      const metric = await JobMetric.create({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        date: new Date(),
      });

      expect(metric.totalJobs).toBe(0);
      expect(metric.completedJobs).toBe(0);
      expect(metric.failedJobs).toBe(0);
      expect(metric.totalDuration).toBe(0);
      expect(metric.avgDuration).toBe(0);
      expect(metric.successRate).toBe(0);
    });

    it('should validate successRate is between 0-100', async () => {
      const metric = new JobMetric({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        date: new Date(),
        successRate: 150, // Invalid
      });

      await expect(metric.save()).rejects.toThrow();
    });
  });

  describe('updateMetrics()', () => {
    it('should create new metric if none exists', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await JobMetric.updateMetrics({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        success: true,
        duration: 500,
      });

      const metric = await JobMetric.findOne({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        date: today,
      });

      expect(metric).toBeDefined();
      expect(metric!.totalJobs).toBe(1);
      expect(metric!.completedJobs).toBe(1);
      expect(metric!.failedJobs).toBe(0);
      expect(metric!.totalDuration).toBe(500);
      expect(metric!.avgDuration).toBe(500);
      expect(metric!.successRate).toBe(100);
    });

    it('should increment existing metric', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create initial metric
      await JobMetric.create({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        date: today,
        totalJobs: 5,
        completedJobs: 4,
        failedJobs: 1,
        totalDuration: 2500,
        avgDuration: 500,
        successRate: 80,
      });

      // Update with successful job
      await JobMetric.updateMetrics({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        success: true,
        duration: 600,
      });

      const metric = await JobMetric.findOne({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        date: today,
      });

      expect(metric!.totalJobs).toBe(6);
      expect(metric!.completedJobs).toBe(5);
      expect(metric!.failedJobs).toBe(1);
      expect(metric!.totalDuration).toBe(3100);
      expect(metric!.avgDuration).toBe(517); // 3100 / 6 rounded
      expect(metric!.successRate).toBe(83); // 5/6 * 100 rounded
    });

    it('should track failed jobs', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await JobMetric.updateMetrics({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        success: false,
        duration: 300,
      });

      const metric = await JobMetric.findOne({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        date: today,
      });

      expect(metric!.totalJobs).toBe(1);
      expect(metric!.completedJobs).toBe(0);
      expect(metric!.failedJobs).toBe(1);
      expect(metric!.successRate).toBe(0);
    });

    it('should update lastProcessedAt timestamp', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const beforeUpdate = new Date();

      await JobMetric.updateMetrics({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        success: true,
        duration: 500,
      });

      const metric = await JobMetric.findOne({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        date: today,
      });

      expect(metric!.lastProcessedAt).toBeDefined();
      expect(metric!.lastProcessedAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('should handle multiple queues for same shop', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await JobMetric.updateMetrics({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        success: true,
        duration: 500,
      });

      await JobMetric.updateMetrics({
        shop: 'test-shop.myshopify.com',
        queueName: 'scheduled-cleanup',
        success: true,
        duration: 1000,
      });

      const metrics = await JobMetric.find({
        shop: 'test-shop.myshopify.com',
        date: today,
      });

      expect(metrics).toHaveLength(2);
      expect(metrics.map((m) => m.queueName).sort()).toEqual(['recipe-execution', 'scheduled-cleanup']);
    });
  });

  describe('Multi-tenancy', () => {
    it('should isolate metrics by shop', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await JobMetric.updateMetrics({
        shop: 'shop1.myshopify.com',
        queueName: 'recipe-execution',
        success: true,
        duration: 500,
      });

      await JobMetric.updateMetrics({
        shop: 'shop2.myshopify.com',
        queueName: 'recipe-execution',
        success: true,
        duration: 600,
      });

      const shop1Metrics = await JobMetric.find({ shop: 'shop1.myshopify.com' });
      const shop2Metrics = await JobMetric.find({ shop: 'shop2.myshopify.com' });

      expect(shop1Metrics).toHaveLength(1);
      expect(shop2Metrics).toHaveLength(1);
      expect(shop1Metrics[0].totalJobs).toBe(1);
      expect(shop2Metrics[0].totalJobs).toBe(1);
    });
  });

  describe('Indexes', () => {
    it('should have compound index on shop, queueName, and date', async () => {
      const indexes = await JobMetric.collection.getIndexes();

      const compoundIndex = Object.values(indexes).find((index: any) =>
        index.shop === 1 && index.queueName === 1 && index.date === -1
      );

      expect(compoundIndex).toBeDefined();
    });

    it('should have TTL index on expiresAt', async () => {
      const indexes = await JobMetric.collection.getIndexes();

      const ttlIndex = Object.values(indexes).find((index: any) =>
        index.expiresAt === 1
      );

      expect(ttlIndex).toBeDefined();
    });
  });

  describe('TTL behavior', () => {
    it('should set expiresAt to 30 days from creation', async () => {
      const metric = await JobMetric.create({
        shop: 'test-shop.myshopify.com',
        queueName: 'recipe-execution',
        date: new Date(),
      });

      const expectedExpiry = new Date(metric.createdAt!.getTime() + 30 * 24 * 60 * 60 * 1000);

      expect(metric.expiresAt).toBeDefined();
      expect(Math.abs(metric.expiresAt!.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });
  });
});

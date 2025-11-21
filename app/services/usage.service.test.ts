import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsageService } from './usage.service';
import { Usage } from '../models/Usage';
import { BillingPlans } from '../enums/BillingPlans';

vi.mock('../models/Usage', () => ({
  Usage: {
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
  }
}));

vi.mock('../shopify.server', () => ({
  unauthenticated: {
    admin: vi.fn()
  }
}));

vi.mock('~/utils/get-plan', () => ({
  getPlan: vi.fn((plan: string) => plan === BillingPlans.Pro || plan === BillingPlans.ProAnnual ? 'Pro' : 'Free')
}));

describe('UsageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlanType', () => {
    it('should detect Pro plan subscription', async () => {
      const { unauthenticated } = await import('../shopify.server');
      const mockAdmin = {
        graphql: vi.fn().mockResolvedValue({
          json: async () => ({
            data: {
              currentAppInstallation: {
                activeSubscriptions: [
                  { id: '1', name: BillingPlans.Pro, status: 'ACTIVE' }
                ]
              }
            }
          })
        })
      };

      (unauthenticated.admin as any).mockResolvedValue({ admin: mockAdmin });

      const plan = await UsageService.getPlanType('test-shop');

      expect(plan).toBe(BillingPlans.Pro);
    });

    it('should detect Pro Annual plan subscription', async () => {
      const { unauthenticated } = await import('../shopify.server');
      const mockAdmin = {
        graphql: vi.fn().mockResolvedValue({
          json: async () => ({
            data: {
              currentAppInstallation: {
                activeSubscriptions: [
                  { id: '1', name: BillingPlans.ProAnnual, status: 'ACTIVE' }
                ]
              }
            }
          })
        })
      };

      (unauthenticated.admin as any).mockResolvedValue({ admin: mockAdmin });

      const plan = await UsageService.getPlanType('test-shop');

      expect(plan).toBe(BillingPlans.ProAnnual);
    });

    it('should default to Free plan when no subscription', async () => {
      const { unauthenticated } = await import('../shopify.server');
      const mockAdmin = {
        graphql: vi.fn().mockResolvedValue({
          json: async () => ({
            data: {
              currentAppInstallation: {
                activeSubscriptions: []
              }
            }
          })
        })
      };

      (unauthenticated.admin as any).mockResolvedValue({ admin: mockAdmin });

      const plan = await UsageService.getPlanType('test-shop');

      expect(plan).toBe('Free');
    });

    it('should default to Free plan on error', async () => {
      const { unauthenticated } = await import('../shopify.server');
      (unauthenticated.admin as any).mockRejectedValue(new Error('Network error'));

      const plan = await UsageService.getPlanType('test-shop');

      expect(plan).toBe('Free');
    });
  });

  describe('getCurrentUsage', () => {
    it('should return current month usage', async () => {
      const mockUsage = {
        shop: 'test-shop',
        month: '2025-11',
        operationCount: 150,
        lastOperation: new Date()
      };

      (Usage.findOne as any).mockResolvedValue(mockUsage);

      const result = await UsageService.getCurrentUsage('test-shop');

      expect(result.count).toBe(150);
      expect(result.month).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should return zero count if no usage record exists', async () => {
      (Usage.findOne as any).mockResolvedValue(null);

      const result = await UsageService.getCurrentUsage('test-shop');

      expect(result.count).toBe(0);
    });
  });

  describe('checkQuota', () => {
    it('should allow Pro plan unlimited operations', async () => {
      const { unauthenticated } = await import('../shopify.server');
      const mockAdmin = {
        graphql: vi.fn().mockResolvedValue({
          json: async () => ({
            data: {
              currentAppInstallation: {
                activeSubscriptions: [
                  { name: BillingPlans.Pro, status: 'ACTIVE' }
                ]
              }
            }
          })
        })
      };

      (unauthenticated.admin as any).mockResolvedValue({ admin: mockAdmin });
      (Usage.findOne as any).mockResolvedValue({ operationCount: 1000 });

      const result = await UsageService.checkQuota('test-shop', 500);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
    });

    it('should enforce 500 item limit for Free plan', async () => {
      const { unauthenticated } = await import('../shopify.server');
      const mockAdmin = {
        graphql: vi.fn().mockResolvedValue({
          json: async () => ({
            data: {
              currentAppInstallation: {
                activeSubscriptions: []
              }
            }
          })
        })
      };

      (unauthenticated.admin as any).mockResolvedValue({ admin: mockAdmin });
      (Usage.findOne as any).mockResolvedValue({ operationCount: 400 });

      const result = await UsageService.checkQuota('test-shop', 50);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(500);
      expect(result.current).toBe(400);
    });

    it('should reject operation exceeding Free plan limit', async () => {
      const { unauthenticated } = await import('../shopify.server');
      const mockAdmin = {
        graphql: vi.fn().mockResolvedValue({
          json: async () => ({
            data: {
              currentAppInstallation: {
                activeSubscriptions: []
              }
            }
          })
        })
      };

      (unauthenticated.admin as any).mockResolvedValue({ admin: mockAdmin });
      (Usage.findOne as any).mockResolvedValue({ operationCount: 490 });

      const result = await UsageService.checkQuota('test-shop', 20);

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Quota exceeded');
      expect(result.message).toContain('490/500');
    });
  });

  describe('recordOperation', () => {
    it('should record operation usage', async () => {
      (Usage.findOneAndUpdate as any).mockResolvedValue({
        shop: 'test-shop',
        month: '2025-11',
        operationCount: 100
      });

      await UsageService.recordOperation('test-shop', 50);

      expect(Usage.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ shop: 'test-shop' }),
        expect.objectContaining({
          $inc: { operationCount: 50 }
        }),
        expect.objectContaining({ upsert: true })
      );
    });

    it('should create new usage record if none exists', async () => {
      (Usage.findOneAndUpdate as any).mockResolvedValue({
        shop: 'test-shop',
        operationCount: 10
      });

      await UsageService.recordOperation('test-shop', 10);

      expect(Usage.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ upsert: true })
      );
    });
  });

  describe('getUsageHistory', () => {
    it('should return usage history for last N months', async () => {
      const mockHistory = [
        { shop: 'test-shop', month: '2025-11', operationCount: 100, lastOperation: new Date() },
        { shop: 'test-shop', month: '2025-10', operationCount: 200, lastOperation: new Date() }
      ];

      (Usage.find as any).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockHistory)
      });

      const result = await UsageService.getUsageHistory('test-shop', 3);

      expect(result).toHaveLength(3);
      expect(result[0].count).toBe(100);
    });

    it('should fill in missing months with zero counts', async () => {
      (Usage.find as any).mockReturnValue({
        sort: vi.fn().mockResolvedValue([])
      });

      const result = await UsageService.getUsageHistory('test-shop', 2);

      expect(result).toHaveLength(2);
      expect(result.every((r: any) => r.count === 0)).toBe(true);
    });
  });
});

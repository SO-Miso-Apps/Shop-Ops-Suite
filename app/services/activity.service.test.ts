import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityService } from './activity.service';
import { ActivityLog } from '../models/ActivityLog';

// Mock ActivityLog Model
vi.mock('../models/ActivityLog', () => ({
  ActivityLog: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  }
}));

describe('ActivityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCategoryFromAction', () => {
    it('should return Tags category for Smart Tag Applied', () => {
      const category = ActivityService.getCategoryFromAction('Smart Tag Applied');
      expect(category).toBe('Tags');
    });

    it('should return Bulk Operations for Bulk Update', () => {
      const category = ActivityService.getCategoryFromAction('Bulk Update');
      expect(category).toBe('Bulk Operations');
    });

    it('should return Metafields for COGS Updated', () => {
      const category = ActivityService.getCategoryFromAction('COGS Updated');
      expect(category).toBe('Metafields');
    });

    it('should return System for unknown action', () => {
      const category = ActivityService.getCategoryFromAction('Unknown Action');
      expect(category).toBe('System');
    });

    it('should match partial action names', () => {
      const category = ActivityService.getCategoryFromAction('Bulk Operation Completed');
      expect(category).toBe('Bulk Operations');
    });
  });

  describe('getLogs', () => {
    it('should fetch logs with pagination', async () => {
      const mockLogs = [
        {
          _id: '123',
          shop: 'test-shop',
          resourceType: 'product',
          resourceId: 'gid://shopify/Product/1',
          action: 'Smart Tag Applied',
          category: 'Tags',
          details: [{ message: 'Tag added', timestamp: new Date() }],
          status: 'Success',
          timestamp: new Date(),
          jobId: 'job-1',
        }
      ];

      (ActivityLog.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockLogs)
          })
        })
      });

      (ActivityLog.countDocuments as any).mockResolvedValue(1);

      const result = await ActivityService.getLogs('test-shop', 50);

      expect(result.logs).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.currentPage).toBe(1);
      expect(result.logs[0].id).toBe('123');
    });

    it('should filter logs by category', async () => {
      (ActivityLog.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      (ActivityLog.countDocuments as any).mockResolvedValue(0);

      await ActivityService.getLogs('test-shop', 50, { category: 'Tags' });

      expect(ActivityLog.find).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Tags' })
      );
    });

    it('should filter logs by status', async () => {
      (ActivityLog.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      (ActivityLog.countDocuments as any).mockResolvedValue(0);

      await ActivityService.getLogs('test-shop', 50, { status: ['Success', 'Failed'] });

      expect(ActivityLog.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: ['Success', 'Failed'] }
        })
      );
    });

    it('should filter logs by search query', async () => {
      (ActivityLog.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      (ActivityLog.countDocuments as any).mockResolvedValue(0);

      await ActivityService.getLogs('test-shop', 50, { search: 'bulk' });

      expect(ActivityLog.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ action: expect.anything() })
          ])
        })
      );
    });

    it('should filter logs by date range', async () => {
      (ActivityLog.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      (ActivityLog.countDocuments as any).mockResolvedValue(0);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await ActivityService.getLogs('test-shop', 50, { startDate, endDate });

      expect(ActivityLog.find).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: { $gte: startDate, $lte: endDate }
        })
      );
    });

    it('should handle backward compatibility for old string detail format', async () => {
      const mockLogs = [
        {
          _id: '456',
          shop: 'test-shop',
          resourceType: 'order',
          resourceId: 'gid://shopify/Order/1',
          action: 'Tag Cleanup',
          detail: 'Old string format detail',  // Old format
          status: 'Success',
          timestamp: new Date(),
        }
      ];

      (ActivityLog.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockLogs)
          })
        })
      });

      (ActivityLog.countDocuments as any).mockResolvedValue(1);

      const result = await ActivityService.getLogs('test-shop', 50);

      expect(result.logs[0].details).toHaveLength(1);
      expect(result.logs[0].details[0].message).toBe('Old string format detail');
    });
  });

  describe('createLog', () => {
    it('should create new activity log', async () => {
      const mockLog = {
        _id: '789',
        shop: 'test-shop',
        resourceType: 'product',
        resourceId: 'gid://shopify/Product/1',
        action: 'Metafield Updated',
        category: 'Metafields',
        details: [{ message: 'Test detail', timestamp: expect.any(Date) }],
        status: 'Success',
        jobId: 'job-123',
      };

      (ActivityLog.findOne as any).mockResolvedValue(null);
      (ActivityLog.create as any).mockResolvedValue(mockLog);

      const result = await ActivityService.createLog({
        shop: 'test-shop',
        resourceType: 'product',
        resourceId: 'gid://shopify/Product/1',
        action: 'Metafield Updated',
        detail: 'Test detail',
        status: 'Success',
        jobId: 'job-123',
      });

      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shop: 'test-shop',
          action: 'Metafield Updated',
          category: 'Metafields',
        })
      );

      expect(result).toEqual(mockLog);
    });

    it('should update existing log if jobId matches', async () => {
      const existingLog = {
        shop: 'test-shop',
        jobId: 'job-123',
        details: [{ message: 'First detail', timestamp: new Date() }],
        status: 'Pending',
        timestamp: new Date(),
        save: vi.fn().mockResolvedValue(true),
      };

      (ActivityLog.findOne as any).mockResolvedValue(existingLog);

      await ActivityService.createLog({
        shop: 'test-shop',
        resourceType: 'product',
        resourceId: 'gid://shopify/Product/1',
        action: 'Bulk Update',
        detail: 'Second detail',
        status: 'Success',
        jobId: 'job-123',
      });

      expect(existingLog.details).toHaveLength(2);
      expect(existingLog.status).toBe('Success');
      expect(existingLog.save).toHaveBeenCalled();
    });

    it('should auto-detect category from action', async () => {
      (ActivityLog.findOne as any).mockResolvedValue(null);
      (ActivityLog.create as any).mockResolvedValue({});

      await ActivityService.createLog({
        shop: 'test-shop',
        resourceType: 'order',
        resourceId: 'gid://shopify/Order/1',
        action: 'Tag Cleanup',
        detail: 'Cleaned unused tags',
      });

      expect(ActivityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Data Cleaning',
        })
      );
    });
  });

  describe('getCategoryStats', () => {
    it('should return category statistics', async () => {
      const mockStats = [
        { _id: 'Tags', count: 10, successCount: 8, failedCount: 2 },
        { _id: 'Metafields', count: 5, successCount: 5, failedCount: 0 },
        { _id: 'Bulk Operations', count: 3, successCount: 2, failedCount: 1 },
      ];

      (ActivityLog.aggregate as any).mockResolvedValue(mockStats);

      const result = await ActivityService.getCategoryStats('test-shop');

      expect(result).toEqual(mockStats);
      expect(ActivityLog.aggregate).toHaveBeenCalled();
    });

    it('should handle empty stats', async () => {
      (ActivityLog.aggregate as any).mockResolvedValue([]);

      const result = await ActivityService.getCategoryStats('test-shop');

      expect(result).toEqual([]);
    });
  });
});

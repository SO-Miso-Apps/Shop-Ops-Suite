import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from './dashboard.service';
import { TaggingRule } from '../models/TaggingRule';
import { ActivityService } from './activity.service';

// Mock dependencies
vi.mock('../models/TaggingRule', () => ({
  TaggingRule: {
    countDocuments: vi.fn(),
    find: vi.fn(),
  }
}));

vi.mock('./activity.service', () => ({
  ActivityService: {
    getCategoryStats: vi.fn(),
    getLogs: vi.fn(),
  }
}));

vi.mock('./usage.service', () => ({
  UsageService: {
    getPlanType: vi.fn().mockResolvedValue('Pro'),
  }
}));

vi.mock('../models/ActivityLog', () => ({
  ActivityLog: {
    aggregate: vi.fn(),
    exists: vi.fn(),
  }
}));

vi.mock('../models/Settings', () => ({
  Settings: {
    findOne: vi.fn(),
  }
}));

describe('DashboardService', () => {
  const mockAdmin = {
    graphql: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default ActivityLog.aggregate() mock
    const { ActivityLog } = await import('../models/ActivityLog');
    (ActivityLog.aggregate as any).mockResolvedValue([]);
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data', async () => {
      // Mock shop data
      mockAdmin.graphql.mockImplementation((query: string) => {
        if (query.includes('shop')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                shop: { billingAddress: { countryCode: 'US' } },
                ordersCount: { count: 150 },
                productsCount: { count: 50 },
              }
            })
          });
        }
        if (query.includes('orders')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                orders: {
                  nodes: [
                    {
                      id: 'gid://shopify/Order/1',
                      totalPriceSet: { shopMoney: { amount: '1500' } },
                      shippingAddress: { countryCode: 'CA' }
                    }
                  ]
                }
              }
            })
          });
        }
        if (query.includes('products')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                products: {
                  nodes: [
                    {
                      id: 'gid://shopify/Product/1',
                      tags: ['Sale', 'New'],
                      variants: {
                        nodes: [{
                          inventoryItem: {
                            unitCost: { amount: '10.00' }
                          }
                        }]
                      }
                    }
                  ]
                }
              }
            })
          });
        }
        return Promise.resolve({ json: async () => ({}) });
      });

      (TaggingRule.countDocuments as any).mockResolvedValue(5);
      (TaggingRule.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { ruleId: 'rule1', name: 'Test Rule' }
          ])
        })
      });

      (ActivityService.getCategoryStats as any).mockResolvedValue([
        { _id: 'Tags', count: 10 }
      ]);

      (ActivityService.getLogs as any).mockResolvedValue({
        logs: [{ id: '1', action: 'Test' }]
      });

      const result = await DashboardService.getDashboardData(mockAdmin, 'test-shop');

      expect(result.stats.totalOrders).toBe(150);
      expect(result.stats.totalProducts).toBe(50);
      expect(result.stats.activeRules).toBe(5);
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('charts');
      expect(result).toHaveProperty('recentActivities');
    });

    it('should detect international orders and suggest rule', async () => {
      mockAdmin.graphql.mockImplementation((query: string) => {
        if (query.includes('shop')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                shop: { billingAddress: { countryCode: 'US' } },
                ordersCount: { count: 100 },
                productsCount: { count: 30 },
              }
            })
          });
        }
        if (query.includes('orders')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                orders: {
                  nodes: [
                    { shippingAddress: { countryCode: 'CA' } },
                    { shippingAddress: { countryCode: 'UK' } },
                    { shippingAddress: { countryCode: 'FR' } },
                  ]
                }
              }
            })
          });
        }
        if (query.includes('products')) {
          return Promise.resolve({
            json: async () => ({
              data: { products: { nodes: [] } }
            })
          });
        }
        return Promise.resolve({ json: async () => ({}) });
      });

      (TaggingRule.countDocuments as any).mockResolvedValue(2);
      (TaggingRule.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { ruleId: 'rule1', name: 'Test Rule' }
          ])
        })
      });

      (ActivityService.getCategoryStats as any).mockResolvedValue([]);
      (ActivityService.getLogs as any).mockResolvedValue({ logs: [] });

      const result = await DashboardService.getDashboardData(mockAdmin, 'test-shop');

      const intlSuggestion = result.suggestions.find((s: any) => s.id === 'intl_orders');
      expect(intlSuggestion).toBeDefined();
      expect(intlSuggestion?.type).toBe('info');
    });

    it('should suggest adding costs for products without COGS', async () => {
      mockAdmin.graphql.mockImplementation((query: string) => {
        if (query.includes('shop')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                shop: { billingAddress: { countryCode: 'US' } },
                ordersCount: { count: 100 },
                productsCount: { count: 30 },
              }
            })
          });
        }
        if (query.includes('orders')) {
          return Promise.resolve({
            json: async () => ({
              data: { orders: { nodes: [] } }
            })
          });
        }
        if (query.includes('products')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                products: {
                  nodes: Array(10).fill({
                    variants: {
                      nodes: [{ inventoryItem: { unitCost: null } }]
                    }
                  })
                }
              }
            })
          });
        }
        return Promise.resolve({ json: async () => ({}) });
      });

      (TaggingRule.countDocuments as any).mockResolvedValue(1);
      (TaggingRule.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([])
        })
      });

      (ActivityService.getCategoryStats as any).mockResolvedValue([]);
      (ActivityService.getLogs as any).mockResolvedValue({ logs: [] });

      const result = await DashboardService.getDashboardData(mockAdmin, 'test-shop');

      const costSuggestion = result.suggestions.find((s: any) => s.id === 'missing_costs');
      expect(costSuggestion).toBeDefined();
      expect(costSuggestion?.type).toBe('warning');
    });

    it('should detect high-value orders and suggest VIP rule', async () => {
      mockAdmin.graphql.mockImplementation((query: string) => {
        if (query.includes('shop')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                shop: { billingAddress: { countryCode: 'US' } },
                ordersCount: { count: 100 },
                productsCount: { count: 30 },
              }
            })
          });
        }
        if (query.includes('orders')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                orders: {
                  nodes: [
                    { totalPriceSet: { shopMoney: { amount: '1500' } } },
                    { totalPriceSet: { shopMoney: { amount: '2000' } } },
                  ]
                }
              }
            })
          });
        }
        if (query.includes('products')) {
          return Promise.resolve({
            json: async () => ({
              data: { products: { nodes: [] } }
            })
          });
        }
        return Promise.resolve({ json: async () => ({}) });
      });

      (TaggingRule.countDocuments as any).mockResolvedValue(1);
      (TaggingRule.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([])
        })
      });

      (ActivityService.getCategoryStats as any).mockResolvedValue([]);
      (ActivityService.getLogs as any).mockResolvedValue({ logs: [] });

      const result = await DashboardService.getDashboardData(mockAdmin, 'test-shop');

      const vipSuggestion = result.suggestions.find((s: any) => s.id === 'high_value');
      expect(vipSuggestion).toBeDefined();
      expect(vipSuggestion?.type).toBe('success');
    });

    it('should limit suggestions to top 3', async () => {
      mockAdmin.graphql.mockImplementation((query: string) => {
        if (query.includes('shop')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                shop: { billingAddress: { countryCode: 'US' } },
                ordersCount: { count: 100 },
                productsCount: { count: 30 },
              }
            })
          });
        }
        if (query.includes('orders')) {
          return Promise.resolve({
            json: async () => ({
              data: {
                orders: {
                  nodes: [
                    {
                      totalPriceSet: { shopMoney: { amount: '1500' } },
                      shippingAddress: { countryCode: 'CA' }
                    },
                    {
                      totalPriceSet: { shopMoney: { amount: '2000' } },
                      shippingAddress: { countryCode: 'UK' }
                    },
                    {
                      totalPriceSet: { shopMoney: { amount: '1800' } },
                      shippingAddress: { countryCode: 'FR' }
                    },
                  ]
                }
              }
            })
          });
        }
        if (query.includes('products')) {
          const allTags = Array(60).fill(null).map((_, i) => `tag-${i}`);
          return Promise.resolve({
            json: async () => ({
              data: {
                products: {
                  nodes: [
                    { tags: allTags.slice(0, 30), totalInventory: 5 },
                    { tags: allTags.slice(30, 60), totalInventory: 3 },
                  ]
                }
              }
            })
          });
        }
        return Promise.resolve({ json: async () => ({}) });
      });

      (TaggingRule.countDocuments as any).mockResolvedValue(1);
      (TaggingRule.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([])
        })
      });

      (ActivityService.getCategoryStats as any).mockResolvedValue([]);
      (ActivityService.getLogs as any).mockResolvedValue({ logs: [] });

      const result = await DashboardService.getDashboardData(mockAdmin, 'test-shop');

      expect(result.suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getSetupProgress', () => {
    it('should return setup progress with all steps', async () => {
      const { TaggingRule } = await import('../models/TaggingRule');
      const { ActivityLog } = await import('../models/ActivityLog');
      const { Settings } = await import('../models/Settings');

      (TaggingRule.exists as any) = vi.fn().mockResolvedValue(true);
      (ActivityLog.exists as any) = vi.fn().mockResolvedValue(true);
      (Settings.findOne as any).mockResolvedValue({ setupGuideDismissed: false });

      const result = await DashboardService.getSetupProgress('test-shop');

      expect(result.steps).toHaveLength(4);
      expect(result.steps[0].id).toBe('create_rule');
      expect(result.steps[0].completed).toBe(true);
      expect(result.dismissed).toBe(false);
    });

    it('should mark steps as incomplete when no activity exists', async () => {
      const { TaggingRule } = await import('../models/TaggingRule');
      const { ActivityLog } = await import('../models/ActivityLog');
      const { Settings } = await import('../models/Settings');

      (TaggingRule.exists as any) = vi.fn().mockResolvedValue(false);
      (ActivityLog.exists as any) = vi.fn().mockResolvedValue(false);
      (Settings.findOne as any).mockResolvedValue(null);

      const result = await DashboardService.getSetupProgress('test-shop');

      expect(result.steps.every((s: any) => !s.completed)).toBe(true);
    });
  });
});

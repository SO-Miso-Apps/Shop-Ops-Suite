import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CogsService } from './cogs.service';
import { ActivityService } from './activity.service';

vi.mock('./activity.service', () => ({
  ActivityService: {
    createLog: vi.fn(),
  }
}));

describe('CogsService', () => {
  const mockAdmin = {
    graphql: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProductsWithCosts', () => {
    it('should fetch products with costs and calculate margins', async () => {
      mockAdmin.graphql.mockResolvedValue({
        json: async () => ({
          data: {
            products: {
              nodes: [
                {
                  id: 'gid://shopify/Product/1',
                  title: 'Test Product',
                  featuredImage: { url: 'https://example.com/image.jpg' },
                  options: [{ name: 'Size', values: ['S', 'M'] }],
                  variants: {
                    nodes: [
                      {
                        id: 'gid://shopify/ProductVariant/1',
                        title: 'Small',
                        price: '100.00',
                        selectedOptions: [{ name: 'Size', value: 'S' }],
                        inventoryQuantity: 10,
                        inventoryItem: {
                          id: 'gid://shopify/InventoryItem/1',
                          unitCost: { amount: '50.00' }
                        }
                      }
                    ]
                  }
                }
              ],
              pageInfo: { hasNextPage: false }
            }
          }
        })
      });

      const result = await CogsService.getProductsWithCosts(mockAdmin, {});

      expect(result.products).toHaveLength(1);
      expect(result.products[0].variants[0].cost).toBe(50);
      expect(result.products[0].variants[0].margin).toBe(50); // (100-50)/100 * 100
      expect(result.stats.avgMargin).toBe(50);
    });

    it('should filter products by low margin (<15%)', async () => {
      mockAdmin.graphql.mockResolvedValue({
        json: async () => ({
          data: {
            products: {
              nodes: [
                {
                  id: 'gid://shopify/Product/1',
                  title: 'Product A',
                  options: [],
                  variants: {
                    nodes: [
                      {
                        id: 'gid://shopify/ProductVariant/1',
                        title: 'Default',
                        price: '100.00',
                        selectedOptions: [],
                        inventoryQuantity: 5,
                        inventoryItem: {
                          id: 'gid://shopify/InventoryItem/1',
                          unitCost: { amount: '90.00' } // 10% margin (low)
                        }
                      }
                    ]
                  }
                },
                {
                  id: 'gid://shopify/Product/2',
                  title: 'Product B',
                  options: [],
                  variants: {
                    nodes: [
                      {
                        id: 'gid://shopify/ProductVariant/2',
                        title: 'Default',
                        price: '100.00',
                        selectedOptions: [],
                        inventoryQuantity: 5,
                        inventoryItem: {
                          id: 'gid://shopify/InventoryItem/2',
                          unitCost: { amount: '50.00' } // 50% margin (good)
                        }
                      }
                    ]
                  }
                }
              ],
              pageInfo: { hasNextPage: false }
            }
          }
        })
      });

      const result = await CogsService.getProductsWithCosts(mockAdmin, {}, 'low_margin');

      expect(result.products).toHaveLength(1);
      expect(result.products[0].title).toBe('Product A');
    });

    it('should calculate stats correctly', async () => {
      mockAdmin.graphql.mockResolvedValue({
        json: async () => ({
          data: {
            products: {
              nodes: [
                {
                  id: 'gid://shopify/Product/1',
                  title: 'Product',
                  options: [],
                  variants: {
                    nodes: [
                      {
                        id: 'gid://shopify/ProductVariant/1',
                        title: 'V1',
                        price: '100.00',
                        selectedOptions: [],
                        inventoryQuantity: 10,
                        inventoryItem: {
                          id: 'gid://shopify/InventoryItem/1',
                          unitCost: { amount: '50.00' }
                        }
                      },
                      {
                        id: 'gid://shopify/ProductVariant/2',
                        title: 'V2',
                        price: '200.00',
                        selectedOptions: [],
                        inventoryQuantity: 5,
                        inventoryItem: {
                          id: 'gid://shopify/InventoryItem/2',
                          unitCost: null // Missing cost
                        }
                      }
                    ]
                  }
                }
              ],
              pageInfo: { hasNextPage: false }
            }
          }
        })
      });

      const result = await CogsService.getProductsWithCosts(mockAdmin, {});

      expect(result.stats.totalValue).toBe(500); // 50 * 10
      expect(result.stats.missingCosts).toBe(1);
      expect(result.stats.avgMargin).toBe(50); // Only calculated for V1
    });

    it('should handle products without costs', async () => {
      mockAdmin.graphql.mockResolvedValue({
        json: async () => ({
          data: {
            products: {
              nodes: [
                {
                  id: 'gid://shopify/Product/1',
                  title: 'Product',
                  options: [],
                  variants: {
                    nodes: [
                      {
                        id: 'gid://shopify/ProductVariant/1',
                        title: 'Default',
                        price: '100.00',
                        selectedOptions: [],
                        inventoryQuantity: 10,
                        inventoryItem: {
                          id: 'gid://shopify/InventoryItem/1',
                          unitCost: null
                        }
                      }
                    ]
                  }
                }
              ],
              pageInfo: { hasNextPage: false }
            }
          }
        })
      });

      const result = await CogsService.getProductsWithCosts(mockAdmin, {});

      expect(result.products[0].variants[0].cost).toBe(0);
      expect(result.products[0].variants[0].margin).toBe(0);
      expect(result.stats.missingCosts).toBe(1);
    });
  });

  describe('updateProductCosts', () => {
    it('should update product costs successfully', async () => {
      mockAdmin.graphql.mockResolvedValue({
        json: async () => ({
          data: {
            inventoryItemUpdate: {
              userErrors: []
            }
          }
        })
      });

      const updates = [
        { inventoryItemId: 'gid://shopify/InventoryItem/1', cost: '50.00' },
        { inventoryItemId: 'gid://shopify/InventoryItem/2', cost: '75.00' }
      ];

      const errors = await CogsService.updateProductCosts(mockAdmin, 'test-shop', updates);

      expect(errors).toHaveLength(0);
      expect(mockAdmin.graphql).toHaveBeenCalledTimes(2);
      expect(ActivityService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'Updated Product Costs',
          status: 'Success'
        })
      );
    });

    it('should handle update errors', async () => {
      mockAdmin.graphql.mockResolvedValue({
        json: async () => ({
          data: {
            inventoryItemUpdate: {
              userErrors: [{ message: 'Invalid cost value' }]
            }
          }
        })
      });

      const updates = [
        { inventoryItemId: 'gid://shopify/InventoryItem/1', cost: '-10.00' }
      ];

      const errors = await CogsService.updateProductCosts(mockAdmin, 'test-shop', updates);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Invalid cost value');
      expect(ActivityService.createLog).not.toHaveBeenCalled();
    });

    it('should handle exceptions during update', async () => {
      mockAdmin.graphql.mockRejectedValue(new Error('Network error'));

      const updates = [
        { inventoryItemId: 'gid://shopify/InventoryItem/1', cost: '50.00' }
      ];

      const errors = await CogsService.updateProductCosts(mockAdmin, 'test-shop', updates);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Failed to update');
    });

    it('should not create activity log if no updates provided', async () => {
      const errors = await CogsService.updateProductCosts(mockAdmin, 'test-shop', []);

      expect(errors).toHaveLength(0);
      expect(ActivityService.createLog).not.toHaveBeenCalled();
    });
  });
});

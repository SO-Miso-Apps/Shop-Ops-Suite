import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaggerService } from './tagger.service';
import { TaggingRule } from '../models/TaggingRule';
import { ActivityService } from './activity.service';

// Mock Mongoose Model
vi.mock('../models/TaggingRule', () => ({
  TaggingRule: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    findOneAndDelete: vi.fn(),
  }
}));

vi.mock('../models/MetafieldRule', () => ({
  MetafieldRule: {
    find: vi.fn(),
  }
}));

// Mock ActivityService
vi.mock('./activity.service', () => ({
  ActivityService: {
    createLog: vi.fn(),
  }
}));

describe('TaggerService', () => {
  const mockAdmin = {
    graphql: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkConditions', () => {
    it('should return true if conditions match', () => {
      const resource = { total_price: "100", customer: { orders_count: 2 } };
      const conditions = [
        { field: "total_price", operator: "greater_than", value: "50" },
        { field: "customer.orders_count", operator: "equals", value: "2" }
      ];
      expect(TaggerService.checkConditions(resource, conditions)).toBe(true);
    });

    it('should return false if any condition fails', () => {
      const resource = { total_price: "100" };
      const conditions = [
        { field: "total_price", operator: "greater_than", value: "150" }
      ];
      expect(TaggerService.checkConditions(resource, conditions)).toBe(false);
    });
  });

  describe('evaluateTaggingRules', () => {
    it('should add tags when rule matches', async () => {
      const rules = [{
        name: "Test Rule",
        conditions: [{ field: "total_price", operator: "greater_than", value: "50" }],
        tags: ["VIP"],
        isEnabled: true
      }];
      (TaggingRule.find as any).mockResolvedValue(rules);

      const order = { id: 123, total_price: "100" };

      // Access private method via any cast or if it was public. 
      // Since it's private, we might need to test via processWebhookJob or make it public for testing.
      // For this test, let's assume we can access it or we change it to public temporarily/permanently.
      // Or better, let's test via processWebhookJob which calls it.
      // But processWebhookJob needs more setup.
      // Let's just call the private method using (TaggerService as any).
      await (TaggerService as any).evaluateTaggingRules(mockAdmin, "test-shop", order, "orders");

      expect(mockAdmin.graphql).toHaveBeenCalledWith(expect.stringContaining("tagsAdd"), expect.objectContaining({
        variables: { id: "gid://shopify/Order/123", tags: ["VIP"] }
      }));
    });

    it('should remove tags when rule does NOT match', async () => {
      const rules = [{
        name: "Test Rule",
        conditions: [{ field: "total_price", operator: "greater_than", value: "150" }],
        tags: ["VIP"],
        isEnabled: true
      }];
      (TaggingRule.find as any).mockResolvedValue(rules);

      const order = { id: 123, total_price: "100" };

      await (TaggerService as any).evaluateTaggingRules(mockAdmin, "test-shop", order, "orders");

      expect(mockAdmin.graphql).toHaveBeenCalledWith(expect.stringContaining("tagsRemove"), expect.objectContaining({
        variables: { id: "gid://shopify/Order/123", tags: ["VIP"] }
      }));
    });

    it('should handle conflicts: Add wins over Remove', async () => {
      const rules = [
        {
          name: "Rule A (Match)",
          conditions: [{ field: "total_price", operator: "greater_than", value: "50" }],
          tags: ["VIP"],
          isEnabled: true
        },
        {
          name: "Rule B (No Match)",
          conditions: [{ field: "total_price", operator: "greater_than", value: "150" }],
          tags: ["VIP"], // Same tag
          isEnabled: true
        }
      ];
      (TaggingRule.find as any).mockResolvedValue(rules);

      const order = { id: 123, total_price: "100" };

      await (TaggerService as any).evaluateTaggingRules(mockAdmin, "test-shop", order, "orders");

      // Should ADD "VIP" (because Rule A matches) and NOT remove it (even though Rule B failed)
      expect(mockAdmin.graphql).toHaveBeenCalledWith(expect.stringContaining("tagsAdd"), expect.objectContaining({
        variables: { id: "gid://shopify/Order/123", tags: ["VIP"] }
      }));
      expect(mockAdmin.graphql).not.toHaveBeenCalledWith(expect.stringContaining("tagsRemove"), expect.anything());
    });

    it('should match if ANY condition matches when logic is OR', async () => {
      const rules = [{
        name: "OR Rule",
        conditionLogic: "OR",
        conditions: [
          { field: "total_price", operator: "greater_than", value: "150" }, // False
          { field: "customer.orders_count", operator: "equals", value: "2" } // True
        ],
        tags: ["VIP"],
        isEnabled: true
      }];
      (TaggingRule.find as any).mockResolvedValue(rules);

      const resource = { id: 123, total_price: "100", customer: { orders_count: 2 } };

      await (TaggerService as any).evaluateTaggingRules(mockAdmin, "test-shop", resource, "orders");

      expect(mockAdmin.graphql).toHaveBeenCalledWith(expect.stringContaining("tagsAdd"), expect.objectContaining({
        variables: { id: "gid://shopify/Order/123", tags: ["VIP"] }
      }));
    });

    it('should NOT match if NO condition matches when logic is OR', async () => {
      const rules = [{
        name: "OR Rule",
        conditionLogic: "OR",
        conditions: [
          { field: "total_price", operator: "greater_than", value: "150" }, // False
          { field: "customer.orders_count", operator: "equals", value: "5" } // False
        ],
        tags: ["VIP"],
        isEnabled: true
      }];
      (TaggingRule.find as any).mockResolvedValue(rules);

      const resource = { id: 123, total_price: "100", customer: { orders_count: 2 } };

      await (TaggerService as any).evaluateTaggingRules(mockAdmin, "test-shop", resource, "orders");

      expect(mockAdmin.graphql).not.toHaveBeenCalledWith(expect.stringContaining("tagsAdd"), expect.anything());
    });
  });

  describe('checkConditions Operators', () => {
    it('should handle "in" operator', () => {
      const resource = { shipping_address: { country_code: "US" } };
      const conditions = [{ field: "shipping_address.country_code", operator: "in", value: "US, CA, UK" }];
      expect(TaggerService.checkConditions(resource, conditions)).toBe(true);
    });

    it('should handle "not_in" operator', () => {
      const resource = { shipping_address: { country_code: "FR" } };
      const conditions = [{ field: "shipping_address.country_code", operator: "not_in", value: "US, CA, UK" }];
      expect(TaggerService.checkConditions(resource, conditions)).toBe(true);
    });

    it('should handle "is_empty" operator', () => {
      const resource = { note: "" };
      const conditions = [{ field: "note", operator: "is_empty", value: "" }];
      expect(TaggerService.checkConditions(resource, conditions)).toBe(true);
    });

    it('should handle "is_not_empty" operator', () => {
      const resource = { note: "Some note" };
      const conditions = [{ field: "note", operator: "is_not_empty", value: "" }];
      expect(TaggerService.checkConditions(resource, conditions)).toBe(true);
    });
  });

  describe("checkConditions Advanced Fields", () => {
    const order = {
      shipping_lines: [{ title: "Standard Shipping" }, { title: "Express" }],
      line_items: [
        { sku: "SKU1", title: "Blue Shirt", quantity: 1 },
        { sku: "SKU2", title: "Red Pants", quantity: 2 }
      ],
      customer: {
        orders_count: 5,
        default_address: {
          country_code: "US"
        }
      }
    };

    it("should handle nested array index (shipping_lines[0].title)", () => {
      const conditions = [{ field: "shipping_lines[0].title", operator: "equals", value: "Standard Shipping" }];
      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(true);
    });

    it("should handle array mapping with equals (line_items.sku)", () => {
      // Should match if ANY item has SKU1
      const conditions = [{ field: "line_items.sku", operator: "equals", value: "SKU1" }];
      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(true);
    });

    it("should handle array mapping with contains (line_items.title)", () => {
      // Should match if ANY item title contains "Pants"
      const conditions = [{ field: "line_items.title", operator: "contains", value: "Pants" }];
      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(true);
    });

    it("should handle array mapping failure", () => {
      const conditions = [{ field: "line_items.sku", operator: "equals", value: "SKU999" }];
      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(false);
    });

    it("should handle deep nested fields (customer.default_address.country_code)", () => {
      const conditions = [{ field: "customer.default_address.country_code", operator: "equals", value: "US" }];
      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(true);
    });
  });

  describe('evaluateMetafieldRules', () => {
    it('should apply metafield when rule matches with OR logic', async () => {
      const { MetafieldRule } = await import('../models/MetafieldRule');
      const customerRules = [{
        name: "Metafield OR Rule",
        conditionLogic: "OR",
        conditions: [
          { field: "total_spent", operator: "greater_than", value: "1000" }, // False
          { field: "orders_count", operator: "equals", value: "2" } // True
        ],
        definition: {
          namespace: "custom",
          key: "vip_status",
          value: "true",
          valueType: "single_line_text_field"
        },
        isEnabled: true
      }];

      // Mock find() directly since we removed sort()
      (MetafieldRule.find as any).mockResolvedValue(customerRules);

      mockAdmin.graphql.mockResolvedValue({
        json: async () => ({
          data: {
            metafieldsSet: {
              metafields: [],
              userErrors: []
            }
          }
        })
      });

      const customerResource = { id: 456, orders_count: 2, total_spent: "100" };

      await TaggerService.evaluateMetafieldRules(mockAdmin, "test-shop", customerResource as any, "customers");

      expect(mockAdmin.graphql).toHaveBeenCalledWith(expect.stringContaining("metafieldsSet"), expect.objectContaining({
        variables: {
          metafields: [
            {
              namespace: "custom",
              key: "vip_status",
              value: "true",
              type: "single_line_text_field",
              ownerId: "gid://shopify/Customer/456"
            }
          ]
        }
      }));
    });
  });
});

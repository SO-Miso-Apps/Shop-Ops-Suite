import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaggerService } from './tagger.service';

describe('TaggerService - Advanced Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complex OR Logic Scenarios', () => {
    it('should match with OR when first condition is true', () => {
      const resource = { price: '200', vendor: 'Nike' };
      const conditions = [
        { field: 'price', operator: 'greater_than', value: '100' }, // TRUE
        { field: 'vendor', operator: 'equals', value: 'Adidas' }   // FALSE
      ];

      const result = TaggerService.checkConditions(resource, conditions, 'OR');
      expect(result).toBe(true);
    });

    it('should match with OR when last condition is true', () => {
      const resource = { price: '50', vendor: 'Nike' };
      const conditions = [
        { field: 'price', operator: 'greater_than', value: '100' }, // FALSE
        { field: 'vendor', operator: 'equals', value: 'Nike' }      // TRUE
      ];

      const result = TaggerService.checkConditions(resource, conditions, 'OR');
      expect(result).toBe(true);
    });

    it('should not match with OR when all conditions are false', () => {
      const resource = { price: '50', vendor: 'Puma' };
      const conditions = [
        { field: 'price', operator: 'greater_than', value: '100' },
        { field: 'vendor', operator: 'equals', value: 'Nike' },
        { field: 'vendor', operator: 'equals', value: 'Adidas' }
      ];

      const result = TaggerService.checkConditions(resource, conditions, 'OR');
      expect(result).toBe(false);
    });

    it('should match with OR when middle condition is true among many', () => {
      const resource = {
        price: '50',
        vendor: 'Puma',
        tags: ['sale', 'clearance']
      };
      const conditions = [
        { field: 'price', operator: 'greater_than', value: '100' },    // FALSE
        { field: 'tags', operator: 'contains', value: 'sale' },        // TRUE
        { field: 'vendor', operator: 'equals', value: 'Nike' }         // FALSE
      ];

      const result = TaggerService.checkConditions(resource, conditions, 'OR');
      expect(result).toBe(true);
    });
  });

  describe('Deeply Nested Object Access', () => {
    it('should access 3-level deep nested properties', () => {
      const resource = {
        customer: {
          default_address: {
            location: {
              coordinates: { lat: 10, lng: 20 }
            }
          }
        }
      };
      const conditions = [{
        field: 'customer.default_address.location.coordinates.lat',
        operator: 'equals',
        value: '10'
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should return false for missing nested property', () => {
      const resource = {
        customer: {
          default_address: {}
        }
      };
      const conditions = [{
        field: 'customer.default_address.country.code',
        operator: 'equals',
        value: 'US'
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(false);
    });

    it('should handle null values in nested path', () => {
      const resource = {
        customer: {
          default_address: null
        }
      };
      const conditions = [{
        field: 'customer.default_address.country_code',
        operator: 'is_empty',
        value: ''
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });
  });

  describe('Array Operations - Complex Scenarios', () => {
    const order = {
      line_items: [
        { sku: 'SHIRT-001', title: 'Blue Shirt', quantity: 2, price: '29.99' },
        { sku: 'PANTS-002', title: 'Black Pants', quantity: 1, price: '59.99' },
        { sku: 'SHOES-003', title: 'Running Shoes', quantity: 1, price: '89.99' }
      ]
    };

    it('should match if ANY item in array satisfies condition', () => {
      const conditions = [{
        field: 'line_items.sku',
        operator: 'equals',
        value: 'PANTS-002'
      }];

      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(true);
    });

    it('should match with contains operator on array item property', () => {
      const conditions = [{
        field: 'line_items.title',
        operator: 'contains',
        value: 'Running'
      }];

      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(true);
    });

    it('should match with greater_than on numeric array property', () => {
      const conditions = [{
        field: 'line_items.price',
        operator: 'greater_than',
        value: '50'
      }];

      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(true); // SHOES-003 has price 89.99
    });

    it('should handle empty arrays with is_empty operator', () => {
      const emptyOrder = { line_items: [] };
      const conditions = [{
        field: 'line_items',
        operator: 'is_empty',
        value: ''
      }];

      const result = TaggerService.checkConditions(emptyOrder, conditions);
      expect(result).toBe(true);
    });

    it('should handle is_not_empty on populated arrays', () => {
      const conditions = [{
        field: 'line_items',
        operator: 'is_not_empty',
        value: ''
      }];

      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(true);
    });

    it('should handle array index access', () => {
      const conditions = [{
        field: 'line_items[0].sku',
        operator: 'equals',
        value: 'SHIRT-001'
      }];

      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(true);
    });

    it('should handle out of bounds array index', () => {
      const conditions = [{
        field: 'line_items[99].sku',
        operator: 'equals',
        value: 'anything'
      }];

      const result = TaggerService.checkConditions(order, conditions);
      expect(result).toBe(false);
    });

    it('should support mapping through nested arrays', () => {
      const complexOrder = {
        sections: [
          { items: [{ name: 'Product A' }, { name: 'Product B' }] },
          { items: [{ name: 'Product C' }] }
        ]
      };

      const conditions = [{
        field: 'sections.items.name',
        operator: 'contains',
        value: 'Product C'
      }];

      const result = TaggerService.checkConditions(complexOrder, conditions);
      expect(result).toBe(false);
    });

    it('should handle nested array mapping through two levels', () => {
      const nestedOrder = {
        items: [
          { name: 'Product A' },
          { name: 'Product B' },
          { name: 'Product C' }
        ]
      };

      const conditions = [{
        field: 'items.name',
        operator: 'contains',
        value: 'Product C'
      }];

      const result = TaggerService.checkConditions(nestedOrder, conditions);
      expect(result).toBe(true);
    });
  });

  describe('Operator Edge Cases', () => {
    it('should handle contains with special characters', () => {
      const resource = { note: 'Customer requested: #urgent @priority' };
      const conditions = [{
        field: 'note',
        operator: 'contains',
        value: '#urgent'
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should handle case-insensitive in operator with whitespace', () => {
      const resource = { country_code: '  US  ' };
      const conditions = [{
        field: 'country_code',
        operator: 'in',
        value: 'us, ca, uk'
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(false);
    });

    it('should handle not_in operator correctly', () => {
      const resource = { country_code: 'FR' };
      const conditions = [{
        field: 'country_code',
        operator: 'not_in',
        value: 'US, CA, UK'
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should handle numeric comparisons with string numbers', () => {
      const resource = { total_price: '123.45' };
      const conditions = [
        { field: 'total_price', operator: 'greater_than', value: '100' },
        { field: 'total_price', operator: 'less_than', value: '150' }
      ];

      const result = TaggerService.checkConditions(resource, conditions, 'AND');
      expect(result).toBe(true);
    });

    it('should handle numeric comparison edge case with decimals', () => {
      const resource = { price: '99.99' };
      const conditions = [{
        field: 'price',
        operator: 'less_than',
        value: '100'
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should handle equals with numbers as strings', () => {
      const resource = { quantity: '10' };
      const conditions = [{
        field: 'quantity',
        operator: 'equals',
        value: '10'
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });
  });

  describe('Null and Undefined Handling', () => {
    it('should treat null as empty for is_empty operator', () => {
      const resource = { note: null };
      const conditions = [{
        field: 'note',
        operator: 'is_empty',
        value: ''
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should treat undefined as empty', () => {
      const resource = {};
      const conditions = [{
        field: 'missing_field',
        operator: 'is_empty',
        value: ''
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should handle empty string as empty', () => {
      const resource = { note: '' };
      const conditions = [{
        field: 'note',
        operator: 'is_empty',
        value: ''
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should handle whitespace-only string as empty', () => {
      const resource = { note: '   ' };
      const conditions = [{
        field: 'note',
        operator: 'is_empty',
        value: ''
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should handle is_not_empty with actual content', () => {
      const resource = { note: 'Important note' };
      const conditions = [{
        field: 'note',
        operator: 'is_not_empty',
        value: ''
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should fail is_not_empty for null value', () => {
      const resource = { note: null };
      const conditions = [{
        field: 'note',
        operator: 'is_not_empty',
        value: ''
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(false);
    });
  });

  describe('Multiple Conditions with Mixed Logic', () => {
    it('should evaluate complex AND logic with all true', () => {
      const product = {
        price: '150',
        vendor: 'Nike',
        tags: ['premium', 'sports'],
        inventory: 50
      };

      const conditions = [
        { field: 'price', operator: 'greater_than', value: '100' },
        { field: 'vendor', operator: 'equals', value: 'Nike' },
        { field: 'tags', operator: 'contains', value: 'premium' },
        { field: 'inventory', operator: 'greater_than', value: '10' }
      ];

      const result = TaggerService.checkConditions(product, conditions, 'AND');
      expect(result).toBe(true);
    });

    it('should fail AND logic if one condition false', () => {
      const product = {
        price: '150',
        vendor: 'Nike',
        tags: ['sports'],
        inventory: 50
      };

      const conditions = [
        { field: 'price', operator: 'greater_than', value: '100' },
        { field: 'vendor', operator: 'equals', value: 'Nike' },
        { field: 'tags', operator: 'contains', value: 'premium' }, // FALSE
        { field: 'inventory', operator: 'greater_than', value: '10' }
      ];

      const result = TaggerService.checkConditions(product, conditions, 'AND');
      expect(result).toBe(false);
    });

    it('should evaluate complex OR logic with multiple false and one true', () => {
      const customer = {
        total_spent: '50',
        orders_count: 2,
        tags: [],
        email_verified: false
      };

      const conditions = [
        { field: 'total_spent', operator: 'greater_than', value: '1000' },  // FALSE
        { field: 'orders_count', operator: 'greater_than', value: '10' },   // FALSE
        { field: 'tags', operator: 'contains', value: 'VIP' },              // FALSE
        { field: 'orders_count', operator: 'equals', value: '2' }            // TRUE
      ];

      const result = TaggerService.checkConditions(customer, conditions, 'OR');
      expect(result).toBe(true);
    });
  });

  describe('String Matching Edge Cases', () => {
    it('should handle starts_with with exact match', () => {
      const resource = { sku: 'SHIRT-001' };
      const conditions = [{
        field: 'sku',
        operator: 'starts_with',
        value: 'SHIRT'
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should handle ends_with correctly', () => {
      const resource = { sku: 'SHIRT-001' };
      const conditions = [{
        field: 'sku',
        operator: 'ends_with',
        value: '001'
      }];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should be case-insensitive for all string operators', () => {
      const resource = { vendor: 'Nike' };
      const conditions = [
        { field: 'vendor', operator: 'equals', value: 'NIKE' },
        { field: 'vendor', operator: 'contains', value: 'ike' },
        { field: 'vendor', operator: 'starts_with', value: 'ni' },
        { field: 'vendor', operator: 'ends_with', value: 'KE' }
      ];

      const result = TaggerService.checkConditions(resource, conditions, 'AND');
      expect(result).toBe(true);
    });
  });

  describe('Empty Conditions Array', () => {
    it('should return true for empty conditions array', () => {
      const resource = { anything: 'value' };
      const conditions: any[] = [];

      const result = TaggerService.checkConditions(resource, conditions);
      expect(result).toBe(true);
    });

    it('should return true for null/undefined conditions', () => {
      const resource = { anything: 'value' };

      const resultNull = TaggerService.checkConditions(resource, null as any);
      const resultUndef = TaggerService.checkConditions(resource, undefined as any);

      expect(resultNull).toBe(true);
      expect(resultUndef).toBe(true);
    });
  });

  describe('Real-World Complex Scenarios', () => {
    it('should match VIP customer with multiple OR conditions', () => {
      const customer = {
        total_spent: '2500',
        orders_count: 15,
        tags: ['repeat-customer'],
        default_address: { country_code: 'US' }
      };

      const conditions = [
        { field: 'total_spent', operator: 'greater_than', value: '2000' },
        { field: 'orders_count', operator: 'greater_than', value: '20' },
        { field: 'tags', operator: 'contains', value: 'vip' }
      ];

      const result = TaggerService.checkConditions(customer, conditions, 'OR');
      expect(result).toBe(true); // total_spent > 2000 is true
    });

    it('should match premium product with ALL AND conditions', () => {
      const product = {
        vendor: 'Nike',
        product_type: 'Shoes',
        variants: [
          { price: '189.99', inventory_quantity: 100 }
        ],
        tags: ['premium', 'athletic']
      };

      const conditions = [
        { field: 'vendor', operator: 'in', value: 'Nike, Adidas, Puma' },
        { field: 'variants[0].price', operator: 'greater_than', value: '150' },
        { field: 'tags', operator: 'contains', value: 'premium' },
        { field: 'variants[0].inventory_quantity', operator: 'greater_than', value: '50' }
      ];

      const result = TaggerService.checkConditions(product, conditions, 'AND');
      expect(result).toBe(true);
    });

    it('should handle international order detection', () => {
      const order = {
        shipping_address: {
          country_code: 'CA',
          province_code: 'ON'
        },
        shipping_lines: [
          { title: 'International Shipping' }
        ]
      };

      const conditions = [
        { field: 'shipping_address.country_code', operator: 'not_in', value: 'US' },
        { field: 'shipping_lines[0].title', operator: 'contains', value: 'International' }
      ];

      const result = TaggerService.checkConditions(order, conditions, 'AND');
      expect(result).toBe(true);
    });
  });
});

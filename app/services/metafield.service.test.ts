import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetafieldService } from './metafield.service';
import { MetafieldRule } from '../models/MetafieldRule';
import { ActivityService } from './activity.service';

// Mock dependencies
vi.mock('../models/MetafieldRule', () => ({
  MetafieldRule: {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
  }
}));

vi.mock('./activity.service', () => ({
  ActivityService: {
    createLog: vi.fn(),
  }
}));

describe('MetafieldService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRules', () => {
    it('should fetch all rules for a shop sorted by creation date', async () => {
      const mockRules = [
        { id: '1', shop: 'test-shop', name: 'Rule 1', createdAt: new Date('2025-01-02') },
        { id: '2', shop: 'test-shop', name: 'Rule 2', createdAt: new Date('2025-01-01') }
      ];

      (MetafieldRule.find as any).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockRules)
      });

      const result = await MetafieldService.getRules('test-shop');

      expect(MetafieldRule.find).toHaveBeenCalledWith({ shop: 'test-shop' });
      expect(result).toEqual(mockRules);
    });
  });

  describe('countRules', () => {
    it('should count only enabled rules', async () => {
      (MetafieldRule.countDocuments as any).mockResolvedValue(5);

      const result = await MetafieldService.countRules('test-shop');

      expect(MetafieldRule.countDocuments).toHaveBeenCalledWith({
        shop: 'test-shop',
        isEnabled: true
      });
      expect(result).toBe(5);
    });
  });

  describe('getLibraryRules', () => {
    it('should fetch library rules from shop admin', async () => {
      process.env.SHOP_ADMIN = 'admin-shop';
      const mockRules = [{ id: '1', name: 'Library Rule' }];

      (MetafieldRule.find as any).mockResolvedValue(mockRules);

      const result = await MetafieldService.getLibraryRules();

      expect(MetafieldRule.find).toHaveBeenCalledWith({
        shop: 'admin-shop',
        isEnabled: true
      });
      expect(result).toEqual(mockRules);

      delete process.env.SHOP_ADMIN;
    });

    it('should return empty array if no SHOP_ADMIN env var', async () => {
      delete process.env.SHOP_ADMIN;

      const result = await MetafieldService.getLibraryRules();

      expect(result).toEqual([]);
      expect(MetafieldRule.find).not.toHaveBeenCalled();
    });
  });

  describe('createRule', () => {
    it('should create a new rule and log activity', async () => {
      const ruleData = {
        name: 'Test Rule',
        resourceType: 'products',
        conditions: [],
        definition: {
          namespace: 'custom',
          key: 'material',
          value: 'cotton',
          valueType: 'single_line_text_field'
        }
      };

      const createdRule = { id: 'rule-123', ...ruleData };

      (MetafieldRule.findOne as any).mockResolvedValue(null); // No duplicate
      (MetafieldRule.create as any).mockResolvedValue(createdRule);

      const result = await MetafieldService.createRule('test-shop', ruleData);

      expect(MetafieldRule.findOne).toHaveBeenCalled();
      expect(MetafieldRule.create).toHaveBeenCalledWith({
        shop: 'test-shop',
        ...ruleData
      });
      expect(ActivityService.createLog).toHaveBeenCalledWith({
        shop: 'test-shop',
        resourceType: 'Metafield Rule',
        resourceId: 'rule-123',
        action: 'Created Metafield Rule',
        detail: 'Created rule for custom.material',
        status: 'Success'
      });
      expect(result).toEqual(createdRule);
    });

    it('should throw error if duplicate rule exists', async () => {
      const ruleData = {
        name: 'Duplicate Rule',
        resourceType: 'products',
        definition: {
          namespace: 'custom',
          key: 'material',
          value: 'cotton',
          valueType: 'single_line_text_field'
        }
      };

      (MetafieldRule.findOne as any).mockResolvedValue({ id: 'existing' });

      await expect(
        MetafieldService.createRule('test-shop', ruleData)
      ).rejects.toThrow('Duplicate Rule: A rule for custom.material already exists.');

      expect(MetafieldRule.create).not.toHaveBeenCalled();
    });
  });

  describe('updateRule', () => {
    it('should update rule and log activity', async () => {
      const ruleData = {
        name: 'Updated Rule',
        resourceType: 'products',
        definition: {
          namespace: 'custom',
          key: 'updated_field',
          value: 'new_value',
          valueType: 'single_line_text_field'
        }
      };

      const existingRule = {
        id: 'rule-123',
        shop: 'test-shop',
        name: 'Old Rule'
      };

      (MetafieldRule.findById as any).mockResolvedValue(existingRule);
      (MetafieldRule.findOne as any).mockResolvedValue(null); // No duplicate
      (MetafieldRule.findByIdAndUpdate as any).mockResolvedValue({ ...existingRule, ...ruleData });

      const result = await MetafieldService.updateRule('rule-123', ruleData);

      expect(MetafieldRule.findById).toHaveBeenCalledWith('rule-123');
      expect(ActivityService.createLog).toHaveBeenCalledWith({
        shop: 'test-shop',
        resourceType: 'Metafield Rule',
        resourceId: 'rule-123',
        action: 'Updated Metafield Rule',
        detail: 'Updated rule for custom.updated_field',
        status: 'Success'
      });
      expect(MetafieldRule.findByIdAndUpdate).toHaveBeenCalledWith(
        'rule-123',
        expect.objectContaining({
          ...ruleData,
          updatedAt: expect.any(Date)
        })
      );
    });

    it('should prevent updating to duplicate namespace/key', async () => {
      const ruleData = {
        resourceType: 'products',
        definition: {
          namespace: 'custom',
          key: 'material',
          value: 'updated',
          valueType: 'single_line_text_field'
        }
      };

      const existingRule = { id: 'rule-123', shop: 'test-shop' };
      const duplicateRule = { id: 'other-rule', shop: 'test-shop' };

      (MetafieldRule.findById as any).mockResolvedValue(existingRule);
      (MetafieldRule.findOne as any).mockResolvedValue(duplicateRule);

      await expect(
        MetafieldService.updateRule('rule-123', ruleData)
      ).rejects.toThrow('Duplicate Rule');

      expect(MetafieldRule.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('checkForDuplicate', () => {
    it('should detect duplicate rules with same namespace and key', async () => {
      const data = {
        resourceType: 'products',
        definition: {
          namespace: 'custom',
          key: 'material'
        }
      };

      (MetafieldRule.findOne as any).mockResolvedValue({ id: 'existing' });

      await expect(
        MetafieldService.checkForDuplicate('test-shop', data)
      ).rejects.toThrow('Duplicate Rule');

      expect(MetafieldRule.findOne).toHaveBeenCalledWith({
        shop: 'test-shop',
        resourceType: 'products',
        'definition.namespace': 'custom',
        'definition.key': 'material'
      });
    });

    it('should exclude self when checking duplicates during update', async () => {
      const data = {
        resourceType: 'products',
        definition: {
          namespace: 'custom',
          key: 'material'
        }
      };

      (MetafieldRule.findOne as any).mockResolvedValue(null);

      await MetafieldService.checkForDuplicate('test-shop', data, 'rule-123');

      expect(MetafieldRule.findOne).toHaveBeenCalledWith({
        shop: 'test-shop',
        resourceType: 'products',
        'definition.namespace': 'custom',
        'definition.key': 'material',
        _id: { $ne: 'rule-123' }
      });
    });

    it('should pass if no duplicate exists', async () => {
      const data = {
        resourceType: 'customers',
        definition: {
          namespace: 'loyalty',
          key: 'tier'
        }
      };

      (MetafieldRule.findOne as any).mockResolvedValue(null);

      await expect(
        MetafieldService.checkForDuplicate('test-shop', data)
      ).resolves.not.toThrow();
    });
  });

  describe('deleteRule', () => {
    it('should delete rule and log activity', async () => {
      const existingRule = {
        id: 'rule-123',
        shop: 'test-shop',
        definition: {
          namespace: 'custom',
          key: 'material'
        }
      };

      (MetafieldRule.findById as any).mockResolvedValue(existingRule);
      (MetafieldRule.findByIdAndDelete as any).mockResolvedValue(existingRule);

      const result = await MetafieldService.deleteRule('rule-123');

      expect(ActivityService.createLog).toHaveBeenCalledWith({
        shop: 'test-shop',
        resourceType: 'Metafield Rule',
        resourceId: 'rule-123',
        action: 'Deleted Metafield Rule',
        detail: 'Deleted rule for custom.material',
        status: 'Success'
      });
      expect(MetafieldRule.findByIdAndDelete).toHaveBeenCalledWith('rule-123');
      expect(result).toEqual(existingRule);
    });

    it('should handle deletion of non-existent rule', async () => {
      (MetafieldRule.findById as any).mockResolvedValue(null);
      (MetafieldRule.findByIdAndDelete as any).mockResolvedValue(null);

      await MetafieldService.deleteRule('non-existent');

      expect(ActivityService.createLog).not.toHaveBeenCalled();
    });
  });

  describe('toggleRule', () => {
    it('should enable rule and log activity', async () => {
      const existingRule = {
        id: 'rule-123',
        shop: 'test-shop',
        definition: {
          namespace: 'custom',
          key: 'material'
        }
      };

      (MetafieldRule.findById as any).mockResolvedValue(existingRule);
      (MetafieldRule.findByIdAndUpdate as any).mockResolvedValue({ ...existingRule, isEnabled: true });

      await MetafieldService.toggleRule('rule-123', true);

      expect(ActivityService.createLog).toHaveBeenCalledWith({
        shop: 'test-shop',
        resourceType: 'Metafield Rule',
        resourceId: 'rule-123',
        action: 'Enabled Metafield Rule',
        detail: 'Enabled rule for custom.material',
        status: 'Success'
      });
      expect(MetafieldRule.findByIdAndUpdate).toHaveBeenCalledWith('rule-123', { isEnabled: true });
    });

    it('should disable rule and log activity', async () => {
      const existingRule = {
        id: 'rule-123',
        shop: 'test-shop',
        definition: {
          namespace: 'custom',
          key: 'material'
        }
      };

      (MetafieldRule.findById as any).mockResolvedValue(existingRule);
      (MetafieldRule.findByIdAndUpdate as any).mockResolvedValue({ ...existingRule, isEnabled: false });

      await MetafieldService.toggleRule('rule-123', false);

      expect(ActivityService.createLog).toHaveBeenCalledWith({
        shop: 'test-shop',
        resourceType: 'Metafield Rule',
        resourceId: 'rule-123',
        action: 'Disabled Metafield Rule',
        detail: 'Disabled rule for custom.material',
        status: 'Success'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rules with different value types', async () => {
      const ruleData = {
        name: 'Number Rule',
        resourceType: 'products',
        conditions: [],
        definition: {
          namespace: 'inventory',
          key: 'reorder_point',
          value: '10',
          valueType: 'number_integer'
        }
      };

      (MetafieldRule.findOne as any).mockResolvedValue(null);
      (MetafieldRule.create as any).mockResolvedValue({ id: 'rule-123', ...ruleData });

      await MetafieldService.createRule('test-shop', ruleData);

      expect(MetafieldRule.create).toHaveBeenCalled();
    });

    it('should handle rules for different resource types', async () => {
      const productRule = {
        resourceType: 'products',
        definition: { namespace: 'custom', key: 'material' }
      };

      const customerRule = {
        resourceType: 'customers',
        definition: { namespace: 'custom', key: 'tier' }
      };

      (MetafieldRule.findOne as any).mockResolvedValue(null);

      await MetafieldService.checkForDuplicate('test-shop', productRule);
      await MetafieldService.checkForDuplicate('test-shop', customerRule);

      expect(MetafieldRule.findOne).toHaveBeenCalledTimes(2);
      expect(MetafieldRule.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ resourceType: 'products' })
      );
      expect(MetafieldRule.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ resourceType: 'customers' })
      );
    });

    it('should allow same namespace/key for different shops', async () => {
      const ruleData = {
        resourceType: 'products',
        definition: {
          namespace: 'custom',
          key: 'material'
        }
      };

      (MetafieldRule.findOne as any).mockImplementation((query: any) => {
        // Return existing rule only if shop matches
        if (query.shop === 'other-shop') {
          return Promise.resolve({ id: 'other-rule' });
        }
        return Promise.resolve(null);
      });

      // Should not throw for different shop
      await expect(
        MetafieldService.checkForDuplicate('test-shop', ruleData)
      ).resolves.not.toThrow();
    });
  });
});

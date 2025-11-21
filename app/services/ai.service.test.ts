import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from './ai.service';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: vi.fn()
        }
      };
    }
  };
});

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateRuleFromPrompt', () => {
    it('should generate tagging rule from natural language', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'VIP Orders',
              resourceType: 'orders',
              conditionLogic: 'AND',
              conditions: [
                { field: 'total_price', operator: 'greater_than', value: '1000' }
              ],
              tags: ['VIP']
            })
          }
        }]
      };

      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      (AIService as any).client = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      };

      const result = await AIService.generateRuleFromPrompt(
        'Tag orders over $1000 as VIP',
        'orders'
      );

      expect(result.name).toBe('VIP Orders');
      expect(result.resourceType).toBe('orders');
      expect(result.conditions[0].field).toBe('total_price');
      expect(result.tags).toContain('VIP');
    });

    it('should clean markdown formatting from AI response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '```json\n{"name":"Test","resourceType":"orders","conditionLogic":"AND","conditions":[],"tags":["test"]}\n```'
          }
        }]
      };

      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      (AIService as any).client = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      };

      const result = await AIService.generateRuleFromPrompt(
        'Test prompt',
        'orders'
      );

      expect(result.name).toBe('Test');
    });

    it('should handle AI errors gracefully', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('AI service unavailable'));
      (AIService as any).client = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      };

      await expect(
        AIService.generateRuleFromPrompt('Test', 'orders')
      ).rejects.toThrow('Failed to generate rule from AI');
    });

    it('should handle empty AI response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      };

      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      (AIService as any).client = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      };

      await expect(
        AIService.generateRuleFromPrompt('Test', 'orders')
      ).rejects.toThrow('Failed to generate rule from AI');
    });
  });

  describe('generateMetafieldRuleFromPrompt', () => {
    it('should generate metafield rule from natural language', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'Premium Products',
              resourceType: 'products',
              conditionLogic: 'AND',
              conditions: [
                { field: 'variants[0].price', operator: 'greater_than', value: '500' }
              ],
              definition: {
                namespace: 'custom',
                key: 'premium',
                value: 'true',
                valueType: 'single_line_text_field'
              }
            })
          }
        }]
      };

      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      (AIService as any).client = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      };

      const result = await AIService.generateMetafieldRuleFromPrompt(
        'Mark products over $500 as premium',
        'products'
      );

      expect(result.name).toBe('Premium Products');
      expect(result.resourceType).toBe('products');
      expect(result.definition.key).toBe('premium');
      expect(result.definition.valueType).toBe('single_line_text_field');
    });

    it('should support different resource types', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'VIP Customers',
              resourceType: 'customers',
              conditionLogic: 'OR',
              conditions: [
                { field: 'total_spent', operator: 'greater_than', value: '1000' }
              ],
              definition: {
                namespace: 'custom',
                key: 'vip_status',
                value: 'gold',
                valueType: 'single_line_text_field'
              }
            })
          }
        }]
      };

      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      (AIService as any).client = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      };

      const result = await AIService.generateMetafieldRuleFromPrompt(
        'Mark customers who spent over $1000 as VIP',
        'customers'
      );

      expect(result.resourceType).toBe('customers');
      expect(result.definition.key).toBe('vip_status');
    });

    it('should handle errors during metafield rule generation', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('API error'));
      (AIService as any).client = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      };

      await expect(
        AIService.generateMetafieldRuleFromPrompt('Test', 'products')
      ).rejects.toThrow('Failed to generate metafield rule from AI');
    });
  });
});

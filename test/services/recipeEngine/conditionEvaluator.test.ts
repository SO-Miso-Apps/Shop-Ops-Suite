import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  evaluateConditions,
} from '~/services/recipeEngine/conditionEvaluator';
import { ConditionOperator } from '~/models/Recipe';

describe('Condition Evaluator', () => {
  describe('evaluateCondition - Operators', () => {
    const resourceData = {
      total_spent: 1500,
      email: 'john@example.com',
      tags: ['VIP', 'Loyal'],
      age: 25,
      status: 'active',
    };

    it('should evaluate > (greater than) operator', () => {
      const result = evaluateCondition(
        {
          field: 'total_spent',
          operator: ConditionOperator.GREATER_THAN,
          value: 1000,
        },
        resourceData
      );

      expect(result).toBe(true);
    });

    it('should evaluate < (less than) operator', () => {
      const result = evaluateCondition(
        {
          field: 'age',
          operator: ConditionOperator.LESS_THAN,
          value: 30,
        },
        resourceData
      );

      expect(result).toBe(true);
    });

    it('should evaluate = (equals) operator', () => {
      const result = evaluateCondition(
        {
          field: 'status',
          operator: ConditionOperator.EQUALS,
          value: 'active',
        },
        resourceData
      );

      expect(result).toBe(true);
    });

    it('should evaluate != (not equals) operator', () => {
      const result = evaluateCondition(
        {
          field: 'status',
          operator: ConditionOperator.NOT_EQUALS,
          value: 'inactive',
        },
        resourceData
      );

      expect(result).toBe(true);
    });

    it('should evaluate contains operator for arrays', () => {
      const result = evaluateCondition(
        {
          field: 'tags',
          operator: ConditionOperator.CONTAINS,
          value: 'VIP',
        },
        resourceData
      );

      expect(result).toBe(true);
    });

    it('should evaluate contains operator for strings', () => {
      const result = evaluateCondition(
        {
          field: 'email',
          operator: ConditionOperator.CONTAINS,
          value: '@example.com',
        },
        resourceData
      );

      expect(result).toBe(true);
    });

    it('should evaluate starts_with operator', () => {
      const result = evaluateCondition(
        {
          field: 'email',
          operator: ConditionOperator.STARTS_WITH,
          value: 'john',
        },
        resourceData
      );

      expect(result).toBe(true);
    });

    it('should evaluate in operator', () => {
      const result = evaluateCondition(
        {
          field: 'status',
          operator: ConditionOperator.IN,
          value: ['active', 'pending', 'completed'],
        },
        resourceData
      );

      expect(result).toBe(true);
    });

    it('should return false when field not found', () => {
      const result = evaluateCondition(
        {
          field: 'non_existent_field',
          operator: ConditionOperator.EQUALS,
          value: 'test',
        },
        resourceData
      );

      expect(result).toBe(false);
    });
  });

  describe('evaluateConditions - Logical Operators', () => {
    const resourceData = {
      total_spent: 1500,
      tags: ['VIP'],
      age: 25,
    };

    it('should evaluate multiple conditions with AND logic (all pass)', () => {
      const result = evaluateConditions(
        [
          {
            field: 'total_spent',
            operator: ConditionOperator.GREATER_THAN,
            value: 1000,
            logicalOperator: 'AND',
          },
          {
            field: 'tags',
            operator: ConditionOperator.CONTAINS,
            value: 'VIP',
            logicalOperator: 'AND',
          },
        ],
        resourceData
      );

      expect(result.matches).toBe(true);
      expect(result.evaluations).toHaveLength(2);
      expect(result.evaluations[0].result).toBe(true);
      expect(result.evaluations[1].result).toBe(true);
    });

    it('should evaluate multiple conditions with AND logic (one fails)', () => {
      const result = evaluateConditions(
        [
          {
            field: 'total_spent',
            operator: ConditionOperator.GREATER_THAN,
            value: 1000,
            logicalOperator: 'AND',
          },
          {
            field: 'age',
            operator: ConditionOperator.GREATER_THAN,
            value: 30, // This will fail
            logicalOperator: 'AND',
          },
        ],
        resourceData
      );

      expect(result.matches).toBe(false);
      expect(result.evaluations[0].result).toBe(true);
      expect(result.evaluations[1].result).toBe(false);
    });

    it('should evaluate multiple conditions with OR logic', () => {
      const result = evaluateConditions(
        [
          {
            field: 'total_spent',
            operator: ConditionOperator.GREATER_THAN,
            value: 2000, // This will fail
            logicalOperator: 'OR',
          },
          {
            field: 'tags',
            operator: ConditionOperator.CONTAINS,
            value: 'VIP', // This will pass
            logicalOperator: 'OR',
          },
        ],
        resourceData
      );

      expect(result.matches).toBe(true);
      expect(result.evaluations[0].result).toBe(false);
      expect(result.evaluations[1].result).toBe(true);
    });

    it('should handle empty conditions array', () => {
      const result = evaluateConditions([], resourceData);

      expect(result.matches).toBe(false);
      expect(result.evaluations).toHaveLength(0);
    });
  });

  describe('Type Coercion', () => {
    it('should handle number to string comparison with equals', () => {
      const resourceData = { id: '123' };

      const result = evaluateCondition(
        {
          field: 'id',
          operator: ConditionOperator.EQUALS,
          value: 123, // Number compared to string
        },
        resourceData
      );

      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null field value', () => {
      const resourceData = { field: null };

      const result = evaluateCondition(
        {
          field: 'field',
          operator: ConditionOperator.EQUALS,
          value: 'test',
        },
        resourceData
      );

      expect(result).toBe(false);
    });

    it('should handle undefined field value', () => {
      const resourceData = { field: undefined };

      const result = evaluateCondition(
        {
          field: 'field',
          operator: ConditionOperator.EQUALS,
          value: 'test',
        },
        resourceData
      );

      expect(result).toBe(false);
    });

    it('should handle in operator with non-array value', () => {
      const resourceData = { status: 'active' };

      const result = evaluateCondition(
        {
          field: 'status',
          operator: ConditionOperator.IN,
          value: 'not-an-array', // Invalid value for 'in' operator
        },
        resourceData
      );

      expect(result).toBe(false);
    });
  });
});

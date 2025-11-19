import type { IRecipeCondition } from '~/models/Recipe';
import { getFieldValue } from './fieldAccessor';

/**
 * Evaluation result for a single condition.
 */
export interface ConditionEvaluation {
  condition: IRecipeCondition;
  fieldValue: any;
  result: boolean;
  error?: string;
}

/**
 * Evaluate a single condition against resource data.
 *
 * @param condition - Recipe condition (field, operator, value)
 * @param resourceData - Resource data to evaluate against
 * @returns true if condition matches, false otherwise
 */
export function evaluateCondition(
  condition: IRecipeCondition,
  resourceData: any
): boolean {
  const fieldValue = getFieldValue(resourceData, condition.field);

  // Field not found - condition fails
  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  const { operator, value } = condition;

  switch (operator) {
    case '>':
      return Number(fieldValue) > Number(value);

    case '<':
      return Number(fieldValue) < Number(value);

    case '=':
      // Loose equality (handles type coercion)
      // eslint-disable-next-line eqeqeq
      return fieldValue == value;

    case '!=':
      // Loose inequality
      // eslint-disable-next-line eqeqeq
      return fieldValue != value;

    case 'contains':
      // For arrays: check if value is in array
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      // For strings: check if substring exists
      return String(fieldValue).includes(String(value));

    case 'starts_with':
      return String(fieldValue).startsWith(String(value));

    case 'in':
      // Check if fieldValue is in the value array
      if (!Array.isArray(value)) {
        console.warn('Operator "in" requires array value');
        return false;
      }
      return value.includes(fieldValue);

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Evaluate all conditions with AND/OR logic.
 *
 * @param conditions - Array of recipe conditions
 * @param resourceData - Resource data to evaluate against
 * @returns Evaluation result with detailed breakdown
 */
export function evaluateConditions(
  conditions: IRecipeCondition[],
  resourceData: any
): {
  matches: boolean;
  evaluations: ConditionEvaluation[];
} {
  const evaluations: ConditionEvaluation[] = [];

  // Handle empty conditions array
  if (!conditions || conditions.length === 0) {
    return { matches: false, evaluations: [] };
  }

  // Evaluate first condition (no logical operator needed)
  let matches = false;

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const fieldValue = getFieldValue(resourceData, condition.field);

    let result: boolean;
    let error: string | undefined;

    try {
      result = evaluateCondition(condition, resourceData);
    } catch (err) {
      result = false;
      error = err instanceof Error ? err.message : String(err);
    }

    evaluations.push({
      condition,
      fieldValue,
      result,
      error,
    });

    // Apply logical operator
    if (i === 0) {
      // First condition sets the initial result
      matches = result;
    } else {
      // Combine with previous result using logical operator
      const logicalOp = condition.logicalOperator || 'AND';

      if (logicalOp === 'AND') {
        matches = matches && result;
      } else if (logicalOp === 'OR') {
        matches = matches || result;
      }
    }
  }

  return { matches, evaluations };
}

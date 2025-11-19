import { JSONPath } from 'jsonpath-plus';

/**
 * Extract field value from resource data using JSONPath.
 *
 * @param data - Resource data (webhook payload or GraphQL response)
 * @param path - JSONPath expression (e.g., "total_spent", "addresses[0].city")
 * @returns Field value or undefined if not found
 *
 * @example
 * ```typescript
 * const customer = { total_spent: 1500, tags: ["VIP", "Loyal"] };
 * getFieldValue(customer, "total_spent") // 1500
 * getFieldValue(customer, "tags") // ["VIP", "Loyal"]
 * getFieldValue(customer, "invalid") // undefined
 * ```
 */
export function getFieldValue(data: any, path: string): any {
  try {
    // Normalize path (add $ prefix if missing)
    const normalizedPath = path.startsWith('$') ? path : `$.${path}`;

    const result = JSONPath({
      path: normalizedPath,
      json: data,
      wrap: false,
    });

    return result;
  } catch (error) {
    // Invalid JSONPath expression or other error
    console.warn(`Failed to extract field "${path}":`, error);
    return undefined;
  }
}

/**
 * Check if a field exists in resource data.
 *
 * @param data - Resource data
 * @param path - JSONPath expression
 * @returns true if field exists and is not null/undefined
 */
export function hasField(data: any, path: string): boolean {
  const value = getFieldValue(data, path);
  return value !== undefined && value !== null;
}

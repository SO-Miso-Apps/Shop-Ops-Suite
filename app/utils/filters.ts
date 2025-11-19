/**
 * Filter and Search Utilities
 *
 * Provides generic filter, search, and sort functions for working with collections.
 */

/**
 * Filter items by text search across multiple fields
 *
 * @param items - Array of items to filter
 * @param searchTerm - Search term to match
 * @param fields - Array of field names to search in
 * @returns Filtered array
 *
 * @example
 * ```ts
 * const recipes = [
 *   { title: 'VIP Customer', description: 'Tag high value customers' },
 *   { title: 'Low Stock', description: 'Alert for low inventory' }
 * ];
 * filterByText(recipes, 'customer', ['title', 'description']);
 * // Returns [{ title: 'VIP Customer', ... }]
 * ```
 */
export function filterByText<T extends Record<string, unknown>>(
  items: T[],
  searchTerm: string,
  fields: (keyof T)[]
): T[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return items;
  }

  const lowerSearch = searchTerm.toLowerCase().trim();

  return items.filter(item => {
    return fields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerSearch);
      }
      if (typeof value === 'number') {
        return value.toString().includes(lowerSearch);
      }
      return false;
    });
  });
}

/**
 * Filter items by date range
 *
 * @param items - Array of items to filter
 * @param start - Start date (inclusive)
 * @param end - End date (inclusive)
 * @param field - Field name containing the date
 * @returns Filtered array
 *
 * @example
 * ```ts
 * const logs = [
 *   { createdAt: new Date('2025-01-15'), ... },
 *   { createdAt: new Date('2025-01-18'), ... }
 * ];
 * filterByDateRange(logs, new Date('2025-01-16'), new Date('2025-01-20'), 'createdAt');
 * // Returns [{ createdAt: new Date('2025-01-18'), ... }]
 * ```
 */
export function filterByDateRange<T extends Record<string, unknown>>(
  items: T[],
  start: Date,
  end: Date,
  field: keyof T
): T[] {
  return items.filter(item => {
    const value = item[field];
    if (!(value instanceof Date)) {
      // Try to convert string to Date
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date >= start && date <= end;
        }
      }
      return false;
    }
    return value >= start && value <= end;
  });
}

/**
 * Filter items by status (or any enum field)
 *
 * @param items - Array of items to filter
 * @param statuses - Array of status values to match
 * @param field - Field name containing the status
 * @returns Filtered array
 *
 * @example
 * ```ts
 * const logs = [
 *   { status: 'success', ... },
 *   { status: 'failure', ... },
 *   { status: 'success', ... }
 * ];
 * filterByStatus(logs, ['success'], 'status');
 * // Returns two success items
 * ```
 */
export function filterByStatus<T extends Record<string, unknown>>(
  items: T[],
  statuses: string[],
  field: keyof T = 'status' as keyof T
): T[] {
  if (!statuses || statuses.length === 0) {
    return items;
  }

  return items.filter(item => {
    const value = item[field];
    return typeof value === 'string' && statuses.includes(value);
  });
}

/**
 * Sort items by a field
 *
 * @param items - Array of items to sort
 * @param field - Field name to sort by
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted array (new array, does not mutate original)
 *
 * @example
 * ```ts
 * const recipes = [
 *   { title: 'Beta', executionCount: 100 },
 *   { title: 'Alpha', executionCount: 200 }
 * ];
 * sortBy(recipes, 'title', 'asc'); // Sorted alphabetically
 * sortBy(recipes, 'executionCount', 'desc'); // Sorted by count descending
 * ```
 */
export function sortBy<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  const sorted = [...items].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    // Handle null/undefined
    if (aValue === null || aValue === undefined) return direction === 'asc' ? 1 : -1;
    if (bValue === null || bValue === undefined) return direction === 'asc' ? -1 : 1;

    // Handle strings
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    // Handle numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      return direction === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    // Handle booleans
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return direction === 'asc'
        ? (aValue === bValue ? 0 : aValue ? -1 : 1)
        : (aValue === bValue ? 0 : aValue ? 1 : -1);
    }

    return 0;
  });

  return sorted;
}

/**
 * Debounce a function call
 *
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```ts
 * const search = debounce((term: string) => {
 *   console.log('Searching for:', term);
 * }, 300);
 *
 * search('a'); // Won't execute immediately
 * search('ab'); // Won't execute immediately
 * search('abc'); // Will execute after 300ms
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Paginate an array
 *
 * @param items - Array of items to paginate
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Paginated subset of items
 *
 * @example
 * ```ts
 * const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * paginate(items, 1, 3); // [1, 2, 3]
 * paginate(items, 2, 3); // [4, 5, 6]
 * paginate(items, 4, 3); // [10]
 * ```
 */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return items.slice(startIndex, endIndex);
}

/**
 * Calculate pagination metadata
 *
 * @param totalItems - Total number of items
 * @param page - Current page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Pagination metadata
 *
 * @example
 * ```ts
 * getPaginationInfo(100, 1, 10);
 * // { currentPage: 1, totalPages: 10, hasNextPage: true, hasPreviousPage: false }
 * ```
 */
export function getPaginationInfo(
  totalItems: number,
  page: number,
  pageSize: number
): {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
} {
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    startIndex,
    endIndex
  };
}

/**
 * Group items by a field value
 *
 * @param items - Array of items to group
 * @param field - Field name to group by
 * @returns Object with grouped items
 *
 * @example
 * ```ts
 * const recipes = [
 *   { category: 'customer', title: 'VIP' },
 *   { category: 'product', title: 'Low Stock' },
 *   { category: 'customer', title: 'High Value' }
 * ];
 * groupBy(recipes, 'category');
 * // {
 * //   customer: [{ category: 'customer', title: 'VIP' }, ...],
 * //   product: [{ category: 'product', title: 'Low Stock' }]
 * // }
 * ```
 */
export function groupBy<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T
): Record<string, T[]> {
  return items.reduce((grouped, item) => {
    const key = String(item[field]);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
    return grouped;
  }, {} as Record<string, T[]>);
}

/**
 * Filter items by multiple criteria
 *
 * @param items - Array of items to filter
 * @param filters - Object containing filter criteria
 * @returns Filtered array
 *
 * @example
 * ```ts
 * const recipes = [
 *   { enabled: true, category: 'customer', title: 'VIP' },
 *   { enabled: false, category: 'product', title: 'Low Stock' }
 * ];
 * filterByMultipleCriteria(recipes, { enabled: true, category: 'customer' });
 * // Returns [{ enabled: true, category: 'customer', title: 'VIP' }]
 * ```
 */
export function filterByMultipleCriteria<T extends Record<string, unknown>>(
  items: T[],
  filters: Partial<T>
): T[] {
  return items.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      // Skip undefined/null filter values
      if (value === undefined || value === null) return true;

      return item[key] === value;
    });
  });
}

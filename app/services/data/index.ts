/**
 * Data Service Factory
 *
 * Provides a singleton data service instance based on environment configuration.
 * Automatically switches between mock and real data services.
 */

import type { DataService } from './types';
import { mockDataService } from './mockDataService';

/**
 * Singleton data service instance
 */
let dataServiceInstance: DataService | null = null;

/**
 * Check if mock data should be used
 * Checks both environment variable and localStorage override
 */
function shouldUseMockData(): boolean {
  // Check for localStorage override (set by DevTools)
  if (typeof localStorage !== 'undefined') {
    const override = localStorage.getItem('use_mock_data');
    if (override !== null) {
      return override === 'true';
    }
  }

  // Check environment variable
  if (typeof process !== 'undefined' && process.env.USE_MOCK_DATA !== undefined) {
    return process.env.USE_MOCK_DATA === 'true';
  }

  // Default to true in development, false in production
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

/**
 * Get the data service instance (singleton pattern)
 *
 * @returns DataService instance (mock or real)
 */
export function getDataService(): DataService {
  if (dataServiceInstance) {
    return dataServiceInstance;
  }

  const useMock = shouldUseMockData();

  if (useMock) {
    console.log('[DataService] Using mock data service');
    dataServiceInstance = mockDataService;
  } else {
    // TODO: Implement real data service when backend is ready
    console.warn('[DataService] Real data service not yet implemented. Falling back to mock data.');
    dataServiceInstance = mockDataService;
  }

  return dataServiceInstance;
}

/**
 * Reset the data service instance (useful for testing or switching modes)
 */
export function resetDataService(): void {
  dataServiceInstance = null;
}

/**
 * Check if currently using mock data
 */
export function isUsingMockData(): boolean {
  return shouldUseMockData();
}

/**
 * Re-export types for convenience
 */
export type { DataService } from './types';
export type {
  MockRecipe,
  MockAutomationLog,
  MockSetting,
  MockShop,
  RecipeFilters,
  LogFilters,
  PaginationParams,
  PaginatedResponse
} from '~/mocks/types';

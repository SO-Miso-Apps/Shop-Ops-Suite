/**
 * Data Service Interface
 *
 * Defines the contract for data access operations.
 * This interface will be implemented by both mock and real data services.
 */

import type {
  MockRecipe,
  MockAutomationLog,
  MockSetting,
  MockShop,
  RecipeFilters,
  LogFilters,
  PaginationParams,
  PaginatedResponse
} from '~/mocks/types';

/**
 * Main data service interface
 * All methods return Promises to support async operations
 */
export interface DataService {
  // ========== Recipe Operations ==========

  /**
   * Get all recipes with optional filtering
   */
  getRecipes(filters?: RecipeFilters): Promise<MockRecipe[]>;

  /**
   * Get a single recipe by ID
   */
  getRecipeById(recipeId: string): Promise<MockRecipe | null>;

  /**
   * Toggle recipe enabled/disabled state
   */
  toggleRecipe(recipeId: string, enabled: boolean): Promise<void>;

  /**
   * Create a new recipe
   */
  createRecipe(recipe: Omit<MockRecipe, 'recipeId' | 'createdAt' | 'updatedAt'>): Promise<MockRecipe>;

  /**
   * Update an existing recipe
   */
  updateRecipe(recipeId: string, updates: Partial<MockRecipe>): Promise<MockRecipe>;

  /**
   * Delete a recipe
   */
  deleteRecipe(recipeId: string): Promise<void>;

  // ========== Activity Log Operations ==========

  /**
   * Get activity logs with optional filtering and pagination
   */
  getActivityLogs(
    filters?: LogFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<MockAutomationLog>>;

  /**
   * Get a single log entry by ID
   */
  getLogById(logId: string): Promise<MockAutomationLog | null>;

  /**
   * Get logs for a specific recipe
   */
  getLogsByRecipe(recipeId: string, limit?: number): Promise<MockAutomationLog[]>;

  /**
   * Get log statistics (counts by status)
   */
  getLogStats(): Promise<{
    total: number;
    success: number;
    failure: number;
    partial: number;
    pending: number;
  }>;

  // ========== Settings Operations ==========

  /**
   * Get shop settings
   */
  getSettings(): Promise<MockSetting>;

  /**
   * Update shop settings
   */
  updateSettings(updates: Partial<MockSetting>): Promise<MockSetting>;

  // ========== Shop Operations ==========

  /**
   * Get shop metadata
   */
  getShop(): Promise<MockShop>;

  /**
   * Update shop metadata
   */
  updateShop(updates: Partial<MockShop>): Promise<MockShop>;

  // ========== Dashboard Statistics ==========

  /**
   * Get dashboard statistics
   */
  getDashboardStats(): Promise<{
    totalRecipes: number;
    activeRecipes: number;
    executionsToday: number;
    executionsThisMonth: number;
    successRate: number;
    recentLogs: MockAutomationLog[];
  }>;
}

/**
 * Service configuration options
 */
export interface DataServiceConfig {
  /**
   * Whether to use mock data
   */
  useMockData: boolean;

  /**
   * Simulated network delay in milliseconds (for mock service)
   */
  simulatedDelay?: number;

  /**
   * Whether to log service operations to console
   */
  enableLogging?: boolean;
}

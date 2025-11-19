/**
 * Mock Data Service Implementation
 *
 * Provides in-memory data operations using mock data for development.
 * Simulates network delays and persists state changes in sessionStorage.
 */

import type { DataService } from './types';
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

import { generateMockRecipes } from '~/mocks/recipes';
import { generateMockLogs } from '~/mocks/logs';
import { getDefaultMockSettings } from '~/mocks/settings';
import { getDefaultMockShop } from '~/mocks/shop';

/**
 * Simulated network delay (100-300ms)
 */
function delay(ms: number = 200): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log service operations (development only)
 */
function logOperation(operation: string, data?: unknown): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[MockDataService] ${operation}`, data || '');
  }
}

/**
 * Session storage keys
 */
const STORAGE_KEYS = {
  RECIPES: 'mock_recipes',
  SETTINGS: 'mock_settings',
  SHOP: 'mock_shop'
};

/**
 * Get data from session storage
 */
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof sessionStorage === 'undefined') return defaultValue;

  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored, (key, value) => {
        // Revive Date objects
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        return value;
      });
    }
  } catch (error) {
    console.error(`Error reading from sessionStorage:`, error);
  }

  return defaultValue;
}

/**
 * Save data to session storage
 */
function saveToStorage<T>(key: string, value: T): void {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to sessionStorage:`, error);
  }
}

/**
 * Mock Data Service Implementation
 */
export class MockDataService implements DataService {
  private recipes: MockRecipe[];
  private logs: MockAutomationLog[];
  private settings: MockSetting;
  private shop: MockShop;

  constructor() {
    // Initialize data from storage or defaults
    this.recipes = getFromStorage(STORAGE_KEYS.RECIPES, generateMockRecipes());
    this.settings = getFromStorage(STORAGE_KEYS.SETTINGS, getDefaultMockSettings());
    this.shop = getFromStorage(STORAGE_KEYS.SHOP, getDefaultMockShop());
    this.logs = generateMockLogs(500); // Logs not persisted (regenerated each session)

    logOperation('Initialized', {
      recipes: this.recipes.length,
      logs: this.logs.length
    });
  }

  // ========== Recipe Operations ==========

  async getRecipes(filters?: RecipeFilters): Promise<MockRecipe[]> {
    await delay();
    logOperation('getRecipes', filters);

    let filtered = [...this.recipes];

    if (filters?.category) {
      filtered = filtered.filter(r => r.category === filters.category);
    }

    if (filters?.enabled !== undefined) {
      filtered = filtered.filter(r => r.enabled === filters.enabled);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  async getRecipeById(recipeId: string): Promise<MockRecipe | null> {
    await delay();
    logOperation('getRecipeById', recipeId);

    const recipe = this.recipes.find(r => r.recipeId === recipeId);
    return recipe || null;
  }

  async toggleRecipe(recipeId: string, enabled: boolean): Promise<void> {
    await delay();
    logOperation('toggleRecipe', { recipeId, enabled });

    const recipe = this.recipes.find(r => r.recipeId === recipeId);
    if (recipe) {
      recipe.enabled = enabled;
      recipe.updatedAt = new Date();
      saveToStorage(STORAGE_KEYS.RECIPES, this.recipes);
    }
  }

  async createRecipe(recipeData: Omit<MockRecipe, 'recipeId' | 'createdAt' | 'updatedAt'>): Promise<MockRecipe> {
    await delay();
    logOperation('createRecipe', recipeData);

    const newRecipe: MockRecipe = {
      ...recipeData,
      recipeId: `recipe_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.recipes.push(newRecipe);
    saveToStorage(STORAGE_KEYS.RECIPES, this.recipes);

    return newRecipe;
  }

  async updateRecipe(recipeId: string, updates: Partial<MockRecipe>): Promise<MockRecipe> {
    await delay();
    logOperation('updateRecipe', { recipeId, updates });

    const recipe = this.recipes.find(r => r.recipeId === recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    Object.assign(recipe, updates, { updatedAt: new Date() });
    saveToStorage(STORAGE_KEYS.RECIPES, this.recipes);

    return recipe;
  }

  async deleteRecipe(recipeId: string): Promise<void> {
    await delay();
    logOperation('deleteRecipe', recipeId);

    const index = this.recipes.findIndex(r => r.recipeId === recipeId);
    if (index !== -1) {
      this.recipes.splice(index, 1);
      saveToStorage(STORAGE_KEYS.RECIPES, this.recipes);
    }
  }

  // ========== Activity Log Operations ==========

  async getActivityLogs(
    filters?: LogFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<MockAutomationLog>> {
    await delay();
    logOperation('getActivityLogs', { filters, pagination });

    let filtered = [...this.logs];

    // Apply filters
    if (filters?.recipeId) {
      filtered = filtered.filter(l => l.recipeId === filters.recipeId);
    }

    if (filters?.status) {
      filtered = filtered.filter(l => l.status === filters.status);
    }

    if (filters?.actionType) {
      filtered = filtered.filter(l => l.actionType === filters.actionType);
    }

    if (filters?.resourceType) {
      filtered = filtered.filter(l => l.resourceType === filters.resourceType);
    }

    if (filters?.dateStart || filters?.dateFrom) {
      const startDate = filters.dateStart || filters.dateFrom;
      filtered = filtered.filter(l => new Date(l.createdAt) >= startDate!);
    }

    if (filters?.dateEnd || filters?.dateTo) {
      const endDate = filters.dateEnd || filters.dateTo;
      filtered = filtered.filter(l => new Date(l.createdAt) <= endDate!);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(l =>
        l.recipeTitle.toLowerCase().includes(searchLower) ||
        l.resourceTitle.toLowerCase().includes(searchLower) ||
        l.actionType.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = filtered.slice(startIndex, endIndex);

    return {
      data,
      total,
      page,
      limit,
      totalPages
    };
  }

  async getLogById(logId: string): Promise<MockAutomationLog | null> {
    await delay();
    logOperation('getLogById', logId);

    const log = this.logs.find(l => l.logId === logId);
    return log || null;
  }

  async getLogsByRecipe(recipeId: string, limit: number = 100): Promise<MockAutomationLog[]> {
    await delay();
    logOperation('getLogsByRecipe', { recipeId, limit });

    return this.logs
      .filter(l => l.recipeId === recipeId)
      .slice(0, limit);
  }

  async getLogStats(): Promise<{
    total: number;
    success: number;
    failure: number;
    partial: number;
    pending: number;
  }> {
    await delay();
    logOperation('getLogStats');

    return {
      total: this.logs.length,
      success: this.logs.filter(l => l.status === 'success').length,
      failure: this.logs.filter(l => l.status === 'failure').length,
      partial: this.logs.filter(l => l.status === 'partial').length,
      pending: this.logs.filter(l => l.status === 'pending').length
    };
  }

  // ========== Settings Operations ==========

  async getSettings(): Promise<MockSetting> {
    await delay();
    logOperation('getSettings');

    return { ...this.settings };
  }

  async updateSettings(updates: Partial<MockSetting>): Promise<MockSetting> {
    await delay();
    logOperation('updateSettings', updates);

    // Deep merge for nested objects
    this.settings = {
      ...this.settings,
      ...updates,
      preferences: updates.preferences
        ? { ...this.settings.preferences, ...updates.preferences }
        : this.settings.preferences,
      usage: updates.usage
        ? { ...this.settings.usage, ...updates.usage }
        : this.settings.usage,
      updatedAt: new Date()
    };

    saveToStorage(STORAGE_KEYS.SETTINGS, this.settings);

    return { ...this.settings };
  }

  // ========== Shop Operations ==========

  async getShop(): Promise<MockShop> {
    await delay();
    logOperation('getShop');

    return { ...this.shop };
  }

  async updateShop(updates: Partial<MockShop>): Promise<MockShop> {
    await delay();
    logOperation('updateShop', updates);

    this.shop = {
      ...this.shop,
      ...updates,
      lastSyncAt: new Date()
    };

    saveToStorage(STORAGE_KEYS.SHOP, this.shop);

    return { ...this.shop };
  }

  // ========== Dashboard Statistics ==========

  async getDashboardStats(): Promise<{
    totalRecipes: number;
    activeRecipes: number;
    executionsToday: number;
    executionsThisMonth: number;
    successRate: number;
    recentLogs: MockAutomationLog[];
  }> {
    await delay();
    logOperation('getDashboardStats');

    const totalRecipes = this.recipes.length;
    const activeRecipes = this.recipes.filter(r => r.enabled).length;

    // Calculate executions today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const executionsToday = this.logs.filter(l => {
      const logDate = new Date(l.createdAt);
      return logDate >= today;
    }).length;

    // Calculate executions this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const executionsThisMonth = this.logs.filter(l => {
      const logDate = new Date(l.createdAt);
      return logDate >= thisMonth;
    }).length;

    // Calculate success rate
    const successLogs = this.logs.filter(l => l.status === 'success').length;
    const successRate = this.logs.length > 0
      ? Math.round((successLogs / this.logs.length) * 100)
      : 0;

    // Get recent logs (last 10)
    const recentLogs = [...this.logs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalRecipes,
      activeRecipes,
      executionsToday,
      executionsThisMonth,
      successRate,
      recentLogs
    };
  }
}

/**
 * Export singleton instance
 */
export const mockDataService = new MockDataService();

/**
 * Mock Activity Log Data Generator
 *
 * Generates realistic automation log data for development and testing.
 * Creates 500+ logs spread across the past 30 days.
 */

import type { MockAutomationLog, LogStatus, ResourceType } from './types';
import { generateMockRecipes } from './recipes';

/**
 * Seeded random number generator for consistent test data
 */
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const random = seededRandom(54321);

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

/**
 * Generate a random date within the last N days
 */
function randomPastDate(daysAgo: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  const randomTime = past.getTime() + (random() * (now.getTime() - past.getTime()));
  return new Date(randomTime);
}

/**
 * Sample product titles for mock data
 */
const PRODUCT_TITLES = [
  'Classic Cotton T-Shirt',
  'Premium Leather Wallet',
  'Wireless Bluetooth Headphones',
  'Stainless Steel Water Bottle',
  'Organic Face Moisturizer',
  'Bamboo Yoga Mat',
  'Vintage Denim Jacket',
  'Ergonomic Office Chair',
  'Ceramic Coffee Mug Set',
  'Smart Fitness Watch',
  'Handcrafted Wooden Cutting Board',
  'Merino Wool Sweater',
  'Portable Phone Charger',
  'Artisan Coffee Beans (12oz)',
  'Silk Pillowcase Set',
  'Professional Chef Knife',
  'Natural Soy Candle - Lavender',
  'Insulated Lunch Bag',
  'Memory Foam Pillow',
  'Botanical Print Tote Bag'
];

/**
 * Sample customer names for mock data
 */
const CUSTOMER_NAMES = [
  'Sarah Johnson',
  'Michael Chen',
  'Emily Rodriguez',
  'David Park',
  'Jessica Williams',
  'James Smith',
  'Olivia Martinez',
  'William Brown',
  'Sophia Taylor',
  'Alexander Lee',
  'Isabella Garcia',
  'Ethan Anderson',
  'Mia Thompson',
  'Benjamin White',
  'Charlotte Harris'
];

/**
 * Sample error messages for failed executions
 */
const ERROR_MESSAGES = [
  'API rate limit exceeded. Retrying in 2 seconds.',
  'Product not found or has been deleted.',
  'Insufficient permissions to modify metafield.',
  'Customer email address is invalid.',
  'Tag already exists on resource.',
  'Network timeout while communicating with Shopify API.',
  'Metafield namespace exceeds maximum length.',
  'Order is archived and cannot be modified.',
  'Resource is locked by another process.',
  'Invalid metafield type specified.'
];

/**
 * Generate a single mock log entry
 */
function generateSingleLog(logId: string, shop: string, daysAgo: number): MockAutomationLog {
  const recipes = generateMockRecipes();
  const enabledRecipes = recipes.filter(r => r.enabled);
  const recipe = randomChoice(enabledRecipes.length > 0 ? enabledRecipes : recipes);

  const statuses: LogStatus[] = ['success', 'success', 'success', 'success', 'failure', 'partial'];
  const status = randomChoice(statuses);

  const resourceTypes: ResourceType[] = [recipe.category as ResourceType];
  const resourceType = resourceTypes[0];

  const resourceTitles: Record<ResourceType, string[]> = {
    product: PRODUCT_TITLES,
    customer: CUSTOMER_NAMES,
    order: CUSTOMER_NAMES.map((name, i) => `Order #${10000 + i}`)
  };

  const resourceTitle = randomChoice(resourceTitles[resourceType]);
  const resourceId = `gid://shopify/${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}/${randomInt(1000000, 9999999)}`;

  const triggeredByOptions: ('webhook' | 'manual' | 'scheduled')[] = ['webhook', 'webhook', 'webhook', 'manual', 'scheduled'];
  const triggeredBy = randomChoice(triggeredByOptions);

  const executionTime = randomInt(100, 5000);

  const beforeState = resourceType === 'product'
    ? { tags: ['In-Stock'], inventory: randomInt(10, 100) }
    : resourceType === 'customer'
    ? { tags: ['Active'], totalSpent: randomInt(100, 1500) }
    : { tags: ['Pending'], financialStatus: 'pending' };

  const afterState = { ...beforeState };
  recipe.actions.forEach(action => {
    if (action.type === 'addTag' && action.tag) {
      afterState.tags = [...(afterState.tags || []), action.tag];
    } else if (action.type === 'removeTag' && action.tag) {
      afterState.tags = (afterState.tags || []).filter((t: string) => t !== action.tag);
    }
  });

  return {
    logId,
    shop,
    recipeId: recipe.recipeId,
    recipeTitle: recipe.title,
    resourceType,
    resourceId,
    resourceTitle,
    status,
    actionsPerformed: status !== 'failure' ? recipe.actions : [],
    executionTime,
    triggeredBy,
    errorMessage: status === 'failure' ? randomChoice(ERROR_MESSAGES) : undefined,
    beforeState: status !== 'failure' ? beforeState : undefined,
    afterState: status !== 'failure' ? afterState : undefined,
    createdAt: randomPastDate(daysAgo)
  };
}

/**
 * Generate 500+ mock activity logs spread across 30 days
 */
export function generateMockLogs(count: number = 500): MockAutomationLog[] {
  const shop = 'example-shop.myshopify.com';
  const logs: MockAutomationLog[] = [];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor((i / count) * 30);
    const logId = `log_${Date.now()}_${i.toString().padStart(5, '0')}`;
    logs.push(generateSingleLog(logId, shop, daysAgo));
  }

  return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get logs filtered by recipe ID
 */
export function getMockLogsByRecipe(recipeId: string, count: number = 100): MockAutomationLog[] {
  return generateMockLogs(500).filter(log => log.recipeId === recipeId).slice(0, count);
}

/**
 * Get logs filtered by status
 */
export function getMockLogsByStatus(status: LogStatus, count: number = 100): MockAutomationLog[] {
  return generateMockLogs(500).filter(log => log.status === status).slice(0, count);
}

/**
 * Get logs for a specific date range
 */
export function getMockLogsInDateRange(startDate: Date, endDate: Date): MockAutomationLog[] {
  return generateMockLogs(500).filter(log => {
    const logDate = new Date(log.createdAt);
    return logDate >= startDate && logDate <= endDate;
  });
}

/**
 * Get logs for today
 */
export function getMockLogsToday(): MockAutomationLog[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getMockLogsInDateRange(today, tomorrow);
}

/**
 * Get count of logs by status
 */
export function getLogCountsByStatus(): Record<LogStatus, number> {
  const logs = generateMockLogs(500);
  return {
    success: logs.filter(l => l.status === 'success').length,
    failure: logs.filter(l => l.status === 'failure').length,
    partial: logs.filter(l => l.status === 'partial').length,
    pending: logs.filter(l => l.status === 'pending').length
  };
}

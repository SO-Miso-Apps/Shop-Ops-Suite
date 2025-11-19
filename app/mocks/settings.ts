/**
 * Mock Shop Settings Data
 *
 * Provides mock settings data for different subscription plans.
 */

import type { MockSetting, SubscriptionPlan } from './types';

/**
 * Generate mock settings for a specific plan
 */
export function generateMockSettings(plan: SubscriptionPlan = 'free'): MockSetting {
  const shop = 'example-shop.myshopify.com';

  const planLimits: Record<SubscriptionPlan, { recipes: number; executions: number; bulkOps: number; logRetention: number }> = {
    free: { recipes: 5, executions: 1000, bulkOps: 1, logRetention: 30 },
    pro: { recipes: 999999, executions: 25000, bulkOps: 999999, logRetention: 365 },
    enterprise: { recipes: 999999, executions: 999999, bulkOps: 999999, logRetention: 999999 }
  };

  const planUsage: Record<SubscriptionPlan, { recipes: number; executions: number; bulkOps: number }> = {
    free: { recipes: 3, executions: 456, bulkOps: 1 },
    pro: { recipes: 18, executions: 8234, bulkOps: 5 },
    enterprise: { recipes: 67, executions: 45678, bulkOps: 23 }
  };

  return {
    shop,
    plan,
    subscriptionStatus: plan === 'free' ? 'active' : plan === 'pro' ? 'trial' : 'active',
    billingStatus: plan === 'free' ? 'active' : plan === 'pro' ? 'trial' : 'active',
    trialEndsAt: plan === 'pro' ? new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) : undefined, // 10 days from now
    usage: {
      recipesUsed: planUsage[plan].recipes,
      recipesLimit: planLimits[plan].recipes,
      executionsThisMonth: planUsage[plan].executions,
      executionsLimit: planLimits[plan].executions,
      bulkOperationsUsed: planUsage[plan].bulkOps,
      bulkOperationsLimit: planLimits[plan].bulkOps
    },
    preferences: {
      emailNotifications: true,
      timezone: 'America/New_York',
      logRetentionDays: planLimits[plan].logRetention
    },
    timezone: 'America/New_York', // Deprecated
    notifications: {
      dailySummary: true,
      onError: true,
      email: 'shop-owner@example.com'
    },
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-10T14:30:00Z')
  };
}

/**
 * Get mock settings for Free plan
 */
export function getMockSettingsFree(): MockSetting {
  return generateMockSettings('free');
}

/**
 * Get mock settings for Pro plan
 */
export function getMockSettingsPro(): MockSetting {
  return generateMockSettings('pro');
}

/**
 * Get mock settings for Enterprise plan
 */
export function getMockSettingsEnterprise(): MockSetting {
  return generateMockSettings('enterprise');
}

/**
 * Get default mock settings (Free plan)
 */
export function getDefaultMockSettings(): MockSetting {
  return getMockSettingsFree();
}

/**
 * Calculate usage percentage for recipes
 */
export function getRecipeUsagePercentage(settings: MockSetting): number {
  return Math.round((settings.usage.recipesUsed / settings.usage.recipesLimit) * 100);
}

/**
 * Calculate usage percentage for executions
 */
export function getExecutionUsagePercentage(settings: MockSetting): number {
  return Math.round((settings.usage.executionsThisMonth / settings.usage.executionsLimit) * 100);
}

/**
 * Check if recipe limit is reached
 */
export function isRecipeLimitReached(settings: MockSetting): boolean {
  return settings.usage.recipesUsed >= settings.usage.recipesLimit;
}

/**
 * Check if execution limit is reached
 */
export function isExecutionLimitReached(settings: MockSetting): boolean {
  return settings.usage.executionsThisMonth >= settings.usage.executionsLimit;
}

/**
 * Check if approaching recipe limit (>80%)
 */
export function isApproachingRecipeLimit(settings: MockSetting): boolean {
  return getRecipeUsagePercentage(settings) > 80;
}

/**
 * Check if approaching execution limit (>80%)
 */
export function isApproachingExecutionLimit(settings: MockSetting): boolean {
  return getExecutionUsagePercentage(settings) > 80;
}

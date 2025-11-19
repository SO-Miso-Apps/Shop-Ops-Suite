/**
 * Mock Recipe Data Generator
 *
 * Generates realistic recipe data for development and testing.
 * Includes 20+ recipes across customer, order, and product categories.
 */

import type { MockRecipe } from './types';

/**
 * Seeded random number generator for consistent test data
 */
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * Generate a random date within the last N days
 */
function randomPastDate(daysAgo: number): Date {
  const random = seededRandom(12345);
  const now = new Date();
  const past = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  const randomTime = past.getTime() + (random() * (now.getTime() - past.getTime()));
  return new Date(randomTime);
}

/**
 * Generate 20+ mock recipes matching PRD specifications
 */
export function generateMockRecipes(): MockRecipe[] {
  const shop = 'example-shop.myshopify.com';

  return [
    // ========== CUSTOMER RECIPES (6) ==========
    {
      recipeId: 'recipe_customer_vip',
      shop,
      title: 'VIP Customer Tagging',
      description: 'Automatically tag customers who have spent over $1,000 as VIP for special treatment and exclusive offers.',
      category: 'customer',
      enabled: true,
      conditions: [
        { field: 'totalSpent', operator: 'greaterThanOrEqual', value: 1000 }
      ],
      actions: [
        { type: 'addTag', tag: 'VIP' }
      ],
      executionCount: 847,
      createdAt: randomPastDate(90),
      updatedAt: randomPastDate(7),
      lastExecutedAt: randomPastDate(1)
    },
    {
      recipeId: 'recipe_customer_high_value',
      shop,
      title: 'High Value Customer',
      description: 'Tag customers with lifetime value over $500 as high-value to prioritize customer support.',
      category: 'customer',
      enabled: true,
      conditions: [
        { field: 'totalSpent', operator: 'greaterThanOrEqual', value: 500 },
        { field: 'ordersCount', operator: 'greaterThanOrEqual', value: 3 }
      ],
      actions: [
        { type: 'addTag', tag: 'High-Value' },
        { type: 'setMetafield', metafieldNamespace: 'custom', metafieldKey: 'customer_tier', metafieldValue: 'gold', metafieldType: 'single_line_text_field' }
      ],
      executionCount: 1243,
      createdAt: randomPastDate(120),
      updatedAt: randomPastDate(14),
      lastExecutedAt: randomPastDate(2)
    },
    {
      recipeId: 'recipe_customer_at_risk',
      shop,
      title: 'At-Risk Customer Alert',
      description: 'Tag customers who haven\'t ordered in 90 days to trigger re-engagement campaigns.',
      category: 'customer',
      enabled: true,
      conditions: [
        { field: 'daysSinceLastOrder', operator: 'greaterThan', value: 90 },
        { field: 'ordersCount', operator: 'greaterThanOrEqual', value: 2 }
      ],
      actions: [
        { type: 'addTag', tag: 'At-Risk' },
        { type: 'removeTag', tag: 'Active' }
      ],
      executionCount: 312,
      createdAt: randomPastDate(60),
      updatedAt: randomPastDate(5),
      lastExecutedAt: randomPastDate(1)
    },
    {
      recipeId: 'recipe_customer_first_purchase',
      shop,
      title: 'First-Time Buyer Welcome',
      description: 'Tag new customers after their first purchase to send welcome emails and discount codes.',
      category: 'customer',
      enabled: true,
      conditions: [
        { field: 'ordersCount', operator: 'equals', value: 1 }
      ],
      actions: [
        { type: 'addTag', tag: 'First-Time-Buyer' },
        { type: 'setMetafield', metafieldNamespace: 'custom', metafieldKey: 'welcome_sent', metafieldValue: 'true', metafieldType: 'boolean' }
      ],
      executionCount: 2156,
      createdAt: randomPastDate(150),
      updatedAt: randomPastDate(30),
      lastExecutedAt: randomPastDate(0)
    },
    {
      recipeId: 'recipe_customer_repeat',
      shop,
      title: 'Repeat Customer Loyalty',
      description: 'Tag customers with 5+ orders as loyal repeat customers for loyalty program enrollment.',
      category: 'customer',
      enabled: true,
      conditions: [
        { field: 'ordersCount', operator: 'greaterThanOrEqual', value: 5 }
      ],
      actions: [
        { type: 'addTag', tag: 'Repeat-Customer' },
        { type: 'addTag', tag: 'Loyalty-Program' }
      ],
      executionCount: 678,
      createdAt: randomPastDate(100),
      updatedAt: randomPastDate(20),
      lastExecutedAt: randomPastDate(1)
    },
    {
      recipeId: 'recipe_customer_wholesale',
      shop,
      title: 'Wholesale Customer Setup',
      description: 'Tag customers with wholesale email domains and set special pricing metafields.',
      category: 'customer',
      enabled: false,
      conditions: [
        { field: 'email', operator: 'contains', value: '@wholesale.com' }
      ],
      actions: [
        { type: 'addTag', tag: 'Wholesale' },
        { type: 'setMetafield', metafieldNamespace: 'pricing', metafieldKey: 'discount_tier', metafieldValue: 'wholesale_30', metafieldType: 'single_line_text_field' }
      ],
      executionCount: 0,
      createdAt: randomPastDate(30),
      updatedAt: randomPastDate(1)
    },

    // ========== ORDER RECIPES (6) ==========
    {
      recipeId: 'recipe_order_priority_shipping',
      shop,
      title: 'Priority Shipping for High-Value Orders',
      description: 'Tag orders over $200 for priority shipping to ensure fast delivery for important customers.',
      category: 'order',
      enabled: true,
      conditions: [
        { field: 'totalPrice', operator: 'greaterThanOrEqual', value: 200 }
      ],
      actions: [
        { type: 'addTag', tag: 'Priority-Shipping' }
      ],
      executionCount: 4521,
      createdAt: randomPastDate(180),
      updatedAt: randomPastDate(45),
      lastExecutedAt: randomPastDate(0)
    },
    {
      recipeId: 'recipe_order_international',
      shop,
      title: 'International Order Processing',
      description: 'Tag international orders and add customs documentation metafield for warehouse team.',
      category: 'order',
      enabled: true,
      conditions: [
        { field: 'shippingCountry', operator: 'notEquals', value: 'US' }
      ],
      actions: [
        { type: 'addTag', tag: 'International' },
        { type: 'setMetafield', metafieldNamespace: 'shipping', metafieldKey: 'requires_customs', metafieldValue: 'true', metafieldType: 'boolean' }
      ],
      executionCount: 1834,
      createdAt: randomPastDate(200),
      updatedAt: randomPastDate(60),
      lastExecutedAt: randomPastDate(0)
    },
    {
      recipeId: 'recipe_order_wholesale',
      shop,
      title: 'Wholesale Order Handling',
      description: 'Tag wholesale orders (10+ items) for special packaging and invoice generation.',
      category: 'order',
      enabled: true,
      conditions: [
        { field: 'lineItemsCount', operator: 'greaterThanOrEqual', value: 10 }
      ],
      actions: [
        { type: 'addTag', tag: 'Wholesale-Order' },
        { type: 'setMetafield', metafieldNamespace: 'fulfillment', metafieldKey: 'packaging_type', metafieldValue: 'bulk', metafieldType: 'single_line_text_field' }
      ],
      executionCount: 567,
      createdAt: randomPastDate(90),
      updatedAt: randomPastDate(15),
      lastExecutedAt: randomPastDate(2)
    },
    {
      recipeId: 'recipe_order_gift',
      shop,
      title: 'Gift Order Special Handling',
      description: 'Detect gift orders by note keywords and add gift wrapping instructions.',
      category: 'order',
      enabled: true,
      conditions: [
        { field: 'note', operator: 'contains', value: 'gift' }
      ],
      actions: [
        { type: 'addTag', tag: 'Gift-Order' },
        { type: 'setMetafield', metafieldNamespace: 'fulfillment', metafieldKey: 'gift_wrap', metafieldValue: 'true', metafieldType: 'boolean' }
      ],
      executionCount: 923,
      createdAt: randomPastDate(120),
      updatedAt: randomPastDate(25),
      lastExecutedAt: randomPastDate(1)
    },
    {
      recipeId: 'recipe_order_high_risk',
      shop,
      title: 'High-Risk Fraud Alert',
      description: 'Tag orders with mismatched billing/shipping addresses for manual fraud review.',
      category: 'order',
      enabled: true,
      conditions: [
        { field: 'billingAddress', operator: 'notEquals', value: 'shippingAddress' }
      ],
      actions: [
        { type: 'addTag', tag: 'Fraud-Review' },
        { type: 'setMetafield', metafieldNamespace: 'risk', metafieldKey: 'hold_fulfillment', metafieldValue: 'true', metafieldType: 'boolean' }
      ],
      executionCount: 234,
      createdAt: randomPastDate(75),
      updatedAt: randomPastDate(10),
      lastExecutedAt: randomPastDate(3)
    },
    {
      recipeId: 'recipe_order_rush',
      shop,
      title: 'Rush Order Processing',
      description: 'Tag orders with "rush" in notes for same-day fulfillment priority.',
      category: 'order',
      enabled: false,
      conditions: [
        { field: 'note', operator: 'contains', value: 'rush' }
      ],
      actions: [
        { type: 'addTag', tag: 'Rush-Order' },
        { type: 'addTag', tag: 'Same-Day-Ship' }
      ],
      executionCount: 0,
      createdAt: randomPastDate(20),
      updatedAt: randomPastDate(5)
    },

    // ========== PRODUCT RECIPES (8+) ==========
    {
      recipeId: 'recipe_product_low_stock',
      shop,
      title: 'Low Stock Alert',
      description: 'Tag products with inventory below 10 units to trigger reorder notifications.',
      category: 'product',
      enabled: true,
      conditions: [
        { field: 'inventoryQuantity', operator: 'lessThan', value: 10 },
        { field: 'inventoryQuantity', operator: 'greaterThan', value: 0 }
      ],
      actions: [
        { type: 'addTag', tag: 'Low-Stock' },
        { type: 'setMetafield', metafieldNamespace: 'inventory', metafieldKey: 'reorder_needed', metafieldValue: 'true', metafieldType: 'boolean' }
      ],
      executionCount: 3421,
      createdAt: randomPastDate(250),
      updatedAt: randomPastDate(80),
      lastExecutedAt: randomPastDate(0)
    },
    {
      recipeId: 'recipe_product_out_of_stock',
      shop,
      title: 'Out of Stock Handling',
      description: 'Tag out-of-stock products and hide from storefront search results.',
      category: 'product',
      enabled: true,
      conditions: [
        { field: 'inventoryQuantity', operator: 'equals', value: 0 }
      ],
      actions: [
        { type: 'addTag', tag: 'Out-of-Stock' },
        { type: 'removeTag', tag: 'In-Stock' }
      ],
      executionCount: 2156,
      createdAt: randomPastDate(200),
      updatedAt: randomPastDate(50),
      lastExecutedAt: randomPastDate(1)
    },
    {
      recipeId: 'recipe_product_bestseller',
      shop,
      title: 'Best Seller Badge',
      description: 'Tag products with 100+ sales in the last 30 days as bestsellers for featured collections.',
      category: 'product',
      enabled: true,
      conditions: [
        { field: 'salesLast30Days', operator: 'greaterThanOrEqual', value: 100 }
      ],
      actions: [
        { type: 'addTag', tag: 'Bestseller' },
        { type: 'setMetafield', metafieldNamespace: 'custom', metafieldKey: 'badge', metafieldValue: 'bestseller', metafieldType: 'single_line_text_field' }
      ],
      executionCount: 1876,
      createdAt: randomPastDate(160),
      updatedAt: randomPastDate(40),
      lastExecutedAt: randomPastDate(1)
    },
    {
      recipeId: 'recipe_product_slow_mover',
      shop,
      title: 'Slow-Moving Inventory',
      description: 'Tag products with no sales in 90 days for clearance or promotion campaigns.',
      category: 'product',
      enabled: true,
      conditions: [
        { field: 'daysSinceLastSale', operator: 'greaterThan', value: 90 }
      ],
      actions: [
        { type: 'addTag', tag: 'Slow-Mover' },
        { type: 'addTag', tag: 'Clearance-Candidate' }
      ],
      executionCount: 645,
      createdAt: randomPastDate(140),
      updatedAt: randomPastDate(35),
      lastExecutedAt: randomPastDate(2)
    },
    {
      recipeId: 'recipe_product_high_margin',
      shop,
      title: 'High-Margin Product Focus',
      description: 'Tag products with profit margin over 60% for upselling and promotion priority.',
      category: 'product',
      enabled: true,
      conditions: [
        { field: 'profitMargin', operator: 'greaterThanOrEqual', value: 60 }
      ],
      actions: [
        { type: 'addTag', tag: 'High-Margin' },
        { type: 'setMetafield', metafieldNamespace: 'marketing', metafieldKey: 'upsell_priority', metafieldValue: 'high', metafieldType: 'single_line_text_field' }
      ],
      executionCount: 1234,
      createdAt: randomPastDate(180),
      updatedAt: randomPastDate(45),
      lastExecutedAt: randomPastDate(1)
    },
    {
      recipeId: 'recipe_product_new_arrival',
      shop,
      title: 'New Arrival Tagging',
      description: 'Tag products created in the last 14 days as new arrivals for homepage showcase.',
      category: 'product',
      enabled: true,
      conditions: [
        { field: 'daysSinceCreated', operator: 'lessThanOrEqual', value: 14 }
      ],
      actions: [
        { type: 'addTag', tag: 'New-Arrival' },
        { type: 'setMetafield', metafieldNamespace: 'custom', metafieldKey: 'badge', metafieldValue: 'new', metafieldType: 'single_line_text_field' }
      ],
      executionCount: 892,
      createdAt: randomPastDate(100),
      updatedAt: randomPastDate(20),
      lastExecutedAt: randomPastDate(0)
    },
    {
      recipeId: 'recipe_product_seasonal',
      shop,
      title: 'Seasonal Product Management',
      description: 'Tag products in seasonal collections for automated visibility during peak seasons.',
      category: 'product',
      enabled: false,
      conditions: [
        { field: 'collections', operator: 'contains', value: 'Summer' }
      ],
      actions: [
        { type: 'addTag', tag: 'Seasonal-Summer' },
        { type: 'setMetafield', metafieldNamespace: 'visibility', metafieldKey: 'seasonal_start', metafieldValue: '2025-06-01', metafieldType: 'date' }
      ],
      executionCount: 0,
      createdAt: randomPastDate(60),
      updatedAt: randomPastDate(10)
    },
    {
      recipeId: 'recipe_product_bundle_eligible',
      shop,
      title: 'Bundle Eligibility Tagging',
      description: 'Tag products with price between $20-$50 as eligible for bundle deals.',
      category: 'product',
      enabled: true,
      conditions: [
        { field: 'price', operator: 'greaterThanOrEqual', value: 20 },
        { field: 'price', operator: 'lessThanOrEqual', value: 50 }
      ],
      actions: [
        { type: 'addTag', tag: 'Bundle-Eligible' }
      ],
      executionCount: 2341,
      createdAt: randomPastDate(120),
      updatedAt: randomPastDate(30),
      lastExecutedAt: randomPastDate(1)
    },
    {
      recipeId: 'recipe_product_eco_friendly',
      shop,
      title: 'Eco-Friendly Product Badge',
      description: 'Tag products with "organic", "sustainable", or "eco" in title/description for green collections.',
      category: 'product',
      enabled: true,
      conditions: [
        { field: 'title', operator: 'contains', value: 'organic' }
      ],
      actions: [
        { type: 'addTag', tag: 'Eco-Friendly' },
        { type: 'setMetafield', metafieldNamespace: 'custom', metafieldKey: 'badge', metafieldValue: 'eco', metafieldType: 'single_line_text_field' }
      ],
      executionCount: 567,
      createdAt: randomPastDate(80),
      updatedAt: randomPastDate(15),
      lastExecutedAt: randomPastDate(2)
    },
    {
      recipeId: 'recipe_product_limited_edition',
      shop,
      title: 'Limited Edition Scarcity',
      description: 'Tag products with inventory less than 5 units as limited edition to drive urgency.',
      category: 'product',
      enabled: true,
      conditions: [
        { field: 'inventoryQuantity', operator: 'lessThanOrEqual', value: 5 },
        { field: 'inventoryQuantity', operator: 'greaterThan', value: 0 }
      ],
      actions: [
        { type: 'addTag', tag: 'Limited-Edition' },
        { type: 'setMetafield', metafieldNamespace: 'custom', metafieldKey: 'urgency_badge', metafieldValue: 'only_few_left', metafieldType: 'single_line_text_field' }
      ],
      executionCount: 1456,
      createdAt: randomPastDate(95),
      updatedAt: randomPastDate(18),
      lastExecutedAt: randomPastDate(0)
    }
  ];
}

/**
 * Get a single mock recipe by ID
 */
export function getMockRecipeById(recipeId: string): MockRecipe | undefined {
  return generateMockRecipes().find(recipe => recipe.recipeId === recipeId);
}

/**
 * Get mock recipes filtered by category
 */
export function getMockRecipesByCategory(category: string): MockRecipe[] {
  return generateMockRecipes().filter(recipe => recipe.category === category);
}

/**
 * Get count of enabled recipes
 */
export function getEnabledRecipesCount(): number {
  return generateMockRecipes().filter(recipe => recipe.enabled).length;
}

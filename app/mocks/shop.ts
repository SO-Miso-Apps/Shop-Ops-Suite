/**
 * Mock Shop Metadata
 *
 * Provides mock shop data for development and testing.
 */

import type { MockShop } from './types';

/**
 * Generate mock shop metadata
 */
export function generateMockShop(): MockShop {
  return {
    shop: 'example-shop.myshopify.com',
    name: 'Example Store',
    shopName: 'Example Store',
    email: 'owner@example-shop.com',
    currency: 'USD',
    country: 'US',
    shopifyPlan: 'shopify',
    installedAt: new Date('2024-01-15T10:00:00Z'),
    lastSyncAt: new Date('2025-01-18T08:45:00Z')
  };
}

/**
 * Generate mock shop with different Shopify plans
 */
export function generateMockShopWithPlan(shopifyPlan: string): MockShop {
  const baseShop = generateMockShop();
  return {
    ...baseShop,
    shopifyPlan
  };
}

/**
 * Sample mock shops for different countries
 */
export const MOCK_SHOPS: MockShop[] = [
  {
    shop: 'example-shop.myshopify.com',
    name: 'Example Store',
    shopName: 'Example Store',
    email: 'owner@example-shop.com',
    currency: 'USD',
    country: 'US',
    shopifyPlan: 'shopify',
    installedAt: new Date('2024-01-15T10:00:00Z'),
    lastSyncAt: new Date('2025-01-18T08:45:00Z')
  },
  {
    shop: 'boutique-canada.myshopify.com',
    name: 'Canadian Boutique',
    shopName: 'Canadian Boutique',
    email: 'info@boutique-canada.com',
    currency: 'CAD',
    country: 'CA',
    shopifyPlan: 'advanced',
    installedAt: new Date('2024-03-20T14:30:00Z'),
    lastSyncAt: new Date('2025-01-18T09:15:00Z')
  },
  {
    shop: 'uk-retail.myshopify.com',
    name: 'UK Retail Co',
    shopName: 'UK Retail Co',
    email: 'contact@uk-retail.co.uk',
    currency: 'GBP',
    country: 'GB',
    shopifyPlan: 'plus',
    installedAt: new Date('2023-11-10T11:00:00Z'),
    lastSyncAt: new Date('2025-01-18T07:30:00Z')
  },
  {
    shop: 'aussie-merch.myshopify.com',
    name: 'Aussie Merchandise',
    shopName: 'Aussie Merchandise',
    email: 'sales@aussie-merch.com.au',
    currency: 'AUD',
    country: 'AU',
    shopifyPlan: 'shopify',
    installedAt: new Date('2024-05-05T09:00:00Z'),
    lastSyncAt: new Date('2025-01-18T10:00:00Z')
  },
  {
    shop: 'euro-fashion.myshopify.com',
    name: 'European Fashion Hub',
    shopName: 'European Fashion Hub',
    email: 'info@euro-fashion.eu',
    currency: 'EUR',
    country: 'DE',
    shopifyPlan: 'basic',
    installedAt: new Date('2024-07-12T16:45:00Z'),
    lastSyncAt: new Date('2025-01-18T08:00:00Z')
  }
];

/**
 * Get default mock shop
 */
export function getDefaultMockShop(): MockShop {
  return MOCK_SHOPS[0];
}

/**
 * Get mock shop by domain
 */
export function getMockShopByDomain(shop: string): MockShop | undefined {
  return MOCK_SHOPS.find(s => s.shop === shop);
}

/**
 * Get mock shops by country
 */
export function getMockShopsByCountry(country: string): MockShop[] {
  return MOCK_SHOPS.filter(s => s.country === country);
}

/**
 * Get mock shops by Shopify plan
 */
export function getMockShopsByPlan(plan: string): MockShop[] {
  return MOCK_SHOPS.filter(s => s.shopifyPlan === plan);
}

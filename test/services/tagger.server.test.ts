import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { MetafieldRule, connectDB } from '~/db.server';
import mongoose from 'mongoose';
import { evaluateMetafieldRules } from '~/services/tagger.server';

// Mock Shopify Admin Context
const mockAdmin = {
    graphql: vi.fn(),
};

// Helper để tạo giả lập response từ Shopify
const mockShopifyResponse = (success = true) => ({
    json: async () => ({
        data: {
            metafieldsSet: {
                metafields: success ? [{ id: 'gid://shopify/Metafield/1', namespace: 'custom', key: 'material' }] : [],
                userErrors: success ? [] : [{ field: ['value'], message: 'Invalid value' }],
            },
        },
    }),
});

describe('Metafield Service Logic', () => {
    const shop = 'test-shop.myshopify.com';

    beforeAll(async () => {
        // Kết nối in-memory mongo hoặc test db nếu có cấu hình
        // Ở đây giả định môi trường test đã setup DB connection qua setup.ts hoặc connectDB
        if (mongoose.connection.readyState === 0) {
            await connectDB();
        }
    });

    afterAll(async () => {
        // Dọn dẹp sau khi test
        await MetafieldRule.deleteMany({ shop });
    });

    beforeEach(async () => {
        vi.clearAllMocks();
        await MetafieldRule.deleteMany({ shop });
    });

    describe('evaluateMetafieldRules', () => {
        it('should apply rule when NO conditions exist (apply to all)', async () => {
            // Setup: Tạo rule không có điều kiện
            await MetafieldRule.create({
                shop,
                name: 'Default Material',
                resourceType: 'products',
                isEnabled: true,
                conditions: [],
                definition: { namespace: 'custom', key: 'material', value: 'Cotton' }
            });

            mockAdmin.graphql.mockResolvedValue(mockShopifyResponse(true));

            // Act: Chạy hàm đánh giá với payload bất kỳ
            await evaluateMetafieldRules(mockAdmin, shop, { id: 123, title: 'Any Product' }, 'products');

            // Assert: Mutation phải được gọi
            expect(mockAdmin.graphql).toHaveBeenCalledTimes(1);
            const mutationCall = mockAdmin.graphql.mock.calls[0];
            expect(mutationCall[1].variables.metafields[0]).toMatchObject({
                key: 'material',
                value: 'Cotton',
                ownerId: 'gid://shopify/Product/123'
            });
        });

        it('should apply rule when SINGLE condition matches (Equals)', async () => {
            await MetafieldRule.create({
                shop,
                name: 'Nike Rule',
                resourceType: 'products',
                conditions: [{ field: 'vendor', operator: 'equals', value: 'Nike' }],
                definition: { namespace: 'custom', key: 'brand_type', value: 'Premium' }
            });

            mockAdmin.graphql.mockResolvedValue(mockShopifyResponse(true));

            // Act: Payload khớp Vendor = Nike
            await evaluateMetafieldRules(mockAdmin, shop, { id: 1, vendor: 'Nike' }, 'products');

            expect(mockAdmin.graphql).toHaveBeenCalledTimes(1);
        });

        it('should NOT apply rule when SINGLE condition fails', async () => {
            await MetafieldRule.create({
                shop,
                name: 'Nike Rule',
                resourceType: 'products',
                conditions: [{ field: 'vendor', operator: 'equals', value: 'Nike' }],
                definition: { namespace: 'custom', key: 'brand_type', value: 'Premium' }
            });

            // Act: Payload Vendor = Adidas (Không khớp)
            await evaluateMetafieldRules(mockAdmin, shop, { id: 1, vendor: 'Adidas' }, 'products');

            expect(mockAdmin.graphql).not.toHaveBeenCalled();
        });

        it('should apply rule when MULTIPLE conditions match (AND Logic)', async () => {
            await MetafieldRule.create({
                shop,
                name: 'Expensive Nike',
                resourceType: 'products',
                conditions: [
                    { field: 'vendor', operator: 'equals', value: 'Nike' },
                    { field: 'price', operator: 'greater_than', value: '100' }
                ],
                definition: { namespace: 'custom', key: 'tier', value: 'High-End' }
            });

            mockAdmin.graphql.mockResolvedValue(mockShopifyResponse(true));

            // Act: Vendor = Nike VÀ Price = 150 (> 100) -> Khớp
            await evaluateMetafieldRules(mockAdmin, shop, { id: 1, vendor: 'Nike', price: '150.00' }, 'products');

            expect(mockAdmin.graphql).toHaveBeenCalledTimes(1);
        });

        it('should handle numeric comparisons correctly', async () => {
            await MetafieldRule.create({
                shop,
                name: 'Cheap Items',
                resourceType: 'products',
                conditions: [{ field: 'price', operator: 'less_than', value: '50' }],
                definition: { namespace: 'custom', key: 'segment', value: 'Budget' }
            });

            mockAdmin.graphql.mockResolvedValue(mockShopifyResponse(true));

            // Case 1: Price 40 < 50 (Match)
            await evaluateMetafieldRules(mockAdmin, shop, { id: 1, price: '40' }, 'products');
            expect(mockAdmin.graphql).toHaveBeenCalledTimes(1);

            vi.clearAllMocks();

            // Case 2: Price 60 > 50 (No Match)
            await evaluateMetafieldRules(mockAdmin, shop, { id: 2, price: '60' }, 'products');
            expect(mockAdmin.graphql).not.toHaveBeenCalled();
        });

        it('should handle nested fields (e.g. default_address.country_code)', async () => {
            await MetafieldRule.create({
                shop,
                name: 'US Customers',
                resourceType: 'customers',
                conditions: [{ field: 'default_address.country_code', operator: 'equals', value: 'US' }],
                definition: { namespace: 'marketing', key: 'market', value: 'Domestic' }
            });

            mockAdmin.graphql.mockResolvedValue(mockShopifyResponse(true));

            // Act: Payload có cấu trúc lồng nhau
            await evaluateMetafieldRules(mockAdmin, shop, {
                id: 1,
                default_address: { country_code: 'US' }
            }, 'customers');

            expect(mockAdmin.graphql).toHaveBeenCalledTimes(1);
        });

        it('should ignore disabled rules', async () => {
            await MetafieldRule.create({
                shop,
                name: 'Disabled Rule',
                resourceType: 'products',
                isEnabled: false, // OFF
                conditions: [],
                definition: { namespace: 'custom', key: 'test', value: 'test' }
            });

            await evaluateMetafieldRules(mockAdmin, shop, { id: 1 }, 'products');

            expect(mockAdmin.graphql).not.toHaveBeenCalled();
        });
    });
});
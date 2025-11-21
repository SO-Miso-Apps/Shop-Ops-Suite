import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TaggerService } from "~/services/tagger.service";
import { MetafieldRule } from "~/models/MetafieldRule";

// Mock dependencies
vi.mock("~/models/MetafieldRule");
vi.mock("~/models/ActivityLog");
vi.mock("~/shopify.server", () => ({
    unauthenticated: {
        admin: vi.fn()
    }
}));

describe("Metafield Service Logic", () => {
    describe("evaluateMetafieldRules", () => {
        const shop = "test-shop.myshopify.com";
        const mockAdmin = {
            graphql: vi.fn()
        };

        beforeEach(() => {
            vi.clearAllMocks();
            // Default mock response for graphql
            mockAdmin.graphql.mockResolvedValue({
                json: async () => ({
                    data: {
                        metafieldsSet: {
                            userErrors: []
                        }
                    }
                })
            });
        });

        it("should apply rule when NO conditions exist (apply to all)", async () => {
            // Arrange
            const mockRule = {
                name: "Always Apply",
                conditions: [], // No conditions
                definition: { namespace: "custom", key: "test", value: "1", valueType: "integer" }
            };
            (MetafieldRule.find as any).mockResolvedValue([mockRule]);

            // Act
            await TaggerService.evaluateMetafieldRules(mockAdmin, shop, { id: 123, title: "Product A" }, "products");

            // Assert
            expect(mockAdmin.graphql).toHaveBeenCalledTimes(1);
            const mutationCall = mockAdmin.graphql.mock.calls[0];
            expect(mutationCall[0]).toContain("mutation metafieldsSet");
            expect(mutationCall[1].variables.metafields[0].value).toBe("1");
        });

        it("should apply rule when SINGLE condition matches (Equals)", async () => {
            // Arrange
            const mockRule = {
                name: "Vendor Nike",
                conditions: [{ field: "vendor", operator: "equals", value: "Nike" }],
                definition: { namespace: "custom", key: "brand", value: "Nike", valueType: "single_line_text_field" }
            };
            (MetafieldRule.find as any).mockResolvedValue([mockRule]);

            // Act
            await TaggerService.evaluateMetafieldRules(mockAdmin, shop, { id: 1, vendor: "Nike" }, "products");

            // Assert
            expect(mockAdmin.graphql).toHaveBeenCalledTimes(1);
        });

        it("should NOT apply rule when SINGLE condition fails", async () => {
            // Arrange
            const mockRule = {
                name: "Vendor Nike",
                conditions: [{ field: "vendor", operator: "equals", value: "Nike" }],
                definition: { namespace: "custom", key: "brand", value: "Nike", valueType: "single_line_text_field" }
            };
            (MetafieldRule.find as any).mockResolvedValue([mockRule]);

            // Act
            await TaggerService.evaluateMetafieldRules(mockAdmin, shop, { id: 1, vendor: "Adidas" }, "products");

            // Assert
            expect(mockAdmin.graphql).not.toHaveBeenCalled();
        });

        it("should apply rule when MULTIPLE conditions match (AND Logic)", async () => {
            // Arrange
            const mockRule = {
                name: "Expensive Nike",
                conditions: [
                    { field: "vendor", operator: "equals", value: "Nike" },
                    { field: "price", operator: "greater_than", value: "100" }
                ],
                definition: { namespace: "custom", key: "tier", value: "premium", valueType: "single_line_text_field" }
            };
            (MetafieldRule.find as any).mockResolvedValue([mockRule]);

            // Act
            await TaggerService.evaluateMetafieldRules(mockAdmin, shop, { id: 1, vendor: "Nike", price: "150.00" }, "products");

            // Assert
            expect(mockAdmin.graphql).toHaveBeenCalledTimes(1);
        });

        it("should handle numeric comparisons correctly", async () => {
            const mockRule = {
                name: "Cheap",
                conditions: [{ field: "price", operator: "less_than", value: "50" }],
                definition: { namespace: "custom", key: "tag", value: "cheap", valueType: "single_line_text_field" }
            };
            (MetafieldRule.find as any).mockResolvedValue([mockRule]);

            // Case 1: Price 40 < 50 (Match)
            await TaggerService.evaluateMetafieldRules(mockAdmin, shop, { id: 1, price: "40.00" }, "products");
            expect(mockAdmin.graphql).toHaveBeenCalledTimes(1);

            mockAdmin.graphql.mockClear();

            // Case 2: Price 60 > 50 (No Match)
            await TaggerService.evaluateMetafieldRules(mockAdmin, shop, { id: 1, price: "60.00" }, "products");
            expect(mockAdmin.graphql).not.toHaveBeenCalled();
        });

        it("should handle nested fields (e.g. default_address.country_code)", async () => {
            const mockRule = {
                name: "US Customer",
                conditions: [{ field: "default_address.country_code", operator: "equals", value: "US" }],
                definition: { namespace: "custom", key: "market", value: "domestic", valueType: "single_line_text_field" }
            };
            (MetafieldRule.find as any).mockResolvedValue([mockRule]);

            // Act
            await TaggerService.evaluateMetafieldRules(mockAdmin, shop, {
                id: 1,
                default_address: { country_code: 'US' }
            }, "customers");

            // Assert
            expect(mockAdmin.graphql).toHaveBeenCalledTimes(1);
        });

        it("should ignore disabled rules", async () => {
            // Arrange: Mock find to return empty if isEnabled: true is passed,
            // but here we are mocking the result of find().sort().
            // The service calls find({ isEnabled: true }).
            // So if we mock the return value, we assume the query was correct.
            // But to test logic, we can simulate that the service filters correctly?
            // Actually, the service query includes `isEnabled: true`.
            // So if we mock the DB return, we are testing the JS logic AFTER the DB call.
            // But the DB call *is* the filter.
            // So this test is actually testing that the service *calls* find with isEnabled: true?
            // Or if we pass a disabled rule in the mock return, does the service filter it again?
            // The service code: `const rules = await MetafieldRule.find({ ..., isEnabled: true })`
            // So the DB does the filtering.
            // If we want to test that, we should check the arguments to find().

            (MetafieldRule.find as any).mockResolvedValue([]);

            await TaggerService.evaluateMetafieldRules(mockAdmin, shop, { id: 1 }, 'products');

            expect(mockAdmin.graphql).not.toHaveBeenCalled();
            expect(MetafieldRule.find).toHaveBeenCalledWith(expect.objectContaining({
                isEnabled: true
            }));
        });
    });
});
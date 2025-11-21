import { ProductQuery, InventoryItemUpdateMutation } from "~/graphql/products";
import { ActivityService } from "./activity.service";

export class CogsService {
    static async getProductsWithCosts(admin: any, paginationArgs: any, filter?: string, query?: string) {
        const variables = { ...paginationArgs };
        if (query) {
            variables.query = query;
        }
        const response = await admin.graphql(ProductQuery, { variables });
        const data = await response.json();

        let totalValue = 0;
        let totalMargin = 0;
        let marginCount = 0;
        let missingCosts = 0;

        const products = data.data.products.nodes.map((p: any) => {
            return {
                id: p.id,
                title: p.title,
                image: p.featuredImage?.url,
                options: p.options,
                variants: p.variants.nodes.map((v: any) => {
                    const price = parseFloat(v.price);
                    const cost = v.inventoryItem.unitCost?.amount ? parseFloat(v.inventoryItem.unitCost.amount) : 0;
                    const quantity = v.inventoryQuantity || 0;
                    const margin = this.calculateMargin(price, cost);

                    // Stats calculation
                    if (cost > 0) {
                        totalValue += cost * quantity;
                        totalMargin += margin;
                        marginCount++;
                    } else {
                        missingCosts++;
                    }

                    return {
                        id: v.id,
                        title: v.title,
                        price,
                        cost,
                        inventoryItemId: v.inventoryItem.id,
                        selectedOptions: v.selectedOptions,
                        margin,
                        inventoryQuantity: quantity
                    };
                }),
            };
        });

        let filteredProducts = products;
        if (filter === 'low_margin') {
            filteredProducts = products.map((p: any) => ({
                ...p,
                variants: p.variants.filter((v: any) => v.margin < 15)
            })).filter((p: any) => p.variants.length > 0);
        }

        const avgMargin = marginCount > 0 ? Math.round(totalMargin / marginCount) : 0;

        return {
            products: filteredProducts,
            pageInfo: data.data.products.pageInfo,
            stats: {
                totalValue,
                avgMargin,
                missingCosts
            }
        };
    }

    static async updateProductCosts(admin: any, shop: string, updates: any[]) {
        const errors: any[] = [];

        // Execute sequentially to be safe with rate limits for now
        for (const update of updates) {
            try {
                const response = await admin.graphql(InventoryItemUpdateMutation, {
                    variables: {
                        id: update.inventoryItemId,
                        input: {
                            cost: update.cost,
                        },
                    },
                });

                const data = await response.json();
                if (data.data?.inventoryItemUpdate?.userErrors?.length > 0) {
                    errors.push(...data.data.inventoryItemUpdate.userErrors);
                }
            } catch (e) {
                console.error("Failed to update inventory item", update.inventoryItemId, e);
                errors.push({ message: `Failed to update ${update.inventoryItemId}` });
            }
        }

        if (updates.length > 0 && errors.length === 0) {
            await ActivityService.createLog({
                shop,
                resourceType: "Product",
                resourceId: "Bulk", // or use the first item ID?
                action: "Updated Product Costs",
                detail: `Updated costs for ${updates.length} variants`,
                status: "Success"
            });
        }

        return errors;
    }

    private static calculateMargin(price: number, cost: number) {
        if (!cost || !price) return 0;
        return ((price - cost) / price) * 100;
    }
}

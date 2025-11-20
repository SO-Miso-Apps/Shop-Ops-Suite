import { ProductQuery, InventoryItemUpdateMutation } from "~/graphql/products";

export class CogsService {
    static async getProductsWithCosts(admin: any, paginationArgs: any) {
        const response = await admin.graphql(ProductQuery, { variables: paginationArgs });
        const data = await response.json();

        const products = data.data.products.nodes.map((p: any) => {
            return {
                id: p.id,
                title: p.title,
                image: p.featuredImage?.url,
                options: p.options,
                variants: p.variants.nodes.map((v: any) => ({
                    id: v.id,
                    title: v.title,
                    price: parseFloat(v.price),
                    cost: v.inventoryItem.unitCost?.amount ? parseFloat(v.inventoryItem.unitCost.amount) : 0,
                    inventoryItemId: v.inventoryItem.id,
                    selectedOptions: v.selectedOptions,
                    margin: this.calculateMargin(parseFloat(v.price), v.inventoryItem.unitCost?.amount ? parseFloat(v.inventoryItem.unitCost.amount) : 0)
                })),
            };
        });

        return {
            products,
            pageInfo: data.data.products.pageInfo
        };
    }

    static async updateProductCosts(admin: any, updates: any[]) {
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

        return errors;
    }

    private static calculateMargin(price: number, cost: number) {
        if (!cost || !price) return 0;
        return ((price - cost) / price) * 100;
    }
}

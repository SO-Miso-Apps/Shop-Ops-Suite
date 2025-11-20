import { unauthenticated } from "../shopify.server";
import { ActivityLog } from "../db.server";

export async function processCleanerJob(job: any) {
    const { shop, tagsToRemove } = job.data;
    console.log(`Processing cleaner job for ${shop}: removing tags ${tagsToRemove.join(", ")}`);

    try {
        const { admin } = await unauthenticated.admin(shop);
        if (!admin) throw new Error("No admin context");

        let productsUpdated = 0;
        let customersUpdated = 0;
        const errors: string[] = [];

        // Helper function to clean tags from a resource
        const cleanResourceTags = async (resourceType: "products" | "customers") => {
            let hasNextPage = true;
            let cursor = null;
            let updated = 0;

            while (hasNextPage) {
                // Fetch items with tags
                const fetchQuery = `#graphql
                    query get${resourceType}($cursor: String) {
                        ${resourceType}(first: 50, after: $cursor) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            nodes {
                                id
                                tags
                            }
                        }
                    }
                `;

                try {
                    const response = await admin.graphql(fetchQuery, { variables: { cursor } }) as any;
                    const data = await response.json();
                    const nodes = data.data[resourceType].nodes;

                    // Process each node
                    for (const node of nodes) {
                        const currentTags = node.tags || [];
                        const newTags = currentTags.filter((tag: string) => !tagsToRemove.includes(tag));

                        // Only update if tags changed
                        if (newTags.length !== currentTags.length) {
                            const updateMutation = resourceType === "products"
                                ? `#graphql
                                    mutation productUpdate($input: ProductInput!) {
                                        productUpdate(input: $input) {
                                            product {
                                                id
                                                tags
                                            }
                                            userErrors {
                                                field
                                                message
                                            }
                                        }
                                    }
                                `
                                : `#graphql
                                    mutation customerUpdate($input: CustomerInput!) {
                                        customerUpdate(input: $input) {
                                            customer {
                                                id
                                                tags
                                            }
                                            userErrors {
                                                field
                                                message
                                            }
                                        }
                                    }
                                `;

                            try {
                                const updateResponse = await admin.graphql(updateMutation, {
                                    variables: {
                                        input: {
                                            id: node.id,
                                            tags: newTags
                                        }
                                    }
                                });

                                const updateData = await updateResponse.json();
                                const mutationKey = resourceType === "products" ? "productUpdate" : "customerUpdate";

                                if (updateData.data[mutationKey].userErrors?.length > 0) {
                                    errors.push(`${node.id}: ${updateData.data[mutationKey].userErrors[0].message}`);
                                } else {
                                    updated++;
                                }
                            } catch (e) {
                                errors.push(`${node.id}: ${e instanceof Error ? e.message : 'Update failed'}`);
                            }
                        }
                    }

                    const pageInfo = data.data[resourceType].pageInfo;
                    hasNextPage = pageInfo.hasNextPage;
                    cursor = pageInfo.endCursor;

                } catch (e) {
                    console.error(`Error cleaning ${resourceType}:`, e);
                    errors.push(`Fetch error: ${e instanceof Error ? e.message : 'Unknown error'}`);
                    hasNextPage = false;
                }
            }

            return updated;
        };

        // Execute cleanup for both products and customers
        productsUpdated = await cleanResourceTags("products");
        customersUpdated = await cleanResourceTags("customers");

        // Log to activity
        await ActivityLog.create({
            shop,
            resourceType: "Mixed",
            resourceId: "Bulk",
            action: "Tag Cleanup",
            detail: `Removed tags [${tagsToRemove.join(", ")}] from ${productsUpdated} products and ${customersUpdated} customers. ${errors.length > 0 ? `Errors: ${errors.slice(0, 5).join("; ")}` : ""}`,
            status: errors.length > 0 ? "Partial Success" : "Success",
        });

        console.log(`✅ Tag cleanup complete: ${productsUpdated} products, ${customersUpdated} customers updated`);

    } catch (error) {
        console.error("Cleaner job error:", error);
        await ActivityLog.create({
            shop,
            resourceType: "Mixed",
            resourceId: "Bulk",
            action: "Tag Cleanup",
            detail: `Failed to clean tags: ${(error as Error).message}`,
            status: "Failed",
        });
        throw error;
    }
}

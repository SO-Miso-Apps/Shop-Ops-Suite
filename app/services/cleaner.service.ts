import { unauthenticated } from "../shopify.server";
import { ActivityLog } from "../models/ActivityLog";
import { GetResourceTagsQuery, ProductUpdateMutation, CustomerUpdateMutation } from "../graphql/cleaner";

export class CleanerService {
    static async scanTags(admin: any, resourceType: "products" | "customers", limit: number) {
        const allTags: string[] = [];
        let hasNextPage = true;
        let cursor = null;
        let count = 0;

        while (hasNextPage && count < limit) {
            try {
                const response: any = await admin.graphql(GetResourceTagsQuery(resourceType), {
                    variables: { cursor, first: 250 }
                });
                const data: any = await response.json();

                const nodes = data.data[resourceType].nodes;
                nodes.forEach((node: any) => allTags.push(...node.tags));

                const pageInfo: any = data.data[resourceType].pageInfo;
                hasNextPage = pageInfo.hasNextPage;
                cursor = pageInfo.endCursor;
                count += nodes.length;

            } catch (e) {
                console.error(`Error scanning ${resourceType}:`, e);
                hasNextPage = false;
            }
        }
        return { count, tags: allTags };
    }

    static async processCleanerJob(job: any) {
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
                    try {
                        // Use smaller batch for updates to be safe
                        const response = await admin.graphql(GetResourceTagsQuery(resourceType), {
                            variables: { cursor, first: 50 }
                        }) as any;
                        const data = await response.json();
                        const nodes = data.data[resourceType].nodes;

                        // Process each node
                        for (const node of nodes) {
                            const currentTags = node.tags || [];
                            const newTags = currentTags.filter((tag: string) => !tagsToRemove.includes(tag));

                            // Only update if tags changed
                            if (newTags.length !== currentTags.length) {
                                const updateMutation = resourceType === "products" ? ProductUpdateMutation : CustomerUpdateMutation;
                                const mutationKey = resourceType === "products" ? "productUpdate" : "customerUpdate";

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
}

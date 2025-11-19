import { unauthenticated } from "../shopify.server";
import { ActivityLog } from "../db.server";

export async function processBulkJob(job: any) {
    const { shop, resourceType, findTag, replaceTag, operation } = job.data;
    console.log(`Processing bulk job for ${shop}: ${operation} ${findTag} -> ${replaceTag}`);

    try {
        const { admin } = await unauthenticated.admin(shop);
        if (!admin) throw new Error("No admin context");

        // 1. Find resources with the tag
        // For MVP, we use a simple query. For production, use bulkOperationRunQuery.
        // We'll fetch first 50 matching items for this demo to avoid complexity of bulk op file parsing.

        const query = `#graphql
      query ($query: String!) {
        ${resourceType}(first: 50, query: $query) {
          nodes {
            id
            tags
          }
        }
      }
    `;

        const searchRes = await admin.graphql(query, {
            variables: {
                query: `tag:${findTag}`,
            },
        });

        const searchData = await searchRes.json();
        const resources = searchData.data[resourceType].nodes;

        if (resources.length === 0) {
            await ActivityLog.create({
                shop,
                resourceType,
                resourceId: "Bulk",
                action: "Bulk Operation",
                detail: `No ${resourceType} found with tag '${findTag}'`,
                status: "Success",
            });
            return;
        }

        // 2. Perform updates
        let successCount = 0;

        for (const item of resources) {
            let newTags = [...item.tags];

            if (operation === "replace") {
                newTags = newTags.filter(t => t !== findTag);
                if (!newTags.includes(replaceTag)) newTags.push(replaceTag);
            } else if (operation === "remove") {
                newTags = newTags.filter(t => t !== findTag);
            } else if (operation === "add") {
                // "findTag" here acts as the condition, but if operation is add, maybe we just add to all?
                // But the UI implies "Find Tag" is the condition.
                // If operation is "add", we might want to add 'replaceTag' (as the tag to add) 
                // to items that have 'findTag'.
                // Let's assume: Find items with 'findTag', and add 'replaceTag' to them.
                if (!newTags.includes(replaceTag)) newTags.push(replaceTag);
            }

            const mutation = `#graphql
        mutation tagsAdd($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) {
            userErrors {
              message
            }
          }
        }
      `;

            // Note: tagsAdd adds tags. To remove, we need tagsRemove or tagsUpdate.
            // tagsUpdate replaces ALL tags. tagsRemove removes specific tags.
            // Let's use tagsRemove if removing, tagsAdd if adding.
            // If replacing, we might need both or tagsUpdate.
            // Safest is tagsUpdate (set tags to new list), but it overwrites concurrent changes.
            // Better: remove old, add new.

            if (operation === "remove" || operation === "replace") {
                const removeMutation = `#graphql
          mutation tagsRemove($id: ID!, $tags: [String!]!) {
            tagsRemove(id: $id, tags: $tags) {
              userErrors {
                message
              }
            }
          }
        `;
                await admin.graphql(removeMutation, {
                    variables: { id: item.id, tags: [findTag] }
                });
            }

            if (operation === "add" || operation === "replace") {
                const addMutation = `#graphql
          mutation tagsAdd($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              userErrors {
                message
              }
            }
          }
        `;
                await admin.graphql(addMutation, {
                    variables: { id: item.id, tags: [replaceTag] }
                });
            }

            successCount++;
        }

        await ActivityLog.create({
            shop,
            resourceType,
            resourceId: "Bulk",
            action: "Bulk Operation",
            detail: `Processed ${successCount} items. Operation: ${operation} '${findTag}'`,
            status: "Success",
        });

    } catch (error) {
        console.error("Bulk job error:", error);
        await ActivityLog.create({
            shop,
            resourceType,
            resourceId: "Bulk",
            action: "Bulk Operation",
            detail: `Failed: ${(error as Error).message}`,
            status: "Failed",
        });
        throw error;
    }
}

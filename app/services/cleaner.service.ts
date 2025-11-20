import { unauthenticated } from "../shopify.server";
import { ActivityService } from "./activity.service";
import { BulkOperationService } from "./bulk_operation.service";
import { cleanerQueue } from "../queues";
import { Backup } from "../models/Backup";
import { UsageService } from "./usage.service";

export class CleanerService {
    // Kept for backward compatibility or small tasks if needed, but cleaner job uses processCleanerJob
    static async scanTags(admin: any, resourceType: "products" | "customers", limit: number) {
        // ... existing implementation or deprecated ...
        return { count: 0, tags: [] };
    }

    static async processCleanerJob(job: any) {
        const { shop, tagsToRemove, step = 'init', operationId, mutationOpId, resourceType = 'products' } = job.data;
        const currentJobId = job.data.jobId;
        console.log(`Processing cleaner job for ${shop}: removing ${tagsToRemove} [Step: ${step}]`);

        try {
            // We need to process both products and customers. 
            // To keep it simple, we can do products first, then customers.
            // Or run two separate jobs.
            // Let's assume the UI sends separate jobs or we handle one resource type at a time.
            // If the job is generic "cleaner", we might need to spawn child jobs.
            // Let's assume the current job handles 'products' first, then 'customers' if not specified.
            // Simplified: The job should specify `resourceType`. If not, we default to 'products' and then queue another for 'customers'?
            // Better: The UI should probably trigger two jobs.
            // But for now, let's support `resourceType` in job data. If missing, we do products, then queue customers.

            const currentResourceType = resourceType;

            // --- STEP 1: INIT (Start Query) ---
            if (step === 'init') {
                // Query all items that have ANY of the tags to remove
                // query: "tag:A OR tag:B"
                const tagQuery = tagsToRemove.map((t: string) => `tag:${t}`).join(" OR ");
                const query = `
                {
                    ${currentResourceType}(query: "${tagQuery}") {
                        edges {
                            node {
                                id
                                tags
                            }
                        }
                    }
                }`;

                const bulkOp = await BulkOperationService.runBulkQuery(shop, query);
                await cleanerQueue.add(job.name, { ...job.data, step: 'polling_query', operationId: bulkOp.id, resourceType: currentResourceType, jobId: currentJobId }, { delay: 5000 });

                await ActivityService.createLog({
                    shop,
                    resourceType: "Mixed",
                    resourceId: "Bulk",
                    action: "Tag Cleanup",
                    detail: `Started Cleanup Query for ${currentResourceType}: ${bulkOp.id}`,
                    jobId: currentJobId,
                    status: "Pending",
                });
                return;
            }

            // --- STEP 2: POLLING QUERY ---
            if (step === 'polling_query') {
                const bulkOp = await BulkOperationService.pollBulkOperation(shop, operationId);

                if (bulkOp.status === 'RUNNING' || bulkOp.status === 'CREATED') {
                    await cleanerQueue.add(job.name, job.data, { delay: 5000 });
                    return;
                }

                if (bulkOp.status === 'COMPLETED') {
                    if (parseInt(bulkOp.objectCount) === 0) {
                        // No items found. If we are doing products, maybe move to customers?
                        if (currentResourceType === 'products') {
                            await cleanerQueue.add(job.name, { ...job.data, step: 'init', resourceType: 'customers', jobId: currentJobId }, { delay: 0 });
                            return;
                        }
                        await ActivityService.createLog({
                            shop,
                            resourceType: "Mixed",
                            resourceId: "Bulk",
                            action: "Tag Cleanup",
                            detail: `No items found to clean.`,
                            jobId: currentJobId,
                            status: "Success",
                        });
                        return;
                    }
                    await cleanerQueue.add(job.name, { ...job.data, step: 'processing', resultUrl: bulkOp.url, jobId: currentJobId }, { delay: 0 });
                    return;
                }
                throw new Error(`Bulk Query Failed: ${bulkOp.status}`);
            }

            // --- STEP 3: PROCESSING & MUTATION ---
            if (step === 'processing') {
                const { resultUrl } = job.data;
                const response = await fetch(resultUrl);
                const jsonlText = await response.text();
                const lines = jsonlText.split('\n').filter(line => line.trim() !== '');

                const mutations = [];
                const backupItems = [];

                for (const line of lines) {
                    const item = JSON.parse(line);
                    const currentTags = item.tags || [];
                    const newTags = currentTags.filter((t: string) => !tagsToRemove.includes(t));

                    if (newTags.length !== currentTags.length) {
                        mutations.push({
                            id: item.id,
                            tags: newTags
                        });
                        backupItems.push({
                            resourceId: item.id,
                            originalTags: currentTags
                        });
                    }
                }

                if (mutations.length === 0) {
                    if (currentResourceType === 'products') {
                        await cleanerQueue.add(job.name, { ...job.data, step: 'init', resourceType: 'customers', jobId: currentJobId }, { delay: 0 });
                        return;
                    }
                    return;
                }

                // Save Backup
                await Backup.create({
                    shop,
                    jobId: currentJobId,
                    resourceType: currentResourceType,
                    items: backupItems
                });

                const mutationLines = mutations.map(m => JSON.stringify({ input: m }));
                const mutationFileContent = mutationLines.join('\n');

                const stagedUpload = await BulkOperationService.getStagedUploadUrl(shop);
                const formData = new FormData();
                stagedUpload.parameters.forEach((p: any) => formData.append(p.name, p.value));
                formData.append("file", new Blob([mutationFileContent], { type: "text/jsonl" }));

                await fetch(stagedUpload.url, { method: "POST", body: formData });

                const mutationQuery = currentResourceType === 'products'
                    ? `mutation productUpdate($input: ProductInput!) { productUpdate(input: $input) { product { id } userErrors { message } } }`
                    : `mutation customerUpdate($input: CustomerInput!) { customerUpdate(input: $input) { customer { id } userErrors { message } } }`;

                const mutationOp = await BulkOperationService.runBulkMutation(shop, mutationQuery, stagedUpload.parameters.find((p: any) => p.name === 'key').value);

                await cleanerQueue.add(job.name, { ...job.data, step: 'polling_mutation', mutationOpId: mutationOp.id, count: mutations.length, jobId: currentJobId }, { delay: 5000 });
                return;
            }

            // --- STEP 4: POLLING MUTATION ---
            if (step === 'polling_mutation') {
                const { mutationOpId, count } = job.data;
                const bulkOp = await BulkOperationService.pollBulkOperation(shop, mutationOpId);

                if (bulkOp.status === 'RUNNING' || bulkOp.status === 'CREATED') {
                    await cleanerQueue.add(job.name, job.data, { delay: 5000 });
                    return;
                }

                if (bulkOp.status === 'COMPLETED') {
                    // Record usage
                    await UsageService.recordOperation(shop, count);

                    await ActivityService.createLog({
                        shop,
                        resourceType: "Mixed",
                        resourceId: "Bulk",
                        action: "Tag Cleanup",
                        detail: `Cleaned ${count} ${currentResourceType}.`,
                        jobId: currentJobId,
                        status: "Success",
                    });

                    // If we just finished products, start customers
                    if (currentResourceType === 'products') {
                        await cleanerQueue.add(job.name, { ...job.data, step: 'init', resourceType: 'customers', jobId: currentJobId }, { delay: 0 });
                    }
                    return;
                }
                throw new Error(`Bulk Mutation Failed: ${bulkOp.status}`);
            }

        } catch (error) {
            console.error("Cleaner job error:", error);
            await ActivityService.createLog({
                shop,
                resourceType: "Mixed",
                resourceId: "Bulk",
                action: "Tag Cleanup",
                detail: `Failed: ${(error as Error).message}`,
                jobId: currentJobId,
                status: "Failed",
            });
            throw error;
        }
    }
}

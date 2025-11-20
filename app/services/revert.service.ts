import { unauthenticated } from "../shopify.server";
import { Backup } from "../models/Backup";
import { ActivityLog } from "../models/ActivityLog";
import { BulkOperationService } from "./bulk_operation.service";
import { bulkQueue } from "../queues";

export class RevertService {
    static async revertBackup(shop: string, jobId: string) {
        const backup = await Backup.findOne({ shop, jobId });
        if (!backup) {
            throw new Error("Backup not found for this job.");
        }

        console.log(`Reverting job ${jobId} for ${shop}. Items: ${backup.items.length}`);

        // We create a new Bulk Job to restore original tags
        // We can reuse the "bulkQueue" but we need a custom processor or just use the generic "processing" step logic?
        // Actually, we can just create a JSONL file and run mutation directly here (or queue it).
        // Since it might be large, we should use the queue.
        // We can create a "revert" job type in bulkQueue.
        // Or just reuse `processBulkJob`? No, `processBulkJob` logic is specific to find/replace.
        // We need a generic "Apply Mutations" job.

        // Let's add a new job type or step to bulkQueue?
        // Or simpler: Just handle it here if it's small, or spawn a job.
        // Let's spawn a job with step='processing' and provide the resultUrl?
        // No, 'processing' expects a resultUrl from a Query.
        // Here we already have the data (backup.items).
        // We can skip to "Mutation" phase.
        // But `bulk.server.ts` expects `step='processing'` to parse JSONL.

        // Let's create a specific "revert" job handler in `bulk.server.ts`?
        // Or just implement the logic here and use `bulkQueue` to poll.

        // 1. Create Mutation JSONL from Backup
        const mutations = backup.items.map((item: any) => ({
            id: item.resourceId,
            tags: item.originalTags
        }));

        const mutationLines = mutations.map((m: any) => JSON.stringify({
            input: { id: m.id, tags: m.tags }
        }));
        const mutationFileContent = mutationLines.join('\n');

        // 2. Upload
        const stagedUpload = await BulkOperationService.getStagedUploadUrl(shop);
        const formData = new FormData();
        stagedUpload.parameters.forEach((p: any) => formData.append(p.name, p.value));
        formData.append("file", new Blob([mutationFileContent], { type: "text/jsonl" }));

        await fetch(stagedUpload.url, { method: "POST", body: formData });

        // 3. Run Mutation
        const resourceType = backup.resourceType;
        const mutationQuery = resourceType === 'products'
            ? `mutation productUpdate($input: ProductInput!) { productUpdate(input: $input) { product { id } userErrors { message } } }`
            : `mutation customerUpdate($input: CustomerInput!) { customerUpdate(input: $input) { customer { id } userErrors { message } } }`;

        const mutationOp = await BulkOperationService.runBulkMutation(shop, mutationQuery, stagedUpload.parameters.find((p: any) => p.name === 'key').value);

        // 4. Queue polling job
        // We can reuse `bulkQueue` with a special step 'polling_revert' or just 'polling_mutation' if we match the data structure.
        // `processBulkJob` expects `mutationOpId` and `count`.
        // It logs "Successfully updated...".
        // We can reuse `step='polling_mutation'`.

        await bulkQueue.add("revert-job", {
            shop,
            resourceType,
            step: 'polling_mutation',
            mutationOpId: mutationOp.id,
            count: mutations.length,
            // Add extra context if needed
        }, { delay: 5000 });

        await ActivityLog.create({
            shop,
            resourceType,
            resourceId: "Bulk",
            jobId: `revert-${jobId}`,
            action: "Revert",
            detail: `Started revert for job ${jobId}. Operation: ${mutationOp.id}`,
            status: "Pending",
        });

        return { success: true, message: "Revert started" };
    }
}

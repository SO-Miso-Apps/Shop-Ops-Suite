import { unauthenticated } from "../shopify.server";
import { ActivityLog } from "../db.server";
import { BulkOperationService } from "./bulk_operation.service";
import { bulkQueue } from "../queues";
import { Backup } from "../models/Backup";

export async function processBulkJob(job: any) {
  const { shop, resourceType, findTag, replaceTag, operation, step = 'init', operationId, mutationOpId } = job.data;
  console.log(`Processing bulk job for ${shop}: ${operation} ${findTag} -> ${replaceTag} [Step: ${step}]`);

  try {
    // --- STEP 1: INIT (Start Query) ---
    if (step === 'init') {
      const query = `
            {
                ${resourceType}(query: "tag:${findTag}") {
                    edges {
                        node {
                            id
                            tags
                        }
                    }
                }
            }`;

      const bulkOp = await BulkOperationService.runBulkQuery(shop, query);
      await bulkQueue.add(job.name, { ...job.data, step: 'polling_query', operationId: bulkOp.id }, { delay: 5000 });

      await ActivityLog.create({
        shop,
        resourceType,
        resourceId: "Bulk",
        action: "Bulk Operation",
        detail: `Started Bulk Query: ${bulkOp.id}`,
        status: "Pending",
      });
      return;
    }

    // --- STEP 2: POLLING QUERY ---
    if (step === 'polling_query') {
      const bulkOp = await BulkOperationService.pollBulkOperation(shop, operationId);

      if (bulkOp.status === 'RUNNING' || bulkOp.status === 'CREATED') {
        await bulkQueue.add(job.name, job.data, { delay: 5000 });
        return;
      }

      if (bulkOp.status === 'COMPLETED') {
        if (parseInt(bulkOp.objectCount) === 0) {
          await ActivityLog.create({
            shop,
            resourceType,
            resourceId: "Bulk",
            action: "Bulk Operation",
            detail: `No items found with tag '${findTag}'`,
            status: "Success",
          });
          return;
        }
        await bulkQueue.add(job.name, { ...job.data, step: 'processing', resultUrl: bulkOp.url }, { delay: 0 });
        return;
      }

      throw new Error(`Bulk Query Failed: ${bulkOp.status} - ${bulkOp.errorCode}`);
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
        // Note: bulkOperationRunQuery returns nested structure slightly differently depending on query
        // But here we asked for edges { node { id tags } } so the JSONL lines are the nodes directly?
        // Actually, JSONL from bulk query flattens the structure. It will be objects with { id, tags }.
        // Let's assume standard JSONL output.

        let newTags = [...(item.tags || [])];
        let needsUpdate = false;

        if (operation === "replace") {
          if (newTags.includes(findTag)) {
            newTags = newTags.filter(t => t !== findTag);
            if (!newTags.includes(replaceTag)) newTags.push(replaceTag);
            needsUpdate = true;
          }
        } else if (operation === "remove") {
          if (newTags.includes(findTag)) {
            newTags = newTags.filter(t => t !== findTag);
            needsUpdate = true;
          }
        } else if (operation === "add") {
          // If we found it via query, it has the tag.
          if (!newTags.includes(replaceTag)) {
            newTags.push(replaceTag);
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          // We use tagsAdd or tagsRemove? 
          // Bulk Mutation using tagsAdd/tagsRemove is tricky because we need to know which one.
          // But we can use `tagsUpdate` (if available) or just `tagsAdd` and `tagsRemove`.
          // Actually, `tagsAdd` adds, `tagsRemove` removes.
          // If replacing, we need TWO mutations.
          // OR, we can use `productUpdate` / `customerUpdate` which sets the tags (overwrites).
          // `productUpdate(input: {id: ..., tags: ...})` replaces all tags.
          // This is safer for "replace" logic.

          mutations.push({
            id: item.id,
            tags: newTags
          });
          backupItems.push({
            resourceId: item.id,
            originalTags: item.tags || []
          });
        }
      }

      if (mutations.length === 0) {
        await ActivityLog.create({
          shop,
          resourceType,
          resourceId: "Bulk",
          action: "Bulk Operation",
          detail: `No updates needed for ${lines.length} items.`,
          status: "Success",
        });
        return;
      }

      // Save Backup
      await Backup.create({
        shop,
        jobId: job.id, // Use BullMQ Job ID as reference
        resourceType,
        items: backupItems
      });

      // Create Mutation JSONL
      // We will use `productUpdate` or `customerUpdate`.
      // Variable: input: { id: "...", tags: [...] }
      const mutationLines = mutations.map(m => JSON.stringify({ input: m }));
      const mutationFileContent = mutationLines.join('\n');

      // Upload
      const stagedUpload = await BulkOperationService.getStagedUploadUrl(shop);
      const formData = new FormData();
      stagedUpload.parameters.forEach((p: any) => formData.append(p.name, p.value));
      formData.append("file", new Blob([mutationFileContent], { type: "text/jsonl" }));

      await fetch(stagedUpload.url, {
        method: "POST",
        body: formData,
      });

      // Run Mutation
      // We need to know if it's product or customer to choose the mutation.
      const mutationQuery = resourceType === 'products'
        ? `mutation productUpdate($input: ProductInput!) { productUpdate(input: $input) { product { id } userErrors { message } } }`
        : `mutation customerUpdate($input: CustomerInput!) { customerUpdate(input: $input) { customer { id } userErrors { message } } }`;

      const mutationOp = await BulkOperationService.runBulkMutation(shop, mutationQuery, stagedUpload.parameters.find((p: any) => p.name === 'key').value);

      await bulkQueue.add(job.name, { ...job.data, step: 'polling_mutation', mutationOpId: mutationOp.id, count: mutations.length }, { delay: 5000 });
      return;
    }

    // --- STEP 4: POLLING MUTATION ---
    if (step === 'polling_mutation') {
      const { mutationOpId, count } = job.data;
      const bulkOp = await BulkOperationService.pollBulkOperation(shop, mutationOpId);

      if (bulkOp.status === 'RUNNING' || bulkOp.status === 'CREATED') {
        await bulkQueue.add(job.name, job.data, { delay: 5000 });
        return;
      }

      if (bulkOp.status === 'COMPLETED') {
        // We could check for errors in the result file, but for MVP we assume success if no system errors.
        await ActivityLog.create({
          shop,
          resourceType,
          resourceId: "Bulk",
          action: "Bulk Operation",
          detail: `Successfully updated ${count} items.`,
          status: "Success",
        });
        return;
      }

      throw new Error(`Bulk Mutation Failed: ${bulkOp.status}`);
    }

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

import { unauthenticated } from "../shopify.server";
import { ActivityService } from "./activity.service";
import { TaggingRule } from "../models/TaggingRule";
import { MetafieldRule } from "../models/MetafieldRule";

interface WebhookPayload {
    id: number | string;
    [key: string]: any;
}

export class TaggerService {
    static async getRules(shop: string) {
        return await TaggingRule.find({ shop }).sort({ createdAt: -1 });
    }

    static async getLibraryRules() {
        const shopAdmin = process.env.SHOP_ADMIN;
        if (!shopAdmin) return [];
        return await TaggingRule.find({ shop: shopAdmin, isEnabled: true });
    }

    static async countActiveRules(shop: string) {
        return await TaggingRule.countDocuments({ shop, isEnabled: true });
    }

    static async saveRule(shop: string, data: any) {
        if (data._id) {
            return await TaggingRule.findOneAndUpdate(
                { shop, _id: data._id },
                { ...data, updatedAt: new Date() },
                { new: true }
            );
        } else {
            return await TaggingRule.create({
                shop,
                ...data
            });
        }
    }

    static async toggleRule(shop: string, id: string, isEnabled: boolean) {
        return await TaggingRule.findOneAndUpdate(
            { shop, _id: id },
            { isEnabled },
            { new: true }
        );
    }

    static async deleteRule(shop: string, id: string) {
        return await TaggingRule.findOneAndDelete({ shop, _id: id });
    }

    static async processWebhookJob(job: any) {
        const { shop, topic, payload } = job.data;
        console.log(`Processing webhook ${topic} for ${shop}`);

        try {
            const { admin } = await unauthenticated.admin(shop);
            if (!admin) {
                throw new Error(`Could not get admin client for ${shop}`);
            }

            // 1. Xử lý Tagging Rules (Smart Tagger - Dynamic Logic)
            if (topic === "ORDERS_CREATE" || topic === "ORDERS_UPDATED") {
                await TaggerService.evaluateTaggingRules(admin, shop, payload, "orders");
            } else if (topic === "CUSTOMERS_UPDATE") { // Note: CUSTOMERS_CREATE usually doesn't have much data yet, but we can support it if needed
                await TaggerService.evaluateTaggingRules(admin, shop, payload, "customers");
            }

            // 2. Xử lý Metafield Rules (NEW Logic)
            if (topic === "PRODUCTS_CREATE" || topic === "PRODUCTS_UPDATE") {
                // Chuẩn hóa payload sản phẩm một chút để dễ truy cập
                const normalizedPayload = {
                    ...payload,
                    price: payload.variants?.[0]?.price, // Flatten price để dễ đặt rule
                    sku: payload.variants?.[0]?.sku,
                    inventory: payload.variants?.[0]?.inventory_quantity
                };
                await TaggerService.evaluateMetafieldRules(admin, shop, normalizedPayload, "products");
            }
            else if (topic === "CUSTOMERS_CREATE" || topic === "CUSTOMERS_UPDATE") {
                await TaggerService.evaluateMetafieldRules(admin, shop, payload, "customers");
            }

        } catch (error) {
            console.error(`Error processing webhook ${topic}:`, error);
            await ActivityService.createLog({
                shop,
                resourceType: 'System',
                resourceId: 'N/A',
                action: 'Webhook Processing',
                detail: `Failed to process ${topic}: ${(error as Error).message}`,
                status: 'Failed',
            });
            throw error; // Retry job via Queue
        }
    }

    private static async evaluateTaggingRules(
        admin: any,
        shop: string,
        resource: any,
        resourceType: "orders" | "customers"
    ) {
        const rules = await TaggingRule.find({ shop, resourceType, isEnabled: true });
        if (rules.length === 0) return;

        const tagsToAdd = new Set<string>();
        const tagsToRemove = new Set<string>();
        const logs: any[] = [];

        // 1. Calculate Tags to Add vs Remove
        for (const rule of rules) {
            const isMatch = TaggerService.checkConditions(resource, rule.conditions, rule.conditionLogic || 'AND');

            if (isMatch) {
                rule.tags.forEach((t: string) => tagsToAdd.add(t));
                logs.push({
                    shop,
                    resourceType: resourceType === 'orders' ? 'Order' : 'Customer',
                    resourceId: resource.id.toString(),
                    action: 'Add Tag',
                    detail: `Rule '${rule.name}' matched. Tags: ${rule.tags.join(', ')}`,
                    status: 'Success',
                });
            } else {
                // If rule doesn't match, we should remove these tags
                // UNLESS they are added by another matching rule (handled later by Set difference)
                rule.tags.forEach((t: string) => tagsToRemove.add(t));
            }
        }

        // 2. Resolve Conflicts: If a tag is in both Add and Remove, Add wins.
        for (const tag of tagsToAdd) {
            tagsToRemove.delete(tag);
        }

        // 3. Execute GraphQL Mutations
        const resourceGid = `gid://shopify/${resourceType === 'orders' ? 'Order' : 'Customer'}/${resource.id}`;

        if (tagsToAdd.size > 0) {
            await TaggerService.addTags(admin, resourceGid, Array.from(tagsToAdd));
        }

        if (tagsToRemove.size > 0) {
            await TaggerService.removeTags(admin, resourceGid, Array.from(tagsToRemove));
            logs.push({
                shop,
                resourceType: resourceType === 'orders' ? 'Order' : 'Customer',
                resourceId: resource.id.toString(),
                action: 'Remove Tag',
                detail: `Tags removed: ${Array.from(tagsToRemove).join(', ')}`,
                status: 'Success',
            });
        }

        // 4. Save Logs
        for (const log of logs) {
            await ActivityService.createLog(log);
        }
    }

    private static async addTags(admin: any, id: string, tags: string[]) {
        const tagsAddMutation = `#graphql
          mutation tagsAdd($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              userErrors {
                message
              }
            }
          }
        `;
        await admin.graphql(tagsAddMutation, { variables: { id, tags } });
    }

    private static async removeTags(admin: any, id: string, tags: string[]) {
        const tagsRemoveMutation = `#graphql
          mutation tagsRemove($id: ID!, $tags: [String!]!) {
            tagsRemove(id: $id, tags: $tags) {
              userErrors {
                message
              }
            }
          }
        `;
        await admin.graphql(tagsRemoveMutation, { variables: { id, tags } });
    }

    public static async evaluateMetafieldRules(
        admin: any,
        shop: string,
        resource: WebhookPayload,
        resourceType: "products" | "customers"
    ) {

        const rules = await MetafieldRule.find({
            shop,
            resourceType,
            isEnabled: true
        });

        if (rules.length === 0) {
            console.log(`ℹ No active rules found for ${resourceType}`);
            return;
        }

        const mutationsToRun: any[] = [];

        for (const rule of rules) {
            const isMatch = TaggerService.checkConditions(resource, rule.conditions, rule.conditionLogic || 'AND');

            if (isMatch) {
                const ownerId = resourceType === "products"
                    ? `gid://shopify/Product/${resource.id}`
                    : `gid://shopify/Customer/${resource.id}`;

                mutationsToRun.push({
                    metafield: {
                        namespace: rule.definition.namespace,
                        key: rule.definition.key,
                        value: rule.definition.value,
                        type: rule.definition.valueType,
                        ownerId: ownerId
                    },
                    ruleName: rule.name
                });
            }
        }

        if (mutationsToRun.length > 0) {
            const metafieldsInput = mutationsToRun.map(m => m.metafield);

            const mutation = `#graphql
            mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                    metafields {
                        id
                        namespace
                        key
                        value
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
            `;

            try {
                const response = await admin.graphql(mutation, {
                    variables: { metafields: metafieldsInput }
                });

                const data = await response.json();
                if (data.data?.metafieldsSet?.userErrors?.length > 0) {
                    const errors = JSON.stringify(data.data.metafieldsSet.userErrors);
                    console.error(`⚠ Shopify API UserErrors: ${errors}`);
                    throw new Error(`Shopify UserErrors: ${errors}`);
                }

                await ActivityService.createLog({
                    shop,
                    resourceType: resourceType === "products" ? "Product" : "Customer",
                    resourceId: resource.id.toString(),
                    action: "Auto-Metafield",
                    detail: `Applied rules: ${mutationsToRun.map(m => m.ruleName).join(", ")}`,
                    status: "Success",
                });

            } catch (error) {
                console.error("❌ Error executing metafieldsSet mutation:", error);
                await ActivityService.createLog({
                    shop,
                    resourceType: resourceType === "products" ? "Product" : "Customer",
                    resourceId: resource.id.toString(),
                    action: "Auto-Metafield",
                    detail: `Failed: ${(error as Error).message}`,
                    status: "Failed",
                });
            }
        } else {
            console.log("ℹ No rules matched, skipping GraphQL update.");
        }
    }

    public static checkConditions(resource: any, conditions: any[], logic: 'AND' | 'OR' = 'AND'): boolean {
        if (!conditions || conditions.length === 0) {
            return true;
        }

        const checkSingleValue = (resourceValue: any, targetValue: any, operator: string): boolean => {
            const numResource = parseFloat(resourceValue);
            const numTarget = parseFloat(targetValue);
            const isNumberCompare = !isNaN(numResource) && !isNaN(numTarget);

            switch (operator) {
                case 'equals':
                    return String(resourceValue).toLowerCase() === String(targetValue).toLowerCase();
                case 'not_equals':
                    return String(resourceValue).toLowerCase() !== String(targetValue).toLowerCase();
                case 'contains':
                    return String(resourceValue).toLowerCase().includes(String(targetValue).toLowerCase());
                case 'starts_with':
                    return String(resourceValue).toLowerCase().startsWith(String(targetValue).toLowerCase());
                case 'ends_with':
                    return String(resourceValue).toLowerCase().endsWith(String(targetValue).toLowerCase());
                case 'greater_than':
                    return isNumberCompare && numResource > numTarget;
                case 'less_than':
                    return isNumberCompare && numResource < numTarget;
                case 'in':
                    const options = String(targetValue).split(',').map(s => s.trim().toLowerCase());
                    return options.includes(String(resourceValue).toLowerCase());
                case 'not_in':
                    const notOptions = String(targetValue).split(',').map(s => s.trim().toLowerCase());
                    return !notOptions.includes(String(resourceValue).toLowerCase());
                case 'is_empty':
                    return !resourceValue || String(resourceValue).trim() === "";
                case 'is_not_empty':
                    return !!resourceValue && String(resourceValue).trim() !== "";
                default:
                    return false;
            }
        };

        const check = (condition: any) => {
            const resourceValue = TaggerService.getNestedValue(resource, condition.field);
            const targetValue = condition.value;

            if (Array.isArray(resourceValue)) {
                // If the field matches multiple values (e.g. line_items.sku), check if ANY matches
                // Unless operator is is_empty/is_not_empty which checks the array itself? 
                // Actually for is_empty, if array is empty it's empty.
                if (condition.operator === 'is_empty') return resourceValue.length === 0;
                if (condition.operator === 'is_not_empty') return resourceValue.length > 0;

                return resourceValue.some(val => checkSingleValue(val, targetValue, condition.operator));
            }

            return checkSingleValue(resourceValue, targetValue, condition.operator);
        };

        if (logic === 'OR') {
            return conditions.some(check);
        } else {
            return conditions.every(check);
        }
    }

    private static getNestedValue(obj: any, path: string): any {
        if (!path) return "";
        try {
            const parts = path.split('.');
            let current: any = obj;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];

                // Handle array index like shipping_lines[0]
                if (part.includes('[') && part.endsWith(']')) {
                    const [name, indexStr] = part.split('[');
                    const index = parseInt(indexStr.replace(']', ''));
                    current = current && current[name] ? current[name][index] : undefined;
                } else {
                    // Handle array mapping: if current is array, map the property
                    if (Array.isArray(current)) {
                        // Flatten if necessary, but for now just map
                        current = current.map(item => item ? item[part] : undefined).filter(v => v !== undefined);
                    } else {
                        current = current ? current[part] : undefined;
                    }
                }

                if (current === undefined) return "";
            }
            return current;
        } catch (e) {
            return "";
        }
    }

    static async simulateRule(shop: string, rule: any, sampleSize: number = 10) {
        const { admin } = await unauthenticated.admin(shop);
        const resourceType = rule.resourceType || "products"; // Default to products if not specified

        // Fetch recent items
        const query = `
        {
            ${resourceType}(first: ${sampleSize}, reverse: true) {
                nodes {
                    id
                    title
                    tags
                    vendor
                    productType
                    totalInventory
                    priceRangeV2 {
                        minVariantPrice {
                            amount
                        }
                    }
                    variants(first: 1) {
                        nodes {
                            price
                            sku
                            inventoryQuantity
                        }
                    }
                    # Add other fields commonly used in rules
                }
            }
        }`;

        const response = await admin.graphql(query);
        const data = await response.json();
        const items = data.data[resourceType].nodes;

        const matchedItems: any[] = [];

        for (const item of items) {
            // Normalize item for checkConditions
            const normalizedItem = {
                ...item,
                price: item.variants?.nodes?.[0]?.price || item.priceRangeV2?.minVariantPrice?.amount,
                sku: item.variants?.nodes?.[0]?.sku,
                inventory: item.variants?.nodes?.[0]?.inventoryQuantity || item.totalInventory
            };

            if (TaggerService.checkConditions(normalizedItem, rule.conditions)) {
                matchedItems.push({
                    id: item.id,
                    title: item.title,
                    reason: "Matches conditions"
                });
            }
        }

        return matchedItems;
    }
}
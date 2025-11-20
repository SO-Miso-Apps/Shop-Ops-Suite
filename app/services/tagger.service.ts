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
        return await TaggingRule.find({ shop });
    }

    static async saveRule(shop: string, ruleId: string, isEnabled: boolean, params: any) {
        return await TaggingRule.findOneAndUpdate(
            { shop, ruleId },
            { isEnabled, params, updatedAt: new Date() },
            { upsert: true, new: true }
        );
    }

    static async processWebhookJob(job: any) {
        const { shop, topic, payload } = job.data;
        console.log(`Processing webhook ${topic} for ${shop}`);

        try {
            const { admin } = await unauthenticated.admin(shop);
            if (!admin) {
                throw new Error(`Could not get admin client for ${shop}`);
            }

            // 1. Xử lý Tagging Rules (Smart Tagger - Logic cũ vẫn giữ nguyên)
            const taggingRules = await TaggingRule.find({ shop, isEnabled: true });
            if (taggingRules.length > 0) {
                if (topic === "ORDERS_CREATE" || topic === "ORDERS_UPDATED") {
                    await TaggerService.evaluateOrderRules(admin, shop, payload, taggingRules);
                } else if (topic === "CUSTOMERS_UPDATE") {
                    await TaggerService.evaluateCustomerRules(admin, shop, payload, taggingRules);
                }
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

    private static async evaluateOrderRules(admin: any, shop: string, order: any, rules: any[]) {
        const tagsToAdd: string[] = [];
        const logs: any[] = [];

        for (const rule of rules) {
            let match = false;
            let reason = "";

            switch (rule.ruleId) {
                case "whale_order":
                    const amount = parseFloat(rule.params.amount || "0");
                    if (parseFloat(order.total_price) > amount) {
                        match = true;
                        reason = `Order value ${order.total_price} > ${amount}`;
                    }
                    break;

                case "international_order":
                    const shopQuery = `#graphql
              query {
                shop {
                  billingAddress {
                    countryCode
                  }
                }
              }
            `;
                    const shopRes = await admin.graphql(shopQuery);
                    const shopData = await shopRes.json();
                    const shopCountry = shopData.data.shop.billingAddress.countryCode;

                    if (order.shipping_address && order.shipping_address.country_code !== shopCountry) {
                        match = true;
                        reason = `Shipping country ${order.shipping_address.country_code} != Shop country ${shopCountry}`;
                    }
                    break;

                case "returning_customer":
                    if (order.customer && order.customer.orders_count > 1) {
                        match = true;
                        reason = `Customer order count ${order.customer.orders_count} > 1`;
                    }
                    break;

                case "specific_product":
                    if (rule.params.collectionId) {
                        // Placeholder for collection check
                    }
                    break;
            }

            if (match) {
                tagsToAdd.push(rule.ruleId === "whale_order" ? "Whale" :
                    rule.ruleId === "international_order" ? "International" :
                        rule.ruleId === "returning_customer" ? "Returning" : "Tagged");

                logs.push({
                    shop,
                    resourceType: 'Order',
                    resourceId: order.id.toString(),
                    action: 'Add Tag',
                    detail: `Added tag for rule '${rule.ruleId}': ${reason}`,
                    status: 'Success',
                });
            }
        }

        if (tagsToAdd.length > 0) {
            const tagsAddMutation = `#graphql
          mutation tagsAdd($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              node {
                id
              }
              userErrors {
                message
              }
            }
          }
        `;

            const orderGid = `gid://shopify/Order/${order.id}`;
            await admin.graphql(tagsAddMutation, {
                variables: {
                    id: orderGid,
                    tags: tagsToAdd,
                },
            });

            for (const log of logs) {
                await ActivityService.createLog(log);
            }
        }
    }

    private static async evaluateCustomerRules(admin: any, shop: string, customer: any, rules: any[]) {
        const tagsToAdd: string[] = [];
        const logs: any[] = [];

        for (const rule of rules) {
            let match = false;
            let reason = "";

            switch (rule.ruleId) {
                case "vip_customer":
                    const amount = parseFloat(rule.params.amount || "0");
                    if (parseFloat(customer.total_spent) > amount) {
                        match = true;
                        reason = `Total spend ${customer.total_spent} > ${amount}`;
                    }
                    break;
            }

            if (match) {
                tagsToAdd.push("VIP");
                logs.push({
                    shop,
                    resourceType: 'Customer',
                    resourceId: customer.id.toString(),
                    action: 'Add Tag',
                    detail: `Added tag for rule '${rule.ruleId}': ${reason}`,
                    status: 'Success',
                });
            }
        }

        if (tagsToAdd.length > 0) {
            const tagsAddMutation = `#graphql
          mutation tagsAdd($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              node {
                id
              }
              userErrors {
                message
              }
            }
          }
        `;

            const customerGid = `gid://shopify/Customer/${customer.id}`;
            await admin.graphql(tagsAddMutation, {
                variables: {
                    id: customerGid,
                    tags: tagsToAdd,
                },
            });

            for (const log of logs) {
                await ActivityService.createLog(log);
            }
        }
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
        }).sort({ priority: -1 });

        if (rules.length === 0) {
            console.log(`ℹ No active rules found for ${resourceType}`);
            return;
        }

        const mutationsToRun: any[] = [];

        for (const rule of rules) {
            const isMatch = TaggerService.checkConditions(resource, rule.conditions);

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

    public static checkConditions(resource: any, conditions: any[]): boolean {
        if (!conditions || conditions.length === 0) {
            return true;
        }

        return conditions.every(condition => {
            const resourceValue = TaggerService.getNestedValue(resource, condition.field);
            const targetValue = condition.value;

            const numResource = parseFloat(resourceValue);
            const numTarget = parseFloat(targetValue);
            const isNumberCompare = !isNaN(numResource) && !isNaN(numTarget);

            let result = false;

            switch (condition.operator) {
                case 'equals':
                    result = String(resourceValue).toLowerCase() === String(targetValue).toLowerCase();
                    break;
                case 'not_equals':
                    result = String(resourceValue).toLowerCase() !== String(targetValue).toLowerCase();
                    break;
                case 'contains':
                    result = String(resourceValue).toLowerCase().includes(String(targetValue).toLowerCase());
                    break;
                case 'starts_with':
                    result = String(resourceValue).toLowerCase().startsWith(String(targetValue).toLowerCase());
                    break;
                case 'greater_than':
                    result = isNumberCompare && numResource > numTarget;
                    break;
                case 'less_than':
                    result = isNumberCompare && numResource < numTarget;
                    break;
            }

            return result;
        });
    }

    private static getNestedValue(obj: any, path: string) {
        try {
            return path.split('.').reduce((acc, part) => acc && acc[part], obj) ?? "";
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
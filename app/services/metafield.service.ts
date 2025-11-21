import { MetafieldRule } from "../models/MetafieldRule";
import { ActivityService } from "./activity.service";

export class MetafieldService {
    static async getRules(shop: string) {
        return await MetafieldRule.find({ shop }).sort({ createdAt: -1 });
    }

    static async countRules(shop: string) {
        return await MetafieldRule.countDocuments({ shop, isEnabled: true });
    }

    static async getLibraryRules() {
        const shopAdmin = process.env.SHOP_ADMIN;
        if (!shopAdmin) return [];
        return await MetafieldRule.find({ shop: shopAdmin, isEnabled: true });
    }

    static async createRule(shop: string, data: any) {
        await MetafieldService.checkForDuplicate(shop, data);
        const rule = await MetafieldRule.create({
            shop,
            ...data
        });
        await ActivityService.createLog({
            shop,
            resourceType: "Metafield Rule",
            resourceId: rule.id,
            action: "Created Metafield Rule",
            detail: `Created rule for ${data.definition.namespace}.${data.definition.key}`,
            status: "Success"
        });
        return rule;
    }

    static async updateRule(id: string, data: any) {
        // For update, we need to check if we are changing to a duplicate key, excluding self
        const rule = await MetafieldRule.findById(id);
        if (rule) {
            await MetafieldService.checkForDuplicate(rule.shop, data, id);
            await ActivityService.createLog({
                shop: rule.shop,
                resourceType: "Metafield Rule",
                resourceId: id,
                action: "Updated Metafield Rule",
                detail: `Updated rule for ${data.definition.namespace}.${data.definition.key}`,
                status: "Success"
            });
        }
        return await MetafieldRule.findByIdAndUpdate(id, {
            ...data,
            updatedAt: new Date()
        });
    }

    static async checkForDuplicate(shop: string, data: any, excludeId?: string) {
        const { definition, resourceType } = data;
        const query: any = {
            shop,
            resourceType,
            'definition.namespace': definition.namespace,
            'definition.key': definition.key
        };

        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const existing = await MetafieldRule.findOne(query);
        if (existing) {
            throw new Error(`Duplicate Rule: A rule for ${definition.namespace}.${definition.key} already exists.`);
        }
    }

    static async deleteRule(id: string) {
        const rule = await MetafieldRule.findById(id);
        if (rule) {
            await ActivityService.createLog({
                shop: rule.shop,
                resourceType: "Metafield Rule",
                resourceId: id,
                action: "Deleted Metafield Rule",
                detail: `Deleted rule for ${rule.definition.namespace}.${rule.definition.key}`,
                status: "Success"
            });
        }
        return await MetafieldRule.findByIdAndDelete(id);
    }

    static async toggleRule(id: string, isEnabled: boolean) {
        const rule = await MetafieldRule.findById(id);
        if (rule) {
            await ActivityService.createLog({
                shop: rule.shop,
                resourceType: "Metafield Rule",
                resourceId: id,
                action: isEnabled ? "Enabled Metafield Rule" : "Disabled Metafield Rule",
                detail: `${isEnabled ? "Enabled" : "Disabled"} rule for ${rule.definition.namespace}.${rule.definition.key}`,
                status: "Success"
            });
        }
        return await MetafieldRule.findByIdAndUpdate(id, { isEnabled });
    }
}

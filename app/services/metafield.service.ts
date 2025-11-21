import { MetafieldRule } from "../models/MetafieldRule";

export class MetafieldService {
    static async getRules(shop: string) {
        return await MetafieldRule.find({ shop }).sort({ createdAt: -1 });
    }

    static async countRules(shop: string) {
        return await MetafieldRule.countDocuments({ shop });
    }

    static async getLibraryRules() {
        const shopAdmin = process.env.SHOP_ADMIN;
        if (!shopAdmin) return [];
        return await MetafieldRule.find({ shop: shopAdmin, isEnabled: true });
    }

    static async createRule(shop: string, data: any) {
        await MetafieldService.checkForDuplicate(shop, data);
        return await MetafieldRule.create({
            shop,
            ...data
        });
    }

    static async updateRule(id: string, data: any) {
        // For update, we need to check if we are changing to a duplicate key, excluding self
        const rule = await MetafieldRule.findById(id);
        if (rule) {
            await MetafieldService.checkForDuplicate(rule.shop, data, id);
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
        return await MetafieldRule.findByIdAndDelete(id);
    }

    static async toggleRule(id: string, isEnabled: boolean) {
        return await MetafieldRule.findByIdAndUpdate(id, { isEnabled });
    }
}

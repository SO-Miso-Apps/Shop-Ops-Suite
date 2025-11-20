import { MetafieldRule } from "../models/MetafieldRule";

export class MetafieldService {
    static async getRules(shop: string) {
        return await MetafieldRule.find({ shop }).sort({ createdAt: -1 });
    }

    static async createRule(shop: string, data: any) {
        return await MetafieldRule.create({
            shop,
            ...data
        });
    }

    static async updateRule(id: string, data: any) {
        return await MetafieldRule.findByIdAndUpdate(id, {
            ...data,
            updatedAt: new Date()
        });
    }

    static async deleteRule(id: string) {
        return await MetafieldRule.findByIdAndDelete(id);
    }

    static async toggleRule(id: string, isEnabled: boolean) {
        return await MetafieldRule.findByIdAndUpdate(id, { isEnabled });
    }
}

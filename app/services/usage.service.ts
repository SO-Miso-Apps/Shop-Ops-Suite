import { Usage } from "../models/Usage";
import { unauthenticated } from "../shopify.server";
import { BillingPlans } from "../enums/BillingPlans";
import { getPlan } from "~/utils/get-plan";

export class UsageService {
    /**
     * Get the current month string in YYYY-MM format
     */
    private static getCurrentMonth(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
    }

    /**
     * Detect plan type (Free or Pro) by checking active subscriptions
     */
    static async getPlanType(shop: string): Promise<BillingPlans | "Free"> {
        try {
            const { admin } = await unauthenticated.admin(shop);
            const response = await admin.graphql(`
                #graphql
                query {
                    currentAppInstallation {
                        activeSubscriptions {
                            id
                            name
                            status
                        }
                    }
                }
            `);

            const data = await response.json();
            const subscriptions = data.data?.currentAppInstallation?.activeSubscriptions || [];

            // Check if there's an active "Pro" subscription
            const hasProSubscription = subscriptions.some(
                (sub: any) => sub.name === BillingPlans.Pro && sub.status === "ACTIVE"
            );
            if (hasProSubscription) {
                return BillingPlans.Pro;
            }

            const hasProAnnualSubscription = subscriptions.some(
                (sub: any) => sub.name === BillingPlans.ProAnnual && sub.status === "ACTIVE"
            );
            if (hasProAnnualSubscription) {
                return BillingPlans.ProAnnual;
            }

            return "Free";
        } catch (error) {
            console.error("Error detecting plan type:", error);
            // Default to Free plan on error
            return "Free";
        }
    }

    /**
     * Get current month's usage statistics
     */
    static async getCurrentUsage(shop: string): Promise<{
        count: number;
        month: string;
    }> {
        const month = this.getCurrentMonth();
        const usage = await Usage.findOne({ shop, month });

        return {
            count: usage?.operationCount || 0,
            month,
        };
    }

    /**
     * Check if operation would exceed quota
     */
    static async checkQuota(
        shop: string,
        itemCount: number
    ): Promise<{
        allowed: boolean;
        current: number;
        limit: number | null;
        plan: BillingPlans | "Free";
        message?: string;
    }> {
        const plan = await this.getPlanType(shop);
        const { count: current } = await this.getCurrentUsage(shop);

        // Pro plan has no limits
        if (getPlan(plan) === "Pro") {
            return {
                allowed: true,
                current,
                limit: null,
                plan,
            };
        }

        // Free plan: 500 items/month limit
        const FREE_PLAN_LIMIT = 500;
        const wouldExceed = current + itemCount > FREE_PLAN_LIMIT;

        return {
            allowed: !wouldExceed,
            current,
            limit: FREE_PLAN_LIMIT,
            plan,
            message: wouldExceed
                ? `Quota exceeded. You have used ${current}/${FREE_PLAN_LIMIT} items this month. This operation would use ${itemCount} more items. Upgrade to Pro for unlimited operations.`
                : undefined,
        };
    }

    /**
     * Record operation usage
     */
    static async recordOperation(shop: string, itemCount: number): Promise<void> {
        const month = this.getCurrentMonth();

        await Usage.findOneAndUpdate(
            { shop, month },
            {
                $inc: { operationCount: itemCount },
                $set: { lastOperation: new Date() },
            },
            {
                upsert: true,
                new: true,
            }
        );

        console.log(`📊 Recorded ${itemCount} operations for ${shop} in ${month}`);
    }

    /**
     * Get usage history for the last N months
     */
    static async getUsageHistory(shop: string, monthsBack: number = 3): Promise<Array<{
        month: string;
        count: number;
        lastOperation: Date;
    }>> {
        const months: string[] = [];
        const now = new Date();

        for (let i = 0; i < monthsBack; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            months.push(`${year}-${month}`);
        }

        const usageRecords = await Usage.find({
            shop,
            month: { $in: months },
        }).sort({ month: -1 });

        // Fill in missing months with zero counts
        return months.map(month => {
            const record = usageRecords.find(r => r.month === month);
            return {
                month,
                count: record?.operationCount || 0,
                lastOperation: record?.lastOperation || new Date(0),
            };
        });
    }
}

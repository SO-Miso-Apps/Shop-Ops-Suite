import { TaggingRule } from "../models/TaggingRule";
import { ShopDataQuery, RecentOrdersQuery, RecentProductsQuery } from "../graphql/dashboard";
import { ActivityService } from "./activity.service";

interface DashboardStats {
    totalOrders: number;
    totalProducts: number;
    activeRules: number;
    savingsHours: number;
}

interface AISuggestion {
    id: string;
    title: string;
    content: string;
    action: string;
    type: "warning" | "info" | "success";
}

export class DashboardService {
    static async getDashboardData(admin: any, shop: string) {
        // 1. Fetch Shop Details & Basic Stats
        const shopResponse = await admin.graphql(ShopDataQuery);
        const shopData = await shopResponse.json();

        const shopCountry = shopData.data.shop.billingAddress.countryCode;
        const totalOrders = shopData.data.ordersCount.count;
        const totalProducts = shopData.data.productsCount.count;

        // 2. Fetch Active Rules from DB
        const activeRules = await TaggingRule.countDocuments({ shop, isEnabled: true });
        const rulesList = await TaggingRule.find({ shop, isEnabled: true }).select('name ruleId').lean();

        // 3. Fetch Context Data for Insights
        const ordersResponse = await admin.graphql(RecentOrdersQuery);
        const ordersData = await ordersResponse.json();
        let recentOrders = ordersData.data.orders.nodes;

        const productsResponse = await admin.graphql(RecentProductsQuery);
        const productsData = await productsResponse.json();
        let recentProducts = productsData.data.products.nodes;

        // Check Plan Limits
        const { UsageService } = await import("./usage.service");
        const plan = await UsageService.getPlanType(shop);
        if (plan === "Free") {
            recentOrders = recentOrders.slice(0, 50);
            recentProducts = recentProducts.slice(0, 50);
        }

        const suggestions: AISuggestion[] = [];

        // Rule-based insights (Heuristics)

        // Check for International Orders
        const internationalCount = recentOrders.filter(
            (o: any) => o.shippingAddress && o.shippingAddress.countryCode !== shopCountry
        ).length;

        const internationalRule = rulesList.find((r: any) =>
            r.name?.toLowerCase().includes('international') ||
            r.ruleId === 'international_order'
        );

        if (internationalCount > 2 && !internationalRule) {
            suggestions.push({
                id: "intl_orders",
                title: "International Orders Detected",
                content: `${internationalCount} of your last ${recentOrders.length} orders are international. Create a rule to auto-tag them.`,
                action: "Create Rule",
                type: "info"
            });
        }

        // Check for Products without Cost
        const productsNoCost = recentProducts.filter((p: any) => {
            const variant = p.variants?.nodes?.[0];
            return !variant?.inventoryItem?.unitCost?.amount || parseFloat(variant.inventoryItem.unitCost.amount) === 0;
        }).length;

        if (productsNoCost > 5) {
            suggestions.push({
                id: "missing_costs",
                title: "Missing Product Costs",
                content: `${productsNoCost} products don't have cost data. Add costs to track profit margins accurately.`,
                action: "Update Costs",
                type: "warning"
            });
        }

        // Check for High-Value Orders (potential VIP customers)
        const highValueOrders = recentOrders.filter((o: any) => {
            const amount = parseFloat(o.totalPriceSet?.shopMoney?.amount || 0);
            return amount > 1000; // Threshold: $1000
        }).length;

        const vipRule = rulesList.find((r: any) =>
            r.name?.toLowerCase().includes('vip') ||
            r.name?.toLowerCase().includes('high value')
        );

        if (highValueOrders > 0 && !vipRule) {
            suggestions.push({
                id: "high_value",
                title: "High-Value Customers Found",
                content: `${highValueOrders} orders over $1000. Create a VIP tagging rule to segment premium customers.`,
                action: "Create Rule",
                type: "success"
            });
        }

        // Check for Low Inventory Products
        const lowInventory = recentProducts.filter((p: any) => {
            const inventory = p.totalInventory || p.variants?.nodes?.[0]?.inventoryQuantity || 0;
            return inventory > 0 && inventory < 10;
        }).length;

        if (lowInventory > 3) {
            suggestions.push({
                id: "inventory_low",
                title: "Low Inventory Alert",
                content: `${lowInventory} products have less than 10 units in stock. Consider creating a low-stock tag rule.`,
                action: "Create Rule",
                type: "warning"
            });
        }

        // Check for messy tags (optional)
        const allTags = new Set<string>();
        recentProducts.forEach((p: any) => {
            (p.tags || []).forEach((tag: string) => allTags.add(tag));
        });

        if (allTags.size > 50) {
            suggestions.push({
                id: "tag_cleanup",
                title: "Too Many Tags",
                content: `Your store has ${allTags.size} different tags. Clean up unused tags for better organization.`,
                action: "Clean Tags",
                type: "info"
            });
        }

        // Limit to top 3 suggestions
        const topSuggestions = suggestions.slice(0, 3);

        // 4. Calculate Savings (Mock logic for MVP)
        const savingsHours = Math.round((activeRules * totalOrders * 0.1) / 60);

        // 5. Fetch Activity Data for Charts
        const categoryStats = await ActivityService.getCategoryStats(shop);

        // Get last 7 days of activity for trend chart
        const activityTrend = await this.getActivityTrend(shop, 7);

        // 6. Fetch Recent Activity Logs
        const recentActivityData = await ActivityService.getLogs(shop, 5);

        return {
            stats: {
                totalOrders,
                totalProducts,
                activeRules,
                savingsHours: savingsHours || 0,
            },
            suggestions: topSuggestions,
            recentActivities: recentActivityData.logs,
            charts: {
                categoryBreakdown: categoryStats.map((stat: any) => ({
                    name: stat._id || 'Unknown',
                    value: stat.count,
                })),
                activityTrend,
            },
        };
    }

    static async getSetupProgress(shop: string) {
        const { TaggingRule } = await import("../models/TaggingRule");
        const { ActivityLog } = await import("../models/ActivityLog");
        const { Settings } = await import("../models/Settings");

        // 1. Check if Smart Tag Rule exists
        const hasTaggingRule = await TaggingRule.exists({ shop });

        // 2. Check if Bulk Operation has been run
        const hasBulkOperation = await ActivityLog.exists({
            shop,
            action: { $regex: /bulk/i }
        });

        // 3. Check if COGS has been updated
        const hasCogsUpdate = await ActivityLog.exists({
            shop,
            action: { $regex: /cost|cogs/i }
        });

        // 4. Check if Metafield Definition exists
        const hasMetafieldDefinition = await ActivityLog.exists({
            shop,
            action: { $regex: /metafield/i }
        });

        const settings = await Settings.findOne({ shop });

        return {
            dismissed: settings?.setupGuideDismissed || false,
            steps: [
                {
                    id: "create_rule",
                    title: "Create your first Smart Tag Rule",
                    description: "Automatically tag products based on conditions.",
                    action: "Create Rule",
                    url: "/app/tagger",
                    completed: !!hasTaggingRule
                },
                {
                    id: "update_cogs",
                    title: "Add Product Costs",
                    description: "Track your profit margins by adding COGS.",
                    action: "Update Costs",
                    url: "/app/cogs",
                    completed: !!hasCogsUpdate
                },
                {
                    id: "run_bulk",
                    title: "Run a Bulk Operation",
                    description: "Edit products in bulk to save time.",
                    action: "Bulk Edit",
                    url: "/app/bulk",
                    completed: !!hasBulkOperation
                },
                {
                    id: "metafield_def",
                    title: "Manage Metafields",
                    description: "Create custom fields for your products.",
                    action: "Manage Metafields",
                    url: "/app/metafields",
                    completed: !!hasMetafieldDefinition
                }
            ]
        };
    }

    private static async getActivityTrend(shop: string, days: number) {
        const { ActivityLog } = await import("../models/ActivityLog");
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const dailyActivity = await ActivityLog.aggregate([
            {
                $match: {
                    shop,
                    timestamp: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Fill in missing days with 0
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const found = dailyActivity.find((d: any) => d._id === dateStr);
            result.push({
                date: dateStr,
                count: found ? found.count : 0,
            });
        }

        return result;
    }
}

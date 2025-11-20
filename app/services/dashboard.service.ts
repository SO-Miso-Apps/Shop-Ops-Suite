import { TaggingRule } from "../models/TaggingRule";
import { ShopDataQuery, RecentOrdersQuery, RecentProductsQuery } from "../graphql/dashboard";

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

        // 3. AI Logic (Heuristics)
        const suggestions: AISuggestion[] = [];

        // Check for International Orders
        const ordersResponse = await admin.graphql(RecentOrdersQuery);
        const ordersData = await ordersResponse.json();
        const recentOrders = ordersData.data.orders.nodes;

        const internationalCount = recentOrders.filter(
            (o: any) => o.shippingAddress && o.shippingAddress.countryCode !== shopCountry
        ).length;

        // Rule: If > 20% of recent orders are international AND International Rule is OFF
        const internationalRule = await TaggingRule.findOne({ shop, ruleId: 'international_order', isEnabled: true });

        if (internationalCount > 2 && !internationalRule) {
            suggestions.push({
                id: "intl_orders",
                title: "Detected International Traffic",
                content: `We found that ${internationalCount} of your last 20 orders are international. You should enable the 'International Order' tagger to better segment these customers.`,
                action: "Enable Rule",
                type: "info",
            });
        }

        // Check for Products without Cost
        const productsResponse = await admin.graphql(RecentProductsQuery);
        const productsData = await productsResponse.json();
        const recentProducts = productsData.data.products.nodes;

        const productsNoCost = recentProducts.filter((p: any) => {
            const variant = p.variants.nodes[0];
            return !variant?.inventoryItem?.unitCost?.amount || parseFloat(variant.inventoryItem.unitCost.amount) === 0;
        }).length;

        if (productsNoCost > 5) {
            suggestions.push({
                id: "missing_cogs",
                title: "Missing Cost Data",
                content: `We detected ${productsNoCost} recent products without a Cost per Item. Add this data to unlock profit tracking.`,
                action: "Update COGS",
                type: "warning",
            });
        }

        // 4. Calculate Savings (Mock logic for MVP)
        const savingsHours = Math.round((activeRules * totalOrders * 0.1) / 60); // Mock calculation

        return {
            stats: {
                totalOrders,
                totalProducts,
                activeRules,
                savingsHours: savingsHours || 0,
            },
            suggestions,
        };
    }
}

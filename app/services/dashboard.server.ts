import { TaggingRule } from "../db.server";

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

export async function getDashboardData(admin: any, shop: string) {
    // 1. Fetch Shop Details & Basic Stats
    const shopQuery = `#graphql
    query ShopData {
      shop {
        name
        currencyCode
        billingAddress {
          countryCode
        }
      }
      ordersCount {
        count
      }
      productsCount {
        count
      }
    }
  `;

    const shopResponse = await admin.graphql(shopQuery);
    const shopData = await shopResponse.json();

    const shopCountry = shopData.data.shop.billingAddress.countryCode;
    const totalOrders = shopData.data.ordersCount.count;
    const totalProducts = shopData.data.productsCount.count;

    // 2. Fetch Active Rules from DB
    const activeRules = await TaggingRule.countDocuments({ shop, isEnabled: true });

    // 3. AI Logic (Heuristics)
    const suggestions: AISuggestion[] = [];

    // Check for International Orders (Heuristic: Check last 20 orders)
    // We can't easily count *all* international orders efficiently without a complex query or bulk op,
    // so we sample the recent ones for the "Advisor".
    const ordersQuery = `#graphql
    query RecentOrders {
      orders(first: 20, sortKey: CREATED_AT, reverse: true) {
        nodes {
          shippingAddress {
            countryCode
          }
        }
      }
    }
  `;
    const ordersResponse = await admin.graphql(ordersQuery);
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

    // Check for Products without Cost (Heuristic: Check last 20 products)
    // To get cost, we need to look at variants -> inventoryItem -> unitCost
    const productsQuery = `#graphql
    query RecentProducts {
      products(first: 20, sortKey: CREATED_AT, reverse: true) {
        nodes {
          variants(first: 1) {
            nodes {
              inventoryItem {
                unitCost {
                  amount
                }
              }
            }
          }
        }
      }
    }
  `;
    const productsResponse = await admin.graphql(productsQuery);
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
    // Assuming each active rule saves ~1 minute per order processed (this is a simplified metric)
    // In a real app, we would count actual "ActivityLog" entries * 1 min.
    // Let's fetch total logs count for this shop.
    // const totalActions = await ActivityLog.countDocuments({ shop, status: 'Success' });
    // For now, let's mock it based on active rules to show something on the chart.
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

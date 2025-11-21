import { TaggingRule } from "../models/TaggingRule";
import { MetafieldRule } from "../models/MetafieldRule";
import { ActivityService } from "../services/activity.service";

// --- TAGGING RULES (SMART TAGS) ---

const TAGGER_RULES = [
  // --- SIMPLE (15) ---
  {
    name: "High Value Order",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [{ field: "total_price", operator: "gt", value: "100" }],
    tags: ["high-value"],
    priority: 1
  },
  {
    name: "International Order",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [{ field: "shipping_address.country_code", operator: "ne", value: "US" }],
    tags: ["international"],
    priority: 1
  },
  {
    name: "Repeat Customer",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [{ field: "orders_count", operator: "gt", value: "1" }],
    tags: ["repeat-customer"],
    priority: 1
  },
  {
    name: "VIP Customer",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [{ field: "total_spent", operator: "gt", value: "500" }],
    tags: ["vip"],
    priority: 1
  },
  {
    name: "Risk: High",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [{ field: "risk_level", operator: "equals", value: "high" }],
    tags: ["risk-high"],
    priority: 2
  },
  {
    name: "Heavy Item",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [{ field: "total_weight", operator: "gt", value: "5000" }], // grams
    tags: ["heavy-shipping"],
    priority: 1
  },
  {
    name: "Email Subscriber",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [{ field: "accepts_marketing", operator: "equals", value: "true" }],
    tags: ["subscriber"],
    priority: 1
  },
  {
    name: "No Account",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [{ field: "state", operator: "equals", value: "disabled" }],
    tags: ["guest-checkout"],
    priority: 1
  },
  {
    name: "Specific Vendor",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [{ field: "line_items.vendor", operator: "contains", value: "Nike" }],
    tags: ["vendor-nike"],
    priority: 1
  },
  {
    name: "Discount Used",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [{ field: "discount_codes.length", operator: "gt", value: "0" }],
    tags: ["discounted"],
    priority: 1
  },
  {
    name: "Unfulfilled",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [{ field: "fulfillment_status", operator: "equals", value: "null" }],
    tags: ["pending-fulfillment"],
    priority: 1
  },
  {
    name: "Refunded",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [{ field: "financial_status", operator: "equals", value: "refunded" }],
    tags: ["refunded"],
    priority: 1
  },
  {
    name: "Local Delivery",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [{ field: "shipping_lines.title", operator: "contains", value: "Local Delivery" }],
    tags: ["local-delivery"],
    priority: 1
  },
  {
    name: "Gift Card Order",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [{ field: "line_items.gift_card", operator: "equals", value: "true" }],
    tags: ["gift-card"],
    priority: 1
  },
  {
    name: "First Order",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [{ field: "orders_count", operator: "equals", value: "1" }],
    tags: ["new-customer"],
    priority: 1
  },

  // --- MEDIUM (10) ---
  {
    name: "High Value & International",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [
      { field: "total_price", operator: "gt", value: "200" },
      { field: "shipping_address.country_code", operator: "ne", value: "US" }
    ],
    tags: ["high-value-intl", "priority-shipping"],
    priority: 3
  },
  {
    name: "Loyal Subscriber",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [
      { field: "orders_count", operator: "gt", value: "5" },
      { field: "accepts_marketing", operator: "equals", value: "true" }
    ],
    tags: ["loyal-subscriber"],
    priority: 2
  },
  {
    name: "Wholesale Candidate",
    resourceType: "orders",
    conditionLogic: "OR",
    conditions: [
      { field: "total_price", operator: "gt", value: "1000" },
      { field: "line_items.quantity", operator: "gt", value: "20" }
    ],
    tags: ["potential-wholesale"],
    priority: 3
  },
  {
    name: "Churn Risk",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [
      { field: "last_order_date", operator: "lt", value: "90_days_ago" }, // Hypothetical relative date
      { field: "orders_count", operator: "gt", value: "1" }
    ],
    tags: ["churn-risk"],
    priority: 2
  },
  {
    name: "Big Spender (No Discount)",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [
      { field: "total_price", operator: "gt", value: "300" },
      { field: "discount_codes.length", operator: "equals", value: "0" }
    ],
    tags: ["full-price-shopper"],
    priority: 2
  },
  {
    name: "Specific Product & Location",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [
      { field: "line_items.title", operator: "contains", value: "Winter Jacket" },
      { field: "shipping_address.province_code", operator: "equals", value: "NY" }
    ],
    tags: ["ny-winter-promo"],
    priority: 2
  },
  {
    name: "Returning Refunded",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [
      { field: "orders_count", operator: "gt", value: "1" },
      { field: "total_spent", operator: "lt", value: "0" } // Net negative?
    ],
    tags: ["serial-returner"],
    priority: 2
  },
  {
    name: "Heavy & Free Shipping",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [
      { field: "total_weight", operator: "gt", value: "10000" },
      { field: "shipping_lines.price", operator: "equals", value: "0.00" }
    ],
    tags: ["loss-leader-shipping"],
    priority: 3
  },
  {
    name: "Mobile App User",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [
      { field: "source_name", operator: "equals", value: "iphone" },
      { field: "tags", operator: "not_contains", value: "app-user" }
    ],
    tags: ["app-user"],
    priority: 2
  },
  {
    name: "Expedited Shipping",
    resourceType: "orders",
    conditionLogic: "OR",
    conditions: [
      { field: "shipping_lines.title", operator: "contains", value: "Express" },
      { field: "shipping_lines.title", operator: "contains", value: "Next Day" }
    ],
    tags: ["urgent"],
    priority: 2
  },

  // --- ADVANCED (5) ---
  {
    name: "Complex VIP Criteria",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [
      { field: "total_spent", operator: "gt", value: "1000" },
      { field: "orders_count", operator: "gt", value: "10" },
      { field: "accepts_marketing", operator: "equals", value: "true" },
      { field: "currency", operator: "equals", value: "USD" }
    ],
    tags: ["super-vip", "gold-tier"],
    priority: 5
  },
  {
    name: "Fraud Watchlist",
    resourceType: "orders",
    conditionLogic: "OR",
    conditions: [
      { field: "risk_level", operator: "equals", value: "high" },
      { field: "billing_address.country_code", operator: "ne", value: "shipping_address.country_code" },
      { field: "email", operator: "contains", value: "tempmail" }
    ],
    tags: ["manual-review", "fraud-check"],
    priority: 5
  },
  {
    name: "Regional Marketing - West Coast",
    resourceType: "customers",
    conditionLogic: "OR",
    conditions: [
      { field: "default_address.province_code", operator: "equals", value: "CA" },
      { field: "default_address.province_code", operator: "equals", value: "OR" },
      { field: "default_address.province_code", operator: "equals", value: "WA" }
    ],
    tags: ["west-coast", "pacific-time"],
    priority: 4
  },
  {
    name: "High Maintenance Customer",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [
      { field: "orders_count", operator: "gt", value: "5" },
      { field: "average_order_value", operator: "lt", value: "20" }, // Hypothetical field
      { field: "tags", operator: "contains", value: "contacted-support" }
    ],
    tags: ["needs-attention"],
    priority: 4
  },
  {
    name: "Holiday Rush Target",
    resourceType: "orders",
    conditionLogic: "AND",
    conditions: [
      { field: "created_at", operator: "gt", value: "2023-11-01" }, // Example date
      { field: "created_at", operator: "lt", value: "2023-12-25" },
      { field: "total_price", operator: "gt", value: "50" }
    ],
    tags: ["holiday-shopper"],
    priority: 3
  }
];

// --- METAFIELD RULES ---

const METAFIELD_RULES = [
  // --- SIMPLE (15) ---
  {
    name: "Set Vendor Metafield",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "vendor", operator: "equals", value: "Nike" }],
    definition: { namespace: "custom", key: "brand_tier", valueType: "single_line_text_field", value: "Premium" }
  },
  {
    name: "Set Material Cotton",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "tags", operator: "contains", value: "Cotton" }],
    definition: { namespace: "specs", key: "material", valueType: "single_line_text_field", value: "100% Cotton" }
  },
  {
    name: "Set Gender Men",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "title", operator: "contains", value: "Men's" }],
    definition: { namespace: "filter", key: "gender", valueType: "single_line_text_field", value: "Men" }
  },
  {
    name: "Set Gender Women",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "title", operator: "contains", value: "Women's" }],
    definition: { namespace: "filter", key: "gender", valueType: "single_line_text_field", value: "Women" }
  },
  {
    name: "Mark as New Arrival",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "created_at", operator: "gt", value: "30_days_ago" }],
    definition: { namespace: "badges", key: "new_arrival", valueType: "boolean", value: "true" }
  },
  {
    name: "Low Stock Alert",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "total_inventory", operator: "lt", value: "10" }],
    definition: { namespace: "inventory", key: "status", valueType: "single_line_text_field", value: "Low Stock" }
  },
  {
    name: "Heavy Item Shipping",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "variants.weight", operator: "gt", value: "5000" }],
    definition: { namespace: "shipping", key: "class", valueType: "single_line_text_field", value: "Heavy" }
  },
  {
    name: "Fragile Item",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "tags", operator: "contains", value: "Glass" }],
    definition: { namespace: "shipping", key: "handling", valueType: "single_line_text_field", value: "Fragile" }
  },
  {
    name: "Customer Tier Bronze",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [{ field: "total_spent", operator: "lt", value: "100" }],
    definition: { namespace: "loyalty", key: "tier", valueType: "single_line_text_field", value: "Bronze" }
  },
  {
    name: "Customer Tier Silver",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [{ field: "total_spent", operator: "gt", value: "100" }],
    definition: { namespace: "loyalty", key: "tier", valueType: "single_line_text_field", value: "Silver" }
  },
  {
    name: "Customer Tier Gold",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [{ field: "total_spent", operator: "gt", value: "500" }],
    definition: { namespace: "loyalty", key: "tier", valueType: "single_line_text_field", value: "Gold" }
  },
  {
    name: "Wholesale Customer",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [{ field: "tags", operator: "contains", value: "wholesale" }],
    definition: { namespace: "b2b", key: "enabled", valueType: "boolean", value: "true" }
  },
  {
    name: "Summer Collection",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "tags", operator: "contains", value: "Summer" }],
    definition: { namespace: "collection", key: "season", valueType: "single_line_text_field", value: "Summer" }
  },
  {
    name: "Winter Collection",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "tags", operator: "contains", value: "Winter" }],
    definition: { namespace: "collection", key: "season", valueType: "single_line_text_field", value: "Winter" }
  },
  {
    name: "On Sale Badge",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [{ field: "variants.compare_at_price", operator: "gt", value: "variants.price" }],
    definition: { namespace: "badges", key: "on_sale", valueType: "boolean", value: "true" }
  },

  // --- MEDIUM (10) ---
  {
    name: "Wash Care - Silk",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [
      { field: "tags", operator: "contains", value: "Silk" },
      { field: "product_type", operator: "equals", value: "Apparel" }
    ],
    definition: { namespace: "care", key: "instructions", valueType: "multi_line_text_field", value: "Dry clean only. Do not bleach." }
  },
  {
    name: "Estimated Delivery - Preorder",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [
      { field: "tags", operator: "contains", value: "Preorder" },
      { field: "status", operator: "equals", value: "active" }
    ],
    definition: { namespace: "shipping", key: "delivery_estimate", valueType: "single_line_text_field", value: "Ships in 2-3 weeks" }
  },
  {
    name: "Size Chart - Tops",
    resourceType: "products",
    conditionLogic: "OR",
    conditions: [
      { field: "product_type", operator: "equals", value: "T-Shirt" },
      { field: "product_type", operator: "equals", value: "Hoodie" }
    ],
    definition: { namespace: "size_chart", key: "id", valueType: "single_line_text_field", value: "chart_tops_v1" }
  },
  {
    name: "Size Chart - Bottoms",
    resourceType: "products",
    conditionLogic: "OR",
    conditions: [
      { field: "product_type", operator: "equals", value: "Jeans" },
      { field: "product_type", operator: "equals", value: "Shorts" }
    ],
    definition: { namespace: "size_chart", key: "id", valueType: "single_line_text_field", value: "chart_bottoms_v1" }
  },
  {
    name: "Warranty - Electronics",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [
      { field: "product_type", operator: "equals", value: "Electronics" },
      { field: "price", operator: "gt", value: "50" }
    ],
    definition: { namespace: "warranty", key: "duration", valueType: "single_line_text_field", value: "2 Years" }
  },
  {
    name: "VIP Access Level",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [
      { field: "total_spent", operator: "gt", value: "1000" },
      { field: "accepts_marketing", operator: "equals", value: "true" }
    ],
    definition: { namespace: "access", key: "level", valueType: "number_integer", value: "5" }
  },
  {
    name: "Birthday Month Promo",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [
      { field: "note", operator: "contains", value: "Birthday: June" } // Hypothetical
    ],
    definition: { namespace: "promo", key: "birthday_month", valueType: "single_line_text_field", value: "June" }
  },
  {
    name: "Bulk Discount Eligible",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [
      { field: "total_inventory", operator: "gt", value: "100" },
      { field: "price", operator: "lt", value: "20" }
    ],
    definition: { namespace: "pricing", key: "bulk_discount", valueType: "boolean", value: "true" }
  },
  {
    name: "Final Sale",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [
      { field: "tags", operator: "contains", value: "Clearance" },
      { field: "price", operator: "lt", value: "10" }
    ],
    definition: { namespace: "policies", key: "returnable", valueType: "boolean", value: "false" }
  },
  {
    name: "Sustainability Score",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [
      { field: "tags", operator: "contains", value: "Eco-Friendly" },
      { field: "vendor", operator: "equals", value: "GreenEarth" }
    ],
    definition: { namespace: "eco", key: "score", valueType: "number_integer", value: "95" }
  },

  // --- ADVANCED (5) ---
  {
    name: "Complex Product Specs",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [
      { field: "product_type", operator: "equals", value: "Laptop" },
      { field: "tags", operator: "contains", value: "Pro" },
      { field: "variants.price", operator: "gt", value: "1500" }
    ],
    definition: { namespace: "specs", key: "tech_level", valueType: "json", value: "{\"cpu\": \"high\", \"ram\": \"32gb\"}" }
  },
  {
    name: "Dynamic Shipping Rate ID",
    resourceType: "products",
    conditionLogic: "OR",
    conditions: [
      { field: "weight", operator: "gt", value: "20000" },
      { field: "tags", operator: "contains", value: "Oversized" },
      { field: "vendor", operator: "equals", value: "FurnitureCo" }
    ],
    definition: { namespace: "shipping", key: "rate_id", valueType: "single_line_text_field", value: "freight_v2" }
  },
  {
    name: "Customer Lifetime Value Segment",
    resourceType: "customers",
    conditionLogic: "AND",
    conditions: [
      { field: "total_spent", operator: "gt", value: "5000" },
      { field: "orders_count", operator: "gt", value: "20" },
      { field: "currency", operator: "equals", value: "USD" }
    ],
    definition: { namespace: "analytics", key: "clv_segment", valueType: "single_line_text_field", value: "Diamond" }
  },
  {
    name: "Cross-Sell Recommendation",
    resourceType: "products",
    conditionLogic: "AND",
    conditions: [
      { field: "product_type", operator: "equals", value: "Camera" },
      { field: "vendor", operator: "equals", value: "Canon" },
      { field: "price", operator: "gt", value: "500" }
    ],
    definition: { namespace: "recommendation", key: "product_handle", valueType: "single_line_text_field", value: "canon-lens-kit" }
  },
  {
    name: "Restricted Shipping Zones",
    resourceType: "products",
    conditionLogic: "OR",
    conditions: [
      { field: "tags", operator: "contains", value: "Hazardous" },
      { field: "tags", operator: "contains", value: "Liquid" }
    ],
    definition: { namespace: "shipping", key: "restricted_zones", valueType: "list.single_line_text_field", value: "[\"AK\", \"HI\", \"PR\"]" }
  }
];

export async function seedLibrary(shop: string) {
  console.log(`Starting seeding for shop: ${shop}`);
  let createdTaggers = 0;
  let createdMetafields = 0;

  // Seed Taggers
  for (const rule of TAGGER_RULES) {
    const exists = await TaggingRule.findOne({ shop, name: rule.name });
    if (!exists) {
      await TaggingRule.create({ ...rule, shop, isEnabled: true }); // Default to disabled
      createdTaggers++;
    }
  }

  // Seed Metafields
  for (const rule of METAFIELD_RULES) {
    const exists = await MetafieldRule.findOne({ shop, name: rule.name });
    if (!exists) {
      await MetafieldRule.create({ ...rule, shop, isEnabled: true }); // Default to disabled
      createdMetafields++;
    }
  }

  if (createdTaggers > 0 || createdMetafields > 0) {
    await ActivityService.createLog({
      shop,
      resourceType: "System",
      resourceId: "seed-library",
      action: "Seeded Library",
      detail: `Seeded ${createdTaggers} Tagging Rules and ${createdMetafields} Metafield Rules.`,
      status: "Success"
    });
  }

  return { createdTaggers, createdMetafields };
}

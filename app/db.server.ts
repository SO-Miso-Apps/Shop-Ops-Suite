import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URL || "mongodb://localhost:27017/shop-ops-suite";
console.log("🚀 MONGODB_URI:", MONGODB_URI);
if (!MONGODB_URI) {
    throw new Error(
        "Please define the MONGODB_URI environment variable inside .env",
    );
}

let isConnected = false;

export const connectDB = async () => {
    if (isConnected) {
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log("🚀 Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
};

// --- Models ---

// 1. ShopConfig: Stores general settings for the shop
const shopConfigSchema = new mongoose.Schema({
    shop: { type: String, required: true, unique: true },
    accessToken: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

export const ShopConfig = mongoose.models.ShopConfig || mongoose.model("ShopConfig", shopConfigSchema);

// 2. TaggingRule: Stores configuration for Smart Tagger recipes
const taggingRuleSchema = new mongoose.Schema({
    shop: { type: String, required: true },
    ruleId: { type: String, required: true }, // e.g., 'vip_customer', 'whale_order'
    isEnabled: { type: Boolean, default: false },
    params: { type: mongoose.Schema.Types.Mixed, default: {} }, // Flexible params e.g., { amount: 1000 }
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Compound index to ensure unique rule per shop
taggingRuleSchema.index({ shop: 1, ruleId: 1 }, { unique: true });

export const TaggingRule = mongoose.models.TaggingRule || mongoose.model("TaggingRule", taggingRuleSchema);

// 3. MetafieldConfig: Stores default values for metafields
const metafieldConfigSchema = new mongoose.Schema({
    shop: { type: String, required: true },
    resourceType: { type: String, required: true }, // 'products', 'customers'
    namespace: { type: String, required: true },
    key: { type: String, required: true },
    defaultValue: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

metafieldConfigSchema.index({ shop: 1, resourceType: 1, namespace: 1, key: 1 }, { unique: true });

export const MetafieldConfig = mongoose.models.MetafieldConfig || mongoose.model("MetafieldConfig", metafieldConfigSchema);

// 4. ActivityLog: Stores logs for all actions performed by the app
const activityLogSchema = new mongoose.Schema({
    shop: { type: String, required: true },
    resourceType: { type: String, required: true }, // 'Order', 'Product', 'Customer'
    resourceId: { type: String, required: true },
    action: { type: String, required: true }, // 'Add Tag', 'Update COGS', etc.
    detail: { type: String, required: true },
    status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
    timestamp: { type: Date, default: Date.now },
});

activityLogSchema.index({ shop: 1, timestamp: -1 });

export const ActivityLog = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);

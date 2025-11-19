import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URL || "mongodb://localhost:27017/shop-ops-suite";

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
        // Không throw error để app không crash nếu DB lỗi tạm thời, nhưng cần xử lý ở logic
    }
};

// --- Models ---

// 1. ShopConfig
const shopConfigSchema = new mongoose.Schema({
    shop: { type: String, required: true, unique: true },
    accessToken: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
export const ShopConfig = mongoose.models.ShopConfig || mongoose.model("ShopConfig", shopConfigSchema);

// 2. TaggingRule (Smart Tags)
const taggingRuleSchema = new mongoose.Schema({
    shop: { type: String, required: true },
    ruleId: { type: String, required: true },
    isEnabled: { type: Boolean, default: false },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
taggingRuleSchema.index({ shop: 1, ruleId: 1 }, { unique: true });
export const TaggingRule = mongoose.models.TaggingRule || mongoose.model("TaggingRule", taggingRuleSchema);

// 3. MetafieldRule (NEW: Conditional Metafields)
// Thay thế cho MetafieldConfig đơn giản cũ
const metafieldRuleSchema = new mongoose.Schema({
    shop: { type: String, required: true },
    name: { type: String, required: true }, // Tên quy tắc gợi nhớ
    resourceType: { type: String, required: true, enum: ['products', 'customers'] },
    isEnabled: { type: Boolean, default: true },
    priority: { type: Number, default: 0 }, // Ưu tiên xử lý

    // Điều kiện để áp dụng (Logic AND)
    conditions: [{
        field: { type: String, required: true }, // e.g., 'vendor', 'tags', 'total_spent'
        operator: { type: String, required: true }, // 'equals', 'contains', 'gt', 'lt'
        value: { type: String, required: true }
    }],

    // Metafield sẽ được set
    definition: {
        namespace: { type: String, required: true },
        key: { type: String, required: true },
        valueType: { type: String, default: "single_line_text_field" },
        value: { type: String, required: true }
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
metafieldRuleSchema.index({ shop: 1, resourceType: 1 });
export const MetafieldRule = mongoose.models.MetafieldRule || mongoose.model("MetafieldRule", metafieldRuleSchema);

// 4. ActivityLog
const activityLogSchema = new mongoose.Schema({
    shop: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    action: { type: String, required: true },
    detail: { type: String, required: true },
    status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
    timestamp: { type: Date, default: Date.now },
});
activityLogSchema.index({ shop: 1, timestamp: -1 });
export const ActivityLog = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);
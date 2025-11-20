import mongoose from "mongoose";

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

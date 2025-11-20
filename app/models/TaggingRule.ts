import mongoose from "mongoose";

const taggingRuleSchema = new mongoose.Schema({
    shop: { type: String, required: true },
    name: { type: String, required: true }, // User friendly name
    resourceType: { type: String, required: true, enum: ['orders', 'customers'], default: 'orders' },
    isEnabled: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    conditionLogic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    conditions: [{
        field: { type: String, required: true },
        operator: { type: String, required: true },
        value: { type: String, required: true }
    }],
    tags: [{ type: String, required: true }], // Tags to apply
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

taggingRuleSchema.index({ shop: 1, resourceType: 1 });
export const TaggingRule = mongoose.models.TaggingRule || mongoose.model("TaggingRule", taggingRuleSchema);

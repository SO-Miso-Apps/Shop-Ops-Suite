import mongoose from "mongoose";

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

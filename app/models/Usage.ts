import mongoose, { Schema, Document } from "mongoose";

export interface IUsage extends Document {
    shop: string;
    month: string; // Format: "YYYY-MM"
    operationCount: number;
    lastOperation: Date;
}

const UsageSchema = new Schema<IUsage>({
    shop: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true },
    operationCount: { type: Number, default: 0 },
    lastOperation: { type: Date, default: Date.now },
});

// Compound index for efficient monthly lookups
UsageSchema.index({ shop: 1, month: 1 }, { unique: true });

export const Usage = mongoose.models.Usage || mongoose.model<IUsage>("Usage", UsageSchema);

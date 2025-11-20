import mongoose from "mongoose";

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

import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
    shop: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    jobId: { type: String, index: true }, // Link to BullMQ Job / Backup
    action: { type: String, required: true },
    category: {
        type: String,
        enum: ['Tags', 'Bulk Operations', 'Metafields', 'Data Cleaning', 'System'],
        default: 'System',
        index: true,
    },
    details: [{
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ['Success', 'Failed', 'Pending'], default: 'Pending' },
    timestamp: { type: Date, default: Date.now },
});

activityLogSchema.index({ shop: 1, timestamp: -1 });
activityLogSchema.index({ shop: 1, category: 1, timestamp: -1 });
activityLogSchema.index({ shop: 1, jobId: 1 });

export const ActivityLog = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);

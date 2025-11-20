import mongoose from "mongoose";

const BackupSchema = new mongoose.Schema({
    shop: { type: String, required: true, index: true },
    jobId: { type: String, required: true, index: true },
    resourceType: { type: String, required: true }, // 'products' | 'customers'
    createdAt: { type: Date, default: Date.now, expires: '30d' }, // Auto-delete after 30 days
    items: [{
        resourceId: { type: String, required: true },
        originalTags: { type: [String], default: [] },
        // We can add originalMetafields later if needed
    }]
});

export const Backup = mongoose.models.Backup || mongoose.model("Backup", BackupSchema);

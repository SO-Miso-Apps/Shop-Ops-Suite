import { ActivityLog } from "../models/ActivityLog";

// Action to category mapping
const ACTION_TO_CATEGORY: Record<string, string> = {
    "Smart Tag Applied": "Tags",
    "Tag Cleanup": "Data Cleaning",
    "Bulk Tag Update": "Tags",
    "Auto-Tag": "Tags",
    "Bulk Operation": "Bulk Operations",
    "Bulk Update": "Bulk Operations",
    "Metafield Updated": "Metafields",
    "Metafield Created": "Metafields",
    "COGS Updated": "Metafields",
    "Data Cleanup": "Data Cleaning",
    "Webhook Received": "System",
    "Job Queued": "System",
    "Job Completed": "System",
};

export class ActivityService {
    /**
     * Get category from action name
     */
    static getCategoryFromAction(action: string): string {
        // Check exact match first
        if (ACTION_TO_CATEGORY[action]) {
            return ACTION_TO_CATEGORY[action];
        }

        // Check partial match
        for (const [key, category] of Object.entries(ACTION_TO_CATEGORY)) {
            if (action.includes(key)) {
                return category;
            }
        }

        return "System"; // Default category
    }

    /**
     * Get logs with optional filtering by category, status, and search
     */
    static async getLogs(
        shop: string,
        limit: number = 50,
        filters?: {
            category?: string;
            status?: string[];
            search?: string;
        }
    ) {
        const query: any = { shop };

        // Category filter
        if (filters?.category && filters.category !== "All") {
            query.category = filters.category;
        }

        // Status filter
        if (filters?.status && filters.status.length > 0) {
            query.status = { $in: filters.status };
        }

        // Search filter (action or detail)
        if (filters?.search) {
            query.$or = [
                { action: { $regex: filters.search, $options: 'i' } },
                { detail: { $regex: filters.search, $options: 'i' } },
            ];
        }

        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .limit(limit);

        return logs.map((log: any) => ({
            id: log._id.toString(),
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            action: log.action,
            category: log.category || this.getCategoryFromAction(log.action),
            detail: log.detail,
            status: log.status,
            timestamp: log.timestamp,
            jobId: log.jobId,
        }));
    }

    /**
     * Create activity log with automatic category detection
     */
    static async createLog(data: {
        shop: string;
        resourceType: string;
        resourceId: string;
        action: string;
        detail: string;
        status?: string;
        jobId?: string;
    }) {
        const category = this.getCategoryFromAction(data.action);

        return await ActivityLog.create({
            ...data,
            category,
            status: data.status || 'Pending',
        });
    }

    /**
     * Get category statistics
     */
    static async getCategoryStats(shop: string) {
        const stats = await ActivityLog.aggregate([
            { $match: { shop } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    successCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'Success'] }, 1, 0] }
                    },
                    failedCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'Failed'] }, 1, 0] }
                    },
                }
            },
        ]);

        return stats;
    }
}

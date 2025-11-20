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
    "Revert": "Bulk Operations",
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
            page?: number;
            startDate?: Date;
            endDate?: Date;
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

        // Search filter (action or details)
        if (filters?.search) {
            query.$or = [
                { action: { $regex: filters.search, $options: 'i' } },
                { 'details.message': { $regex: filters.search, $options: 'i' } },
            ];
        }

        // Date range filter
        if (filters?.startDate || filters?.endDate) {
            query.timestamp = {};
            if (filters.startDate) {
                query.timestamp.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.timestamp.$lte = filters.endDate;
            }
        }

        // Pagination
        const page = filters?.page || 1;
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalCount = await ActivityLog.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        const mappedLogs = logs.map((log: any) => {
            // Backward compatibility: convert old string detail to array format
            let details = log.details;
            if (typeof log.detail === 'string') {
                details = [{ message: log.detail, timestamp: log.timestamp }];
            }

            return {
                id: log._id.toString(),
                resourceType: log.resourceType,
                resourceId: log.resourceId,
                action: log.action,
                category: log.category || this.getCategoryFromAction(log.action),
                details: details || [],
                status: log.status,
                timestamp: log.timestamp,
                jobId: log.jobId,
            };
        });

        return {
            logs: mappedLogs,
            totalCount,
            totalPages,
            currentPage: page,
        };
    }

    /**
     * Create or update activity log with automatic category detection
     * If jobId exists, updates the existing log; otherwise creates a new one
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
        const newDetail = {
            message: data.detail,
            timestamp: new Date(),
        };

        // If jobId is provided, try to update existing log
        if (data.jobId) {
            const existingLog = await ActivityLog.findOne({
                shop: data.shop,
                jobId: data.jobId
            });

            if (existingLog) {
                // Update existing log: push new detail and update status
                existingLog.details.push(newDetail);
                existingLog.status = data.status || existingLog.status;
                existingLog.timestamp = new Date();
                await existingLog.save();
                return existingLog;
            }
        }

        // Create new log if no jobId or no existing log found
        return await ActivityLog.create({
            shop: data.shop,
            resourceType: data.resourceType,
            resourceId: data.resourceId,
            action: data.action,
            category,
            details: [newDetail],
            jobId: data.jobId,
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

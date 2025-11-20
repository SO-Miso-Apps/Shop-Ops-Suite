import { ActivityLog } from "../models/ActivityLog";

export class ActivityService {
    static async getLogs(shop: string, limit: number = 50) {
        const logs = await ActivityLog.find({ shop })
            .sort({ timestamp: -1 })
            .limit(limit);

        return logs.map((log: any) => ({
            id: log._id.toString(),
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            action: log.action,
            detail: log.detail,
            status: log.status,
            timestamp: log.timestamp,
        }));
    }
}

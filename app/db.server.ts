import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URL || "mongodb://localhost:27017/shop-ops-suite";

let isConnected = false;

export const connectDB = async () => {
    if (isConnected) {
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log("🚀 Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        // Không throw error để app không crash nếu DB lỗi tạm thời, nhưng cần xử lý ở logic
    }
};

// --- Models ---
export { ShopConfig } from "./models/ShopConfig";
export { TaggingRule } from "./models/TaggingRule";
export { MetafieldRule } from "./models/MetafieldRule";
export { ActivityLog } from "./models/ActivityLog";
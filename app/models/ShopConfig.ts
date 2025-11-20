import mongoose from "mongoose";

const shopConfigSchema = new mongoose.Schema({
    shop: { type: String, required: true, unique: true },
    accessToken: { type: String, required: true },
    currencyCode: { type: String, default: "USD" },
    email: { type: String, default: "" },
    shopName: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

export const ShopConfig = mongoose.models.ShopConfig || mongoose.model("ShopConfig", shopConfigSchema);

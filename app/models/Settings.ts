import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
    shop: { type: String, required: true, unique: true, index: true },
    onboardingCompleted: { type: Boolean, default: false },
    agreedToTerms: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});

export const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

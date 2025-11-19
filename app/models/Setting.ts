import mongoose, { Schema, model, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * Billing plan enumeration.
 */
export enum Plan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

/**
 * Billing status enumeration.
 */
export enum BillingStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
}

/**
 * Feature flags configuration.
 */
export interface IFeatures {
  /** Maximum number of recipes allowed */
  maxRecipes: number;
  /** Advanced condition operators enabled */
  advancedConditions: boolean;
  /** Scheduled recipe execution enabled */
  scheduledRecipes: boolean;
  /** Custom webhook endpoints enabled */
  customWebhooks: boolean;
}

/**
 * User preferences configuration.
 */
export interface IPreferences {
  /** Email notifications enabled */
  emailNotifications: boolean;
  /** Activity log retention in days */
  activityLogRetention: number;
  /** IANA timezone */
  timezone: string;
}

/**
 * Shop metadata from Shopify.
 */
export interface IShopMetadata {
  /** Shop name */
  shopName: string;
  /** Shop owner name */
  shopOwner: string;
  /** Contact email */
  email: string;
  /** Shop domain */
  domain: string;
  /** Currency code (e.g., "USD") */
  currency: string;
  /** IANA timezone */
  timezone: string;
}

/**
 * Shop-level settings and configuration.
 *
 * Stores billing information, feature flags, and shop metadata.
 * One setting document per shop (unique constraint on shop field).
 *
 * @example
 * ```typescript
 * const setting = await Setting.create({
 *   shop: 'example.myshopify.com',
 *   plan: Plan.FREE,
 *   billingStatus: BillingStatus.TRIAL,
 *   accessToken: 'shpat_abc123', // Will be encrypted on save
 *   scopes: ['write_products', 'write_customers'],
 *   shopMetadata: {
 *     shopName: 'My Store',
 *     shopOwner: 'John Doe',
 *     email: 'john@example.com',
 *     domain: 'example.myshopify.com',
 *     currency: 'USD',
 *     timezone: 'America/New_York'
 *   }
 * });
 *
 * // Decrypt access token
 * const token = setting.decryptAccessToken();
 * ```
 */
export interface ISetting extends Document {
  /** Shopify shop domain (unique) */
  shop: string;

  /** Current billing plan */
  plan: Plan;

  /** Billing status */
  billingStatus: BillingStatus;

  /** Trial end date (for trial plans) */
  trialEndsAt?: Date;

  /** Shopify recurring charge ID */
  subscriptionId?: string;

  /** Encrypted Shopify access token */
  accessToken: string;

  /** Granted OAuth scopes */
  scopes: string[];

  /** Plan-based feature flags */
  features: IFeatures;

  /** User preferences */
  preferences: IPreferences;

  /** Shop metadata from Shopify */
  shopMetadata: IShopMetadata;

  /** App installation timestamp */
  installedAt: Date;

  /** App uninstallation timestamp (if uninstalled) */
  uninstalledAt?: Date;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  // Instance methods
  decryptAccessToken(): string;
  updatePlan(newPlan: Plan): Promise<ISetting>;
  hasFeature(featureName: keyof IFeatures): boolean;
  isTrialExpired(): boolean;
}

/**
 * Setting model with static methods.
 */
export interface ISettingModel extends mongoose.Model<ISetting> {
  findByShop(shop: string): Promise<ISetting | null>;
}

// Encryption helpers
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt text using AES-256-GCM.
 *
 * @param text - Plaintext to encrypt
 * @returns Encrypted text in format "iv:authTag:encrypted"
 */
function encrypt(text: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  if (encryptionKey.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  const key = Buffer.from(encryptionKey, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt text using AES-256-GCM.
 *
 * @param text - Encrypted text in format "iv:authTag:encrypted"
 * @returns Decrypted plaintext
 */
function decrypt(text: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  const [ivHex, authTagHex, encrypted] = text.split(':');

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted text format');
  }

  const key = Buffer.from(encryptionKey, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Main Setting schema
const SettingSchema = new Schema<ISetting, ISettingModel>(
  {
    shop: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      required: true,
      enum: Object.values(Plan),
      default: Plan.FREE,
    },
    billingStatus: {
      type: String,
      required: true,
      enum: Object.values(BillingStatus),
      default: BillingStatus.TRIAL,
    },
    trialEndsAt: Date,
    subscriptionId: String,
    accessToken: {
      type: String,
      required: true,
    },
    scopes: [{ type: String }],
    features: {
      maxRecipes: {
        type: Number,
        default: 10,
        min: 10,
        max: 1000,
      },
      advancedConditions: { type: Boolean, default: false },
      scheduledRecipes: { type: Boolean, default: false },
      customWebhooks: { type: Boolean, default: false },
    },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      activityLogRetention: {
        type: Number,
        default: 90,
        min: 30,
        max: 365,
      },
      timezone: {
        type: String,
        default: 'America/New_York',
      },
    },
    shopMetadata: {
      shopName: { type: String, required: true },
      shopOwner: { type: String, required: true },
      email: { type: String, required: true },
      domain: { type: String, required: true },
      currency: { type: String, required: true },
      timezone: { type: String, required: true },
    },
    installedAt: {
      type: Date,
      default: Date.now,
    },
    uninstalledAt: Date,
  },
  {
    timestamps: true,
    collection: 'settings',
  }
);

// Indexes
SettingSchema.index({ shop: 1 }, { unique: true });
SettingSchema.index({ billingStatus: 1, trialEndsAt: 1 });
SettingSchema.index({ plan: 1 });

// Pre-save hook: Encrypt access token
SettingSchema.pre('save', function (next) {
  // Only encrypt if accessToken was modified and is not already encrypted
  if (this.isModified('accessToken')) {
    // Check if already encrypted (contains colons separating iv:authTag:encrypted)
    const isEncrypted = this.accessToken.split(':').length === 3;

    if (!isEncrypted) {
      try {
        this.accessToken = encrypt(this.accessToken);
      } catch (error) {
        return next(
          error instanceof Error
            ? error
            : new Error('Failed to encrypt access token')
        );
      }
    }
  }

  next();
});

// Static Methods

/**
 * Find setting by shop domain.
 *
 * @param shop - Shopify shop domain
 * @returns Setting document or null if not found
 */
SettingSchema.statics.findByShop = function (
  shop: string
): Promise<ISetting | null> {
  return this.findOne({ shop });
};

// Instance Methods

/**
 * Decrypt the stored access token.
 *
 * @returns Decrypted access token
 */
SettingSchema.methods.decryptAccessToken = function (): string {
  try {
    return decrypt(this.accessToken);
  } catch (error) {
    throw new Error(
      `Failed to decrypt access token: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Update billing plan and associated features.
 *
 * @param newPlan - New billing plan
 * @returns Updated setting document
 */
SettingSchema.methods.updatePlan = async function (
  newPlan: Plan
): Promise<ISetting> {
  this.plan = newPlan;

  // Update features based on plan
  switch (newPlan) {
    case Plan.FREE:
      this.features.maxRecipes = 10;
      this.features.advancedConditions = false;
      this.features.scheduledRecipes = false;
      this.features.customWebhooks = false;
      break;
    case Plan.PRO:
      this.features.maxRecipes = 100;
      this.features.advancedConditions = true;
      this.features.scheduledRecipes = false;
      this.features.customWebhooks = false;
      break;
    case Plan.ENTERPRISE:
      this.features.maxRecipes = 1000;
      this.features.advancedConditions = true;
      this.features.scheduledRecipes = true;
      this.features.customWebhooks = true;
      break;
  }

  return this.save();
};

/**
 * Check if a specific feature is enabled.
 *
 * @param featureName - Feature name to check
 * @returns true if feature is enabled, false otherwise
 */
SettingSchema.methods.hasFeature = function (
  featureName: keyof IFeatures
): boolean {
  const value = this.features[featureName];
  return typeof value === 'boolean' ? value : false;
};

/**
 * Check if trial period has expired.
 *
 * @returns true if trial expired, false otherwise
 */
SettingSchema.methods.isTrialExpired = function (): boolean {
  if (this.billingStatus !== BillingStatus.TRIAL) return false;
  if (!this.trialEndsAt) return false;
  return this.trialEndsAt < new Date();
};

// Export model
export const Setting = mongoose.models['Settings'] || model<ISetting, ISettingModel>('Setting', SettingSchema);
export default Setting;

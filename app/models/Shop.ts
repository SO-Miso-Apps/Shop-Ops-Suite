import { Schema, model, Document } from 'mongoose';
import type mongoose from 'mongoose';

/**
 * App installation status enumeration.
 */
export enum AppStatus {
  INSTALLED = 'installed',
  UNINSTALLED = 'uninstalled',
  SUSPENDED = 'suspended',
}

/**
 * Webhook subscription status enumeration.
 */
export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed',
}

/**
 * Webhook subscription record.
 */
export interface IWebhook {
  /** Webhook topic (e.g., "customers/update") */
  topic: string;
  /** Shopify webhook subscription ID */
  webhookId: string;
  /** Registration timestamp */
  registeredAt: Date;
  /** Webhook status */
  status: WebhookStatus;
}

/**
 * Shop metadata and webhook management.
 *
 * Stores Shopify shop information and tracks registered webhook subscriptions.
 * One shop document per Shopify store (unique constraint on shop field).
 *
 * @example
 * ```typescript
 * const shop = await Shop.create({
 *   shop: 'example.myshopify.com',
 *   shopifyShopId: 'gid://shopify/Shop/12345',
 *   name: 'My Store',
 *   email: 'contact@example.com',
 *   domain: 'example.myshopify.com',
 *   currency: 'USD',
 *   timezone: 'America/New_York'
 * });
 *
 * // Add webhook subscription
 * await shop.addWebhook('customers/update', 'gid://shopify/WebhookSubscription/123');
 *
 * // Remove webhook subscription
 * await shop.removeWebhook('gid://shopify/WebhookSubscription/123');
 * ```
 */
export interface IShop extends Document {
  /** Shopify shop domain (unique) */
  shop: string;

  /** Shopify shop GID */
  shopifyShopId: string;

  /** Shop name */
  name: string;

  /** Contact email */
  email: string;

  /** Shop domain */
  domain: string;

  /** Currency code (e.g., "USD") */
  currency: string;

  /** IANA timezone */
  timezone: string;

  /** Registered webhook subscriptions */
  webhooks: IWebhook[];

  /** App installation status */
  appStatus: AppStatus;

  /** App installation timestamp */
  installedAt: Date;

  /** App uninstallation timestamp (if uninstalled) */
  uninstalledAt?: Date;

  /** Last API request timestamp */
  lastSeenAt: Date;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  // Instance methods
  addWebhook(topic: string, webhookId: string): Promise<IShop>;
  removeWebhook(webhookId: string): Promise<IShop>;
  updateLastSeen(): Promise<IShop>;
  markUninstalled(): Promise<IShop>;
}

/**
 * Shop model with static methods.
 */
export interface IShopModel extends mongoose.Model<IShop> {
  findByShop(shop: string): Promise<IShop | null>;
}

// Subdocument schema for webhooks
const WebhookSchema = new Schema<IWebhook>(
  {
    topic: { type: String, required: true },
    webhookId: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: Object.values(WebhookStatus),
      default: WebhookStatus.ACTIVE,
    },
  },
  { _id: false }
);

// Main Shop schema
const ShopSchema = new Schema<IShop, IShopModel>(
  {
    shop: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    shopifyShopId: {
      type: String,
      required: true,
      match: /^gid:\/\/shopify\/Shop\/\d+$/,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    domain: { type: String, required: true },
    currency: { type: String, required: true },
    timezone: { type: String, required: true },
    webhooks: {
      type: [WebhookSchema],
      default: [],
    },
    appStatus: {
      type: String,
      enum: Object.values(AppStatus),
      default: AppStatus.INSTALLED,
    },
    installedAt: {
      type: Date,
      default: Date.now,
    },
    uninstalledAt: Date,
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'shops',
  }
);

// Indexes
ShopSchema.index({ shop: 1 }, { unique: true });
ShopSchema.index({ shopifyShopId: 1 });
ShopSchema.index({ appStatus: 1, lastSeenAt: -1 });

// Static Methods

/**
 * Find shop by domain.
 *
 * @param shop - Shopify shop domain
 * @returns Shop document or null if not found
 */
ShopSchema.statics.findByShop = function (
  shop: string
): Promise<IShop | null> {
  return this.findOne({ shop });
};

// Instance Methods

/**
 * Add a webhook subscription to the shop.
 *
 * @param topic - Webhook topic (e.g., "customers/update")
 * @param webhookId - Shopify webhook subscription ID
 * @returns Updated shop document
 */
ShopSchema.methods.addWebhook = async function (
  topic: string,
  webhookId: string
): Promise<IShop> {
  // Check if webhook already exists
  const existingWebhook = this.webhooks.find(
    (w: IWebhook) => w.webhookId === webhookId
  );

  if (existingWebhook) {
    // Update existing webhook status
    existingWebhook.status = WebhookStatus.ACTIVE;
    existingWebhook.registeredAt = new Date();
  } else {
    // Add new webhook
    this.webhooks.push({
      topic,
      webhookId,
      registeredAt: new Date(),
      status: WebhookStatus.ACTIVE,
    });
  }

  return this.save();
};

/**
 * Remove a webhook subscription from the shop.
 *
 * @param webhookId - Shopify webhook subscription ID to remove
 * @returns Updated shop document
 */
ShopSchema.methods.removeWebhook = async function (
  webhookId: string
): Promise<IShop> {
  this.webhooks = this.webhooks.filter(
    (w: IWebhook) => w.webhookId !== webhookId
  );
  return this.save();
};

/**
 * Update the last seen timestamp.
 *
 * Called on each API request to track shop activity.
 *
 * @returns Updated shop document
 */
ShopSchema.methods.updateLastSeen = async function (): Promise<IShop> {
  this.lastSeenAt = new Date();
  return this.save();
};

/**
 * Mark the shop as uninstalled.
 *
 * Called when app/uninstalled webhook is received.
 *
 * @returns Updated shop document
 */
ShopSchema.methods.markUninstalled = async function (): Promise<IShop> {
  this.appStatus = AppStatus.UNINSTALLED;
  this.uninstalledAt = new Date();
  return this.save();
};

// Export model
export const Shop = model<IShop, IShopModel>('Shop', ShopSchema);
export default Shop;

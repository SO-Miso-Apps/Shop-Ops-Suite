import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  BillingInterval,
} from "@shopify/shopify-app-remix/server";
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";
import { connectDB } from "./db.server";
connectDB();

import { BillingPlans } from "./enums/BillingPlans";

export { BillingPlans };

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new RedisSessionStorage(process.env.REDIS_URL || "redis://localhost:6379"),
  distribution: AppDistribution.AppStore,
  hooks: {
    afterAuth: async ({ session, admin }) => {
      try {
        console.log(`🔄 Processing afterAuth for shop: ${session.shop}`);

        // 1. Fetch shop information using GraphQL
        const shopQuery = await admin.graphql(`
          query {
            shop {
              id
              name
              email
              myshopifyDomain
              plan {
                displayName
              }
              currencyCode
              timezoneAbbreviation
              billingAddress {
                country
              }
            }
          }
        `);

        const { data } = await shopQuery.json();
        const shopInfo = data.shop;

        // 2. Create/update ShopConfig
        const { ShopConfig } = await import("./models/ShopConfig");
        await ShopConfig.findOneAndUpdate(
          { shop: session.shop },
          {
            shop: session.shop,
            accessToken: session.accessToken,
            currencyCode: shopInfo.currencyCode || "USD",
            email: shopInfo.email || "",
            shopName: shopInfo.name || "",
            isActive: true,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        // 3. Initialize Settings if not exists
        const { Settings } = await import("./models/Settings");
        const existingSettings = await Settings.findOne({ shop: session.shop });

        if (!existingSettings) {
          await Settings.create({
            shop: session.shop,
            setupGuideDismissed: false,
            agreedToTerms: false,
            updatedAt: new Date(),
          });
        }

        // 4. Log authentication activity
        const { ActivityService } = await import("./services/activity.service");
        await ActivityService.createLog({
          shop: session.shop,
          resourceType: "Shop",
          resourceId: shopInfo.id,
          action: "App Authentication",
          detail: `Shop "${shopInfo.name}" (${shopInfo.plan.displayName} plan) authenticated successfully`,
          status: "Success",
        });

        console.log(`✅ Shop ${session.shop} authenticated successfully`);
        console.log(`   - Name: ${shopInfo.name}`);
        console.log(`   - Plan: ${shopInfo.plan.displayName}`);
        console.log(`   - Currency: ${shopInfo.currencyCode}`);

      } catch (error) {
        console.error(`❌ Error in afterAuth hook for ${session.shop}:`, error);

        // Log failed authentication attempt
        try {
          const { ActivityService } = await import("./services/activity.service");
          await ActivityService.createLog({
            shop: session.shop,
            resourceType: "Shop",
            resourceId: session.shop,
            action: "App Authentication Failed",
            detail: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            status: "Failed",
          });
        } catch (logError) {
          console.error("Failed to log authentication error:", logError);
        }

        // Don't throw error to prevent auth flow interruption
      }
    },
  },
  billing: {
    [BillingPlans.Pro]: {
      amount: 9.99,
      currencyCode: "USD",
      lineItems: [
        {
          amount: 9.99,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [BillingPlans.ProAnnual]: {
      amount: 99.99,
      currencyCode: "USD",
      lineItems: [
        {
          amount: 99.99,
          currencyCode: "USD",
          interval: BillingInterval.Annual,
        },
      ],
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

// Type utilities for Shopify Admin API
export type AdminApiContext = Awaited<ReturnType<typeof authenticate.admin>>;
export type ShopifyAdminClient = AdminApiContext['admin'];

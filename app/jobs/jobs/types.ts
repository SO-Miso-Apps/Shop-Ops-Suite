/**
 * Payload for recipe execution job.
 *
 * Triggered by Shopify webhooks.
 */
export interface RecipeExecutionJobPayload {
  /** Shopify shop domain (multi-tenant key) */
  shop: string;

  /** Webhook topic (e.g., "customers/update") */
  event: string;

  /** Shopify resource GID (e.g., "gid://shopify/Customer/123") */
  resourceId: string;

  /** Full webhook payload from Shopify */
  resourceData: any;

  /** Job priority (1=high, 5=normal, 10=low) */
  priority?: number;

  /** Additional metadata for tracking */
  metadata?: {
    webhookId?: string;
    receivedAt?: string; // ISO timestamp
  };
}

/**
 * Payload for scheduled cleanup job.
 */
export interface ScheduledCleanupJobPayload {
  /** Type of cleanup to perform */
  cleanupType: 'old-logs' | 'stale-sessions';

  /** Days of data to keep (older data deleted) */
  daysToKeep: number;
}

/**
 * Job result (returned by worker processor).
 */
export interface JobResult {
  success: boolean;
  recipesEvaluated?: number;
  recipesMatched?: number;
  actionsExecuted?: number;
  errors?: string[];
  duration: number;
}

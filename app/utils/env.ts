/**
 * Environment Variables Utility
 *
 * Provides type-safe access to environment variables with validation.
 */

/**
 * Environment variable configuration
 */
export interface EnvConfig {
  /** Node environment (development, production, test) */
  NODE_ENV: string;

  /** Port for the server */
  PORT: number;

  /** Shopify API key */
  SHOPIFY_API_KEY: string;

  /** Shopify API secret */
  SHOPIFY_API_SECRET: string;

  /** Shopify OAuth scopes */
  SCOPES: string;

  /** Shopify app URL */
  SHOPIFY_APP_URL: string;

  /** MongoDB connection URL */
  MONGODB_URL?: string;

  /** Redis connection URL */
  REDIS_URL?: string;

  /** Whether to use mock data (development only) */
  USE_MOCK_DATA: boolean;

  /** Telegram bot service URL (optional) */
  TELEGRAM_BOT_SERVICE_URL?: string;

  /** Crisp website ID (optional) */
  CRISP_WEBSITE_ID?: string;

  /** Cron secret for scheduled tasks (optional) */
  CRON_SECRET?: string;
}

/**
 * Parse a boolean environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Parse an integer environment variable
 */
function parseInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get environment variables with type safety and validation
 */
export function getEnv(): EnvConfig {
  // Access process.env safely
  const env = typeof process !== 'undefined' ? process.env : {};

  const config: EnvConfig = {
    NODE_ENV: env.NODE_ENV || 'development',
    PORT: parseInt(env.PORT, 3000),
    SHOPIFY_API_KEY: env.SHOPIFY_API_KEY || '',
    SHOPIFY_API_SECRET: env.SHOPIFY_API_SECRET || '',
    SCOPES: env.SCOPES || '',
    SHOPIFY_APP_URL: env.SHOPIFY_APP_URL || '',
    MONGODB_URL: env.MONGODB_URL,
    REDIS_URL: env.REDIS_URL,
    USE_MOCK_DATA: parseBoolean(env.USE_MOCK_DATA, env.NODE_ENV === 'development'),
    TELEGRAM_BOT_SERVICE_URL: env.TELEGRAM_BOT_SERVICE_URL,
    CRISP_WEBSITE_ID: env.CRISP_WEBSITE_ID,
    CRON_SECRET: env.CRON_SECRET
  };

  return config;
}

/**
 * Validate required environment variables
 * Throws an error if any required variables are missing
 */
export function validateEnv(): void {
  const env = getEnv();

  const requiredVars: (keyof EnvConfig)[] = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'SCOPES',
    'SHOPIFY_APP_URL'
  ];

  const missing: string[] = [];

  for (const varName of requiredVars) {
    const value = env[varName];
    if (!value || value === '') {
      missing.push(varName);
    }
  }

  // In production, also require database URLs
  if (env.NODE_ENV === 'production') {
    if (!env.MONGODB_URL) missing.push('MONGODB_URL');
    if (!env.REDIS_URL) missing.push('REDIS_URL');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}

/**
 * Check if mock data should be used
 */
export function shouldUseMockData(): boolean {
  // Check localStorage override first (for DevTools)
  if (typeof localStorage !== 'undefined') {
    const override = localStorage.getItem('use_mock_data');
    if (override !== null) {
      return override === 'true';
    }
  }

  return getEnv().USE_MOCK_DATA;
}

/**
 * Get database connection URL (MongoDB)
 */
export function getDatabaseUrl(): string {
  const env = getEnv();

  if (shouldUseMockData()) {
    return ''; // No database needed for mock data
  }

  if (!env.MONGODB_URL) {
    throw new Error('MONGODB_URL is required when not using mock data');
  }

  return env.MONGODB_URL;
}

/**
 * Get Redis connection URL
 */
export function getRedisUrl(): string {
  const env = getEnv();

  if (shouldUseMockData()) {
    return ''; // No Redis needed for mock data (sessions in memory)
  }

  if (!env.REDIS_URL) {
    throw new Error('REDIS_URL is required when not using mock data');
  }

  return env.REDIS_URL;
}

/**
 * Export singleton instance for convenience
 */
export const env = getEnv();

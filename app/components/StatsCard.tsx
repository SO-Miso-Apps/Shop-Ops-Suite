/**
 * StatsCard Component
 *
 * Displays a statistic card for dashboard metrics.
 * Follows WIREFRAME.md dashboard design specifications.
 */

import { Card, Text, Link, BlockStack, SkeletonBodyText } from '@shopify/polaris';

export interface StatsCardProps {
  /** The main statistic to display */
  value: string | number;

  /** Label for the statistic */
  label: string;

  /** Optional link to view more details */
  viewAllUrl?: string;

  /** Whether the card is loading */
  loading?: boolean;
}

/**
 * Format number with commas
 */
function formatNumber(value: string | number): string {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return value;
}

/**
 * StatsCard Component
 *
 * @example
 * ```tsx
 * <StatsCard
 *   value={1234}
 *   label="Total Recipes"
 *   viewAllUrl="/recipes"
 * />
 * <StatsCard
 *   value="95%"
 *   label="Success Rate"
 *   loading={false}
 * />
 * ```
 */
export function StatsCard({ value, label, viewAllUrl, loading = false }: StatsCardProps) {
  return (
    <Card>
      <BlockStack gap="200">
        {loading ? (
          <>
            <SkeletonBodyText lines={1} />
            <SkeletonBodyText lines={1} />
          </>
        ) : (
          <>
            {/* Large number display */}
            <Text variant="heading2xl" as="p">
              {formatNumber(value)}
            </Text>

            {/* Label and optional link */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="headingSm" as="p" tone="subdued">
                {label}
              </Text>

              {viewAllUrl && (
                <Link url={viewAllUrl} removeUnderline>
                  View all
                </Link>
              )}
            </div>
          </>
        )}
      </BlockStack>
    </Card>
  );
}

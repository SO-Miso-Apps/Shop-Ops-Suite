/**
 * ActivityLogItem Component
 *
 * Displays an activity log entry with expandable details.
 * Shows timestamp, recipe name, action, resource, and status in collapsed state.
 * Shows full details including before/after changes in expanded state.
 */

import { useState } from 'react';
import { Card, Text, Collapsible, Link, BlockStack, InlineStack, Divider } from '@shopify/polaris';
import type { MockAutomationLog } from '~/mocks/types';
import { StatusBadge } from './StatusBadge';

export interface ActivityLogItemProps {
  /** Activity log data to display */
  log: MockAutomationLog;

  /** Whether the item starts in expanded state */
  defaultExpanded?: boolean;
}

/**
 * Format timestamp for display (e.g., "14:32")
 */
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date));
}

/**
 * Format full timestamp with timezone
 */
function formatFullTimestamp(date: Date, timezone: string = 'America/New_York'): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'long',
    timeZone: timezone
  }).format(new Date(date));
}

/**
 * Get Shopify Admin URL for resource
 */
function getAdminUrl(resourceType: string, resourceId: string): string {
  // Extract numeric ID from GID (e.g., "gid://shopify/Product/123" -> "123")
  const numericId = resourceId.split('/').pop() || '';

  const resourceMap: Record<string, string> = {
    product: 'products',
    customer: 'customers',
    order: 'orders'
  };

  const resource = resourceMap[resourceType] || resourceType;
  return `shopify://admin/${resource}/${numericId}`;
}

/**
 * ActivityLogItem Component
 *
 * @example
 * ```tsx
 * <ActivityLogItem log={mockLog} />
 * <ActivityLogItem log={mockLog} defaultExpanded={true} />
 * ```
 */
export function ActivityLogItem({ log, defaultExpanded = false }: ActivityLogItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => setExpanded(!expanded);

  const adminUrl = getAdminUrl(log.resourceType, log.resourceId);

  return (
    <Card>
      <div onClick={toggleExpanded} style={{ cursor: 'pointer' }}>
        <BlockStack gap="300">
          {/* Collapsed State */}
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <InlineStack gap="400" blockAlign="center" wrap={false}>
              <Text variant="bodySm" as="span" tone="subdued">
                {formatTime(log.createdAt)}
              </Text>

              <Text variant="bodyMd" as="span" fontWeight="semibold">
                {log.recipeTitle}
              </Text>

              <Text variant="bodySm" as="span" tone="subdued">
                → {log.resourceTitle}
              </Text>
            </InlineStack>

            <StatusBadge status={log.status} />
          </InlineStack>

          {/* Expanded State */}
          <Collapsible
            open={expanded}
            id={`log-details-${log.logId}`}
            transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
          >
            <BlockStack gap="300">
              <Divider />

              {/* Full Timestamp */}
              <InlineStack gap="200">
                <Text variant="bodySm" as="span" fontWeight="semibold">
                  Time:
                </Text>
                <Text variant="bodySm" as="span">
                  {formatFullTimestamp(log.createdAt)}
                </Text>
              </InlineStack>

              {/* Triggered By */}
              <InlineStack gap="200">
                <Text variant="bodySm" as="span" fontWeight="semibold">
                  Triggered by:
                </Text>
                <Text variant="bodySm" as="span">
                  {log.triggeredBy.charAt(0).toUpperCase() + log.triggeredBy.slice(1)}
                </Text>
              </InlineStack>

              {/* Execution Time */}
              <InlineStack gap="200">
                <Text variant="bodySm" as="span" fontWeight="semibold">
                  Execution time:
                </Text>
                <Text variant="bodySm" as="span">
                  {log.executionTime}ms
                </Text>
              </InlineStack>

              {/* Actions Performed */}
              {log.actionsPerformed.length > 0 && (
                <div>
                  <Text variant="bodySm" as="p" fontWeight="semibold">
                    Actions performed:
                  </Text>
                  <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                    {log.actionsPerformed.map((action, index) => (
                      <li key={index}>
                        <Text variant="bodySm" as="span">
                          {action.type === 'addTag' && `Added tag: ${action.tag}`}
                          {action.type === 'removeTag' && `Removed tag: ${action.tag}`}
                          {action.type === 'setMetafield' &&
                            `Set metafield: ${action.metafieldNamespace}.${action.metafieldKey} = ${action.metafieldValue}`}
                          {action.type === 'deleteMetafield' &&
                            `Deleted metafield: ${action.metafieldNamespace}.${action.metafieldKey}`}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error Message */}
              {log.errorMessage && (
                <div>
                  <Text variant="bodySm" as="p" fontWeight="semibold" tone="critical">
                    Error:
                  </Text>
                  <Text variant="bodySm" as="p" tone="critical">
                    {log.errorMessage}
                  </Text>
                </div>
              )}

              {/* Before/After Changes */}
              {log.beforeState && log.afterState && (
                <div>
                  <Text variant="bodySm" as="p" fontWeight="semibold">
                    Changes:
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    <Text variant="bodySm" as="p">
                      <strong>Before:</strong> {JSON.stringify(log.beforeState, null, 2)}
                    </Text>
                    <Text variant="bodySm" as="p">
                      <strong>After:</strong> {JSON.stringify(log.afterState, null, 2)}
                    </Text>
                  </div>
                </div>
              )}

              {/* Link to Resource */}
              <div>
                <Link url={adminUrl} external removeUnderline>
                  View {log.resourceType} in Shopify Admin →
                </Link>
              </div>
            </BlockStack>
          </Collapsible>
        </BlockStack>
      </div>
    </Card>
  );
}

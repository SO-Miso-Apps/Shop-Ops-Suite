/**
 * StatusBadge Component
 *
 * Displays a status badge with appropriate color and icon.
 * Maps automation log statuses to Polaris badge tones.
 */

import { Badge } from '@shopify/polaris';
import type { LogStatus } from '~/mocks/types';

export interface StatusBadgeProps {
  /** Status type */
  status: LogStatus;

  /** Optional custom text override */
  text?: string;

  /** Whether to show icon */
  showIcon?: boolean;
}

/**
 * Map status to Polaris badge tone
 */
const STATUS_TONE_MAP: Record<LogStatus, 'success' | 'critical' | 'warning' | 'info'> = {
  success: 'success',
  failure: 'critical',
  partial: 'warning',
  pending: 'info'
};

/**
 * Map status to default text
 */
const STATUS_TEXT_MAP: Record<LogStatus, string> = {
  success: 'Success',
  failure: 'Failed',
  partial: 'Partial',
  pending: 'Pending'
};

/**
 * Map status to icon (using emoji for accessibility)
 */
const STATUS_ICON_MAP: Record<LogStatus, string> = {
  success: '✓',
  failure: '✗',
  partial: '⚠',
  pending: '⏸'
};

/**
 * StatusBadge Component
 *
 * @example
 * ```tsx
 * <StatusBadge status="success" />
 * <StatusBadge status="failure" showIcon />
 * <StatusBadge status="partial" text="Partially completed" />
 * ```
 */
export function StatusBadge({ status, text, showIcon = false }: StatusBadgeProps) {
  const tone = STATUS_TONE_MAP[status];
  const displayText = text || STATUS_TEXT_MAP[status];
  const icon = STATUS_ICON_MAP[status];

  return (
    <Badge tone={tone}>
      {showIcon && `${icon} `}{displayText}
    </Badge>
  );
}

/**
 * RecipeCard Component
 *
 * Displays a recipe card with toggle functionality and preview.
 * Follows Polaris design system and WIREFRAME.md specifications.
 */

import { Card, Text, Badge, Button, BlockStack, InlineStack, Box } from '@shopify/polaris';
import type { MockRecipe } from '~/mocks/types';
import { useState } from 'react';

export interface RecipeCardProps {
  /** Recipe data to display */
  recipe: MockRecipe;

  /** Callback when recipe is toggled on/off */
  onToggle?: (enabled: boolean) => void;

  /** Callback when card is clicked for preview */
  onClick?: () => void;

  /** Whether the card is in a loading state */
  loading?: boolean;
}

/**
 * RecipeCard Component
 *
 * @example
 * ```tsx
 * <RecipeCard
 *   recipe={mockRecipe}
 *   onToggle={(enabled) => handleToggle(recipe.recipeId, enabled)}
 *   onClick={() => openPreviewModal(recipe)}
 * />
 * ```
 */
export function RecipeCard({ recipe, onToggle, onClick, loading = false }: RecipeCardProps) {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when toggling
    if (!onToggle || isToggling) return;

    setIsToggling(true);
    try {
      await onToggle(!recipe.enabled);
    } finally {
      // Smooth animation delay
      setTimeout(() => setIsToggling(false), 200);
    }
  };

  const handleCardClick = () => {
    if (onClick && !isToggling) {
      onClick();
    }
  };

  // Truncate description to 3 lines (approximately 150 characters)
  const truncatedDescription = recipe.description.length > 150
    ? recipe.description.substring(0, 150) + '...'
    : recipe.description;

  return (
    <div
      onClick={handleCardClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: recipe.enabled ? '4px solid var(--p-color-border-success)' : 'none',
        transition: 'all 200ms ease-in-out',
        opacity: loading ? 0.6 : 1,
        pointerEvents: loading ? 'none' : 'auto'
      }}
    >
      <Card>
        <BlockStack gap="400">
          {/* Header: Title and Badge */}
          <InlineStack align="space-between" blockAlign="start">
            <Box>
              <Text variant="headingMd" as="h3">
                {recipe.title}
              </Text>
            </Box>
            {recipe.enabled && (
              <Badge tone="success">Active</Badge>
            )}
          </InlineStack>

          {/* Description */}
          <Text variant="bodyMd" as="p" tone="subdued">
            {truncatedDescription}
          </Text>

          {/* Footer: Stats and Toggle */}
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="bodySm" as="span" tone="subdued">
              Affects: {recipe.executionCount.toLocaleString()} items
            </Text>

            <Button
              onClick={handleToggleClick}
              loading={isToggling}
              tone={recipe.enabled ? 'critical' : 'success'}
              size="slim"
              disabled={loading}
            >
              {recipe.enabled ? 'Turn Off' : 'Turn On'}
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>
    </div>
  );
}

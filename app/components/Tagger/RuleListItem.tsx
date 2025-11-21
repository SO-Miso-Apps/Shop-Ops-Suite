import { Badge, BlockStack, InlineStack, ResourceItem, Text } from "@shopify/polaris";
import type { TaggingRule } from "~/types/tagger.types";

interface RuleListItemProps {
  rule: TaggingRule;
  selectedTab: number;
  onEdit?: (rule: TaggingRule) => void;
  onToggle?: (rule: TaggingRule) => void;
  onDelete?: (id: string) => void;
  onImport?: (rule: TaggingRule) => void;
}

export function RuleListItem({
  rule,
  selectedTab,
  onEdit,
  onToggle,
  onDelete,
  onImport
}: RuleListItemProps) {
  const handleClick = () => {
    if (selectedTab === 0 && onEdit) {
      onEdit(rule);
    }
  };

  const buildShortcutActions = () => {
    if (selectedTab === 0) {
      return [
        {
          content: rule.isEnabled ? 'Turn Off' : 'Turn On',
          onAction: () => onToggle?.(rule),
        },
        {
          content: 'Delete',
          onAction: () => onDelete?.(rule._id!),
        }
      ];
    } else {
      return [
        {
          content: 'Import',
          onAction: () => onImport?.(rule)
        }
      ];
    }
  };

  return (
    <ResourceItem
      id={rule._id || ''}
      accessibilityLabel={`View details for ${rule.name}`}
      onClick={handleClick}
      shortcutActions={buildShortcutActions()}
    >
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="200">
          <InlineStack gap="200" blockAlign="center">
            <Text variant="headingMd" as="h3">{rule.name}</Text>
            {selectedTab === 0 && (
              <Badge tone={rule.isEnabled ? "success" : "critical"}>
                {rule.isEnabled ? "Active" : "Inactive"}
              </Badge>
            )}
            <Badge tone={rule.resourceType === 'orders' ? 'info' : 'success'}>
              {rule.resourceType}
            </Badge>
          </InlineStack>
          <Text variant="bodyMd" as="p" tone="subdued">
            Tags: <b>{rule.tags.join(", ")}</b>
          </Text>
          <Text variant="bodySm" as="p">
            {rule.conditions.length === 0
              ? "Applied to ALL items"
              : `When: ${rule.conditions.map((c) => `${c.field} ${c.operator} ${c.value}`).join(` ${rule.conditionLogic || 'AND'} `)}`
            }
          </Text>
        </BlockStack>
      </InlineStack>
    </ResourceItem>
  );
}

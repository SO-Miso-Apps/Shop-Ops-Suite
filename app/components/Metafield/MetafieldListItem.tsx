import { Badge, BlockStack, InlineStack, ResourceItem, Text } from "@shopify/polaris";
import type { MetafieldRule } from "~/types/metafield.types";

interface MetafieldListItemProps {
  rule: MetafieldRule;
  selectedTab: number;
  onEdit?: (rule: MetafieldRule) => void;
  onToggle?: (id: string, currentStatus: boolean) => void;
  onDelete?: (id: string) => void;
  onImport?: (rule: MetafieldRule) => void;
}

export function MetafieldListItem({
  rule,
  selectedTab,
  onEdit,
  onToggle,
  onDelete,
  onImport
}: MetafieldListItemProps) {
  const shortcutActions = [];

  if (onToggle && rule._id) {
    shortcutActions.push({
      content: rule.isEnabled ? 'Turn Off' : 'Turn On',
      onAction: () => onToggle(rule._id!, rule.isEnabled),
    });
  }

  if (onDelete && rule._id) {
    shortcutActions.push({
      content: 'Delete',
      onAction: () => onDelete(rule._id!),
    });
  }

  if (onImport) {
    shortcutActions.push({
      content: 'Import to My Rules',
      onAction: () => onImport(rule),
    });
  }

  const props: any = {
    id: rule._id || rule.id || '',
    accessibilityLabel: `${onEdit ? 'Edit' : 'View'} ${rule.name}`,
    shortcutActions
  };

  if (onEdit) {
    props.onClick = () => onEdit(rule);
  }

  return (
    <ResourceItem {...props}>
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="200">
          <InlineStack gap="200" blockAlign="center">
            <Text variant="headingMd" as="h3">{rule.name}</Text>
            <InlineStack gap="100">
              {selectedTab === 0 && (
                <Badge tone={rule.isEnabled ? "success" : "critical"}>
                  {rule.isEnabled ? "Active" : "Inactive"}
                </Badge>
              )}
              <Badge tone="info">{rule.resourceType}</Badge>
            </InlineStack>
          </InlineStack>
          <Text variant="bodyMd" as="p" tone="subdued">
            Set <code>{rule.definition.namespace}.{rule.definition.key}</code> to "{rule.definition.value}"
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

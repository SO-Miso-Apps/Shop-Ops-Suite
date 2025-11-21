import { Badge, BlockStack, InlineStack, ResourceItem, Text } from "@shopify/polaris";
import type { MetafieldRule } from "~/types/metafield.types";

interface MetafieldListItemProps {
  rule: MetafieldRule;
  onEdit: (rule: MetafieldRule) => void;
  onToggle: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
}

export function MetafieldListItem({
  rule,
  onEdit,
  onToggle,
  onDelete
}: MetafieldListItemProps) {
  return (
    <ResourceItem
      id={rule._id || ''}
      accessibilityLabel={`Edit ${rule.name}`}
      onClick={() => onEdit(rule)}
      shortcutActions={[
        {
          content: rule.isEnabled ? 'Turn Off' : 'Turn On',
          onAction: () => onToggle(rule._id!, rule.isEnabled),
        },
        {
          content: 'Delete',
          onAction: () => onDelete(rule._id!),
        }
      ]}
    >
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="200">
          <InlineStack gap="200" blockAlign="center">
            <Text variant="headingMd" as="h3">{rule.name}</Text>
            <Badge tone={rule.isEnabled ? "success" : "critical"}>
              {rule.isEnabled ? "Active" : "Inactive"}
            </Badge>
            <Badge tone="info">{rule.resourceType}</Badge>
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

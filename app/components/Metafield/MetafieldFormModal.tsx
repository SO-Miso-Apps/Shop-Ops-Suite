import {
  Banner,
  BlockStack,
  Box,
  Button,
  Divider,
  InlineStack,
  Modal,
  Select,
  Text,
  TextField
} from "@shopify/polaris";
import { MagicIcon } from "@shopify/polaris-icons";
import { ConditionBuilder } from "~/components/ConditionBuilder";
import type { MetafieldFormData, MetafieldFormErrors } from "~/types/metafield.types";

interface MetafieldFormModalProps {
  open: boolean;
  onClose: () => void;
  editingRule: any | null;
  formData: MetafieldFormData;
  onFormDataChange: (data: MetafieldFormData) => void;
  errors: MetafieldFormErrors;
  onSave: () => void;
  isLoading: boolean;
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  onGenerateAI: () => void;
  isGenerating: boolean;
}

const resourceOptions = [
  { label: "Products", value: "products" },
  { label: "Customers", value: "customers" },
];

const valueTypeOptions = [
  { label: "Single Line Text", value: "single_line_text_field" },
  { label: "Integer", value: "number_integer" },
  { label: "Decimal", value: "number_decimal" },
  { label: "JSON", value: "json" },
];

export function MetafieldFormModal({
  open,
  onClose,
  editingRule,
  formData,
  onFormDataChange,
  errors,
  onSave,
  isLoading,
  aiPrompt,
  onAiPromptChange,
  onGenerateAI,
  isGenerating
}: MetafieldFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRule ? "Edit Rule" : "Create New Rule"}
      primaryAction={{
        content: "Save Rule",
        onAction: onSave,
        loading: isLoading,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="500">
          {errors.common && (
            <Banner tone="critical">
              {errors.common}
            </Banner>
          )}
          {/* AI Generator */}
          <Box background="bg-surface-secondary" padding="400" borderRadius="200">
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text variant="headingSm" as="h3">✨ AI Magic Generator</Text>
              </InlineStack>
              <InlineStack gap="300" align="start" blockAlign="end">
                <div style={{ flexGrow: 1 }}>
                  <TextField
                    label="Describe your rule"
                    labelHidden
                    placeholder="e.g. Set material to 'Cotton' for all T-shirts from Nike"
                    value={aiPrompt}
                    onChange={onAiPromptChange}
                    autoComplete="off"
                    disabled={isGenerating}
                  />
                </div>
                <Button
                  icon={MagicIcon}
                  onClick={onGenerateAI}
                  loading={isGenerating}
                  disabled={!aiPrompt.trim()}
                >
                  Generate
                </Button>
              </InlineStack>
              <Text variant="bodyXs" as="p" tone="subdued">
                AI will try to fill in the name, conditions, and metafield definition for you.
              </Text>
            </BlockStack>
          </Box>

          <Divider />

          {/* General Info */}
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">General Information</Text>
            <InlineStack gap="400">
              <div style={{ flex: 2 }}>
                <TextField
                  label="Rule Name"
                  value={formData.name}
                  onChange={(v) => onFormDataChange({ ...formData, name: v })}
                  autoComplete="off"
                  placeholder="e.g. Nike Shoes Material"
                  error={errors.name}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Resource Type"
                  options={resourceOptions}
                  value={formData.resourceType}
                  onChange={(v) => onFormDataChange({ ...formData, resourceType: v as any, conditions: [] })}
                />
              </div>
            </InlineStack>
          </BlockStack>

          <Divider />

          {/* Conditions */}
          <ConditionBuilder
            conditions={formData.conditions}
            conditionLogic={formData.conditionLogic}
            resourceType={formData.resourceType}
            onChange={(newConditions, newLogic) => onFormDataChange({ ...formData, conditions: newConditions, conditionLogic: newLogic })}
          />

          <Divider />

          {/* Metafield Definition */}
          <BlockStack gap="300">
            <Text variant="headingSm" as="h3">Action: Set Metafield</Text>
            <InlineStack gap="400">
              <TextField
                label="Namespace"
                value={formData.definition.namespace}
                onChange={(v) => onFormDataChange({ ...formData, definition: { ...formData.definition, namespace: v } })}
                autoComplete="off"
                error={errors.namespace}
                helpText="e.g. custom, my_app (3-255 chars, no spaces)"
              />
              <TextField
                label="Key"
                value={formData.definition.key}
                onChange={(v) => onFormDataChange({ ...formData, definition: { ...formData.definition, key: v } })}
                autoComplete="off"
                error={errors.key}
                helpText="e.g. material, size (3-255 chars, no spaces)"
              />
              <Select
                label="Type"
                options={valueTypeOptions}
                value={formData.definition.valueType}
                onChange={(v) => onFormDataChange({ ...formData, definition: { ...formData.definition, valueType: v as any } })}
              />
            </InlineStack>
            <TextField
              label="Value to Set"
              value={formData.definition.value}
              onChange={(v) => onFormDataChange({ ...formData, definition: { ...formData.definition, value: v } })}
              autoComplete="off"
              multiline={formData.definition.valueType === 'json' ? 3 : undefined}
              error={errors.value}
            />
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

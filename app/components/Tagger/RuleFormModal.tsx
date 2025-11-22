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
import type { TaggerFormData, TaggerFormErrors } from "~/types/tagger.types";

interface RuleFormModalProps {
  open: boolean;
  onClose: () => void;
  editingRule: any | null;
  formData: TaggerFormData;
  onFormDataChange: (data: TaggerFormData) => void;
  errors: TaggerFormErrors;
  onSave: () => void;
  isLoading: boolean;
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  onGenerateAI: () => void;
  isGenerating: boolean;
}

const resourceOptions = [
  { label: "Orders", value: "orders" },
  { label: "Customers", value: "customers" },
];

export function RuleFormModal({
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
}: RuleFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRule ? "Edit Rule" : "Create Rule"}
      primaryAction={{
        content: "Save",
        onAction: onSave,
        loading: isLoading,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="500">
          {errors.common && <Banner tone="critical">{errors.common}</Banner>}
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
                    placeholder="e.g. Tag orders over $500 from US as 'High Value'"
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
                AI will try to fill in the name, conditions, and tags for you.
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
                  placeholder="e.g. High Value Orders"
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

          {/* Tags */}
          <BlockStack gap="300">
            <TextField
              label="Tags to Apply (comma separated)"
              value={formData.tags.join(", ")}
              onChange={(val) => onFormDataChange({ ...formData, tags: val.split(",").map(t => t.trim()).filter(t => t) })}
              autoComplete="off"
              helpText="Tags will be added when conditions match, and REMOVED when they don't."
              error={errors.tags}
            />
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

import {
  Autocomplete,
  Banner,
  BlockStack,
  Button,
  Card,
  FormLayout,
  Select,
  Text,
  TextField
} from "@shopify/polaris";
import type { BulkActionData } from "~/types/bulk.types";

interface BulkFormState {
  resourceType: string;
  operation: string;
  findTag: string;
  replaceTag: string;
}

interface BulkOperationFormProps {
  formState: BulkFormState;
  onFormChange: (updates: Partial<BulkFormState>) => void;
  onPreview: () => void;
  isLoading: boolean;
  isQueued: boolean;
  isQuotaExceeded: boolean;
  actionData?: BulkActionData;
  findTagInputValue: string;
  onFindTagInputChange: (value: string) => void;
  findTagOptions: Array<{ value: string; label: string }>;
  onSelectTag: (selected: string[]) => void;
}

export function BulkOperationForm({
  formState,
  onFormChange,
  onPreview,
  isLoading,
  isQueued,
  isQuotaExceeded,
  actionData,
  findTagInputValue,
  onFindTagInputChange,
  findTagOptions,
  onSelectTag
}: BulkOperationFormProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">Find & Replace Tags</Text>
        <Text as="p">
          Mass update tags across your store. This operation runs in the background.
        </Text>

        {isQueued && (
          <Banner tone="success" onDismiss={() => window.location.reload()}>
            Bulk operation started! Check Activity Log for progress.
          </Banner>
        )}

        {isQuotaExceeded && (
          <Banner tone="critical">
            <BlockStack gap="200">
              <Text as="p">{actionData?.message}</Text>
              <Button url="/app/billing">Upgrade to Pro</Button>
            </BlockStack>
          </Banner>
        )}

        {actionData?.status === "error" && (
          <Banner tone="critical">
            Error: {actionData.message}
          </Banner>
        )}

        <FormLayout>
          <Select
            label="Resource"
            options={[
              { label: "Products", value: "products" },
              { label: "Customers", value: "customers" },
              { label: "Orders", value: "orders" },
            ]}
            value={formState.resourceType}
            onChange={(value) => onFormChange({ resourceType: value })}
          />

          <Select
            label="Operation"
            options={[
              { label: "Find & Replace", value: "replace" },
              { label: "Add Tag", value: "add" },
              { label: "Remove Tag", value: "remove" },
            ]}
            value={formState.operation}
            onChange={(value) => onFormChange({ operation: value })}
          />

          <Autocomplete
            options={findTagOptions}
            selected={[]}
            onSelect={(selected) => {
              const selectedTag = selected[0];
              onSelectTag([selectedTag]);
            }}
            textField={
              <Autocomplete.TextField
                label={formState.operation === "add" ? "Tag to Add" : "Find Tag"}
                value={findTagInputValue}
                onChange={(value) => {
                  onFindTagInputChange(value);
                  onFormChange({ findTag: value });
                }}
                autoComplete="off"
                helpText={formState.operation === "replace" ? "The tag you want to change. Start typing to see suggestions." : "Start typing to see existing tags."}
              />
            }
          />

          {formState.operation === "replace" && (
            <TextField
              label="Replace With"
              value={formState.replaceTag}
              onChange={(value) => onFormChange({ replaceTag: value })}
              autoComplete="off"
              helpText="The new tag value."
            />
          )}

          <Button
            variant="primary"
            onClick={onPreview}
            loading={isLoading}
            disabled={!formState.findTag}
          >
            Preview Operation
          </Button>
        </FormLayout>
      </BlockStack>
    </Card>
  );
}

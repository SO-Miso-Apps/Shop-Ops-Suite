import {
  Banner,
  BlockStack,
  Box,
  List,
  Modal,
  Text
} from "@shopify/polaris";
import type { BulkActionData } from "~/types/bulk.types";

interface BulkPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  actionData?: BulkActionData;
}

export function BulkPreviewModal({
  open,
  onClose,
  onConfirm,
  isLoading,
  actionData
}: BulkPreviewModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm Bulk Operation"
      primaryAction={{
        content: `Update ${actionData?.count || 0} Items`,
        onAction: onConfirm,
        loading: isLoading,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text as="p">
            Found <strong>{actionData?.count || 0}</strong> {actionData?.resourceType} that will be affected by this operation.
          </Text>

          {actionData?.preview && actionData.preview.length > 0 && (
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Preview (first 10 items):</Text>
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <List>
                  {actionData.preview.map((item: any) => (
                    <List.Item key={item.id}>
                      <strong>{item.title}</strong>
                      <br />
                      <Text as="span" tone="subdued">Tags: {item.tags.join(", ")}</Text>
                    </List.Item>
                  ))}
                </List>
              </Box>
            </BlockStack>
          )}

          <Banner tone="warning">
            This operation will run in the background and cannot be undone (except via Backup/Revert for Pro users).
          </Banner>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

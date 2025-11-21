import {
  Banner,
  BlockStack,
  Box,
  List,
  Modal,
  Scrollable,
  Text
} from "@shopify/polaris";
import type { ScanResults } from "~/types/cleaner.types";

interface CleanConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  selectedTags: string[];
  results?: ScanResults;
}

export function CleanConfirmModal({
  open,
  onClose,
  onConfirm,
  isLoading,
  selectedTags,
  results
}: CleanConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm Tag Cleanup"
      primaryAction={{
        content: `Clean ${selectedTags.length} Tags`,
        onAction: onConfirm,
        destructive: true,
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
            Are you sure you want to remove <strong>{selectedTags.length}</strong> tags from <strong>~{results?.itemsScanned || 0}</strong> scanned items?
          </Text>

          {results?.previewItems && results.previewItems.length > 0 && (
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Items that will be affected (preview):</Text>
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <Scrollable style={{ maxHeight: '150px' }} shadow>
                  <List>
                    {results.previewItems.slice(0, 5).map(item => (
                      <List.Item key={item.id}>
                        <Text as="span" tone="subdued">Tags: {item.tags.join(", ")}</Text>
                      </List.Item>
                    ))}
                  </List>
                </Scrollable>
              </Box>
            </BlockStack>
          )}

          <Banner tone="warning">
            This action cannot be undone (except via Backup/Revert for Pro users). The cleanup process will run in the background.
          </Banner>
          <Box padding="400" background="bg-surface-secondary" borderRadius="200">
            <Scrollable style={{ maxHeight: '150px' }} shadow>
              <List>
                {selectedTags.map(tag => (
                  <List.Item key={tag}>{tag}</List.Item>
                ))}
              </List>
            </Scrollable>
          </Box>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

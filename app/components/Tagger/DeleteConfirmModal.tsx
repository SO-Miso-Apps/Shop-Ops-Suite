import { Modal, Text } from "@shopify/polaris";

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function DeleteConfirmModal({ open, onClose, onConfirm, isLoading }: DeleteConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Rule"
      primaryAction={{
        content: "Delete",
        onAction: onConfirm,
        destructive: true,
        loading: isLoading,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <Text as="p">Are you sure you want to delete this rule? This action cannot be undone.</Text>
      </Modal.Section>
    </Modal>
  );
}

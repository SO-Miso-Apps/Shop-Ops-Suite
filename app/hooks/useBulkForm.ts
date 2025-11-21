import { useCallback, useEffect, useState } from "react";

export function useBulkForm() {
  const [formState, setFormState] = useState({
    resourceType: "products",
    operation: "replace",
    findTag: "",
    replaceTag: "",
  });

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [findTagInputValue, setFindTagInputValue] = useState("");
  const [findTagOptions, setFindTagOptions] = useState<Array<{ value: string; label: string }>>([]);

  const openPreviewModal = useCallback(() => {
    setShowPreviewModal(true);
  }, []);

  const closePreviewModal = useCallback(() => {
    setShowPreviewModal(false);
  }, []);

  const updateFormState = useCallback((updates: Partial<typeof formState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    formState,
    setFormState,
    updateFormState,
    showPreviewModal,
    openPreviewModal,
    closePreviewModal,
    findTagInputValue,
    setFindTagInputValue,
    findTagOptions,
    setFindTagOptions
  };
}

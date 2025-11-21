import { useCallback, useState } from "react";

export function useCleanerState() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return {
    selectedTags,
    setSelectedTags,
    toggleTag,
    clearSelection,
    isModalOpen,
    openModal,
    closeModal
  };
}

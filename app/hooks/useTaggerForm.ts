import { useCallback, useState } from "react";
import type { TaggerFormData, TaggerFormErrors, TaggingRule } from "~/types/tagger.types";

const initialFormData: TaggerFormData = {
  name: "",
  resourceType: "orders",
  conditions: [],
  tags: [],
  isEnabled: true,
  conditionLogic: 'AND'
};

export function useTaggerForm() {
  const [formData, setFormData] = useState<TaggerFormData>(initialFormData);
  const [errors, setErrors] = useState<TaggerFormErrors>({});

  const validateForm = useCallback(() => {
    const newErrors: TaggerFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Rule name is required";
    }

    if (!formData.resourceType.trim()) {
      newErrors.resourceType = "Resource type is required";
    }

    if (!formData.conditions.length) {
      newErrors.conditions = "At least one condition is required";
    }

    if (!formData.tags.length) {
      newErrors.tags = "At least one tag is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, []);

  const initCreateForm = useCallback(() => {
    setFormData({
      name: "",
      resourceType: "orders",
      conditions: [{ field: "total_price", operator: "greater_than", value: "" }],
      tags: [],
      isEnabled: true,
      conditionLogic: 'AND'
    });
    setErrors({});
  }, []);

  const initEditForm = useCallback((rule: TaggingRule) => {
    setFormData({
      _id: rule._id,
      name: rule.name,
      resourceType: rule.resourceType,
      conditions: rule.conditions || [],
      tags: rule.tags || [],
      isEnabled: rule.isEnabled,
      conditionLogic: rule.conditionLogic || 'AND'
    });
    setErrors({});
  }, []);

  return {
    formData,
    setFormData,
    errors,
    validateForm,
    resetForm,
    initCreateForm,
    initEditForm
  };
}

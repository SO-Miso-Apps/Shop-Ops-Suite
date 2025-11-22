import { useCallback, useState } from "react";
import type { MetafieldFormData, MetafieldFormErrors, MetafieldRule } from "~/types/metafield.types";

const initialFormData: MetafieldFormData = {
  name: "",
  resourceType: "products",
  isEnabled: true,
  conditions: [],
  definition: {
    namespace: "custom",
    key: "",
    valueType: "single_line_text_field",
    value: ""
  },
  conditionLogic: 'AND'
};

export function useMetafieldForm() {
  const [formData, setFormData] = useState<MetafieldFormData>(initialFormData);
  const [errors, setErrors] = useState<MetafieldFormErrors>({});

  const validateForm = useCallback(() => {
    const newErrors: MetafieldFormErrors = {};
    const shopifyKeyRegex = /^[a-zA-Z0-9_-]{3,255}$/;

    if (!formData.name.trim()) {
      newErrors.name = "Rule name is required";
    }

    if (!formData.definition.namespace.trim()) {
      newErrors.namespace = "Namespace is required";
    } else if (!shopifyKeyRegex.test(formData.definition.namespace)) {
      newErrors.namespace = "Namespace must be 3-255 chars, alphanumeric, no spaces.";
    }

    if (!formData.definition.key.trim()) {
      newErrors.key = "Key is required";
    } else if (!shopifyKeyRegex.test(formData.definition.key)) {
      newErrors.key = "Key must be 3-255 chars, alphanumeric, no spaces.";
    }

    if (!formData.definition.value.trim()) {
      newErrors.value = "Value is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, []);

  const initCreateForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, []);

  const initEditForm = useCallback((rule: MetafieldRule) => {
    setFormData({
      _id: rule._id,
      name: rule.name,
      resourceType: rule.resourceType,
      conditions: rule.conditions || [],
      definition: rule.definition,
      isEnabled: rule.isEnabled,
      conditionLogic: rule.conditionLogic || 'AND'
    });
    setErrors({});
  }, []);

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    validateForm,
    resetForm,
    initCreateForm,
    initEditForm
  };
}

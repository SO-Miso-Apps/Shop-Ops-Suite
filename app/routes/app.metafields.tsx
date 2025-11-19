import { useState, useCallback } from "react";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    ResourceList,
    ResourceItem,
    Text,
    Button,
    Modal,
    TextField,
    BlockStack,
    InlineStack,
    Select,
    EmptyState,
    Badge,
    Banner,
    Box,
    Divider,
    Icon
} from "@shopify/polaris";
import { PlusIcon, DeleteIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { MetafieldRule } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const rules = await MetafieldRule.find({ shop: session.shop }).sort({ createdAt: -1 });
    return json({ rules });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "saveRule") {
        const ruleData = JSON.parse(formData.get("rule") as string);

        if (ruleData._id) {
            await MetafieldRule.findByIdAndUpdate(ruleData._id, {
                ...ruleData,
                updatedAt: new Date()
            });
        } else {
            await MetafieldRule.create({
                shop: session.shop,
                ...ruleData
            });
        }
    } else if (actionType === "deleteRule") {
        const id = formData.get("id") as string;
        await MetafieldRule.findByIdAndDelete(id);
    } else if (actionType === "toggleRule") {
        const id = formData.get("id") as string;
        const isEnabled = formData.get("isEnabled") === "true";
        await MetafieldRule.findByIdAndUpdate(id, { isEnabled });
    }

    return json({ status: "success" });
};

export default function MetafieldRules() {
    const { rules } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const nav = useNavigation();
    const isSaving = nav.state === "submitting";

    const [modalOpen, setModalOpen] = useState(false);

    // Initial State template
    const initialRuleState = {
        name: "",
        resourceType: "products",
        isEnabled: true,
        conditions: [],
        definition: {
            namespace: "custom",
            key: "",
            valueType: "single_line_text_field",
            value: ""
        }
    };

    const [formState, setFormState] = useState<any>(initialRuleState);

    // NEW: Validation Error State
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleOpenModal = (rule: any = null) => {
        setErrors({}); // Reset errors
        if (rule) {
            setFormState(rule);
        } else {
            setFormState(initialRuleState);
        }
        setModalOpen(true);
    };

    // NEW: Validation Logic
    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};
        const shopifyKeyRegex = /^[a-zA-Z0-9_-]{3,255}$/; // Chuẩn Shopify: 3-255 ký tự, không ký tự đặc biệt

        if (!formState.name.trim()) {
            newErrors.name = "Rule name is required";
        }

        if (!formState.definition.namespace.trim()) {
            newErrors.namespace = "Namespace is required";
        } else if (!shopifyKeyRegex.test(formState.definition.namespace)) {
            newErrors.namespace = "Namespace must be 3-255 chars, alphanumeric, no spaces.";
        }

        if (!formState.definition.key.trim()) {
            newErrors.key = "Key is required";
        } else if (!shopifyKeyRegex.test(formState.definition.key)) {
            newErrors.key = "Key must be 3-255 chars, alphanumeric, no spaces.";
        }

        if (!formState.definition.value.trim()) {
            newErrors.value = "Value is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formState]);

    const handleSave = () => {
        if (!validateForm()) {
            return; // Stop if validation fails
        }

        submit(
            {
                actionType: "saveRule",
                rule: JSON.stringify(formState),
            },
            { method: "post" }
        );
        setModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this rule?")) {
            submit({ actionType: "deleteRule", id }, { method: "post" });
        }
    };

    const handleToggle = (id: string, currentStatus: boolean) => {
        submit({ actionType: "toggleRule", id, isEnabled: (!currentStatus).toString() }, { method: "post" });
    };

    const updateCondition = (index: number, field: string, value: string) => {
        const newConditions = [...formState.conditions];
        newConditions[index] = { ...newConditions[index], [field]: value };
        setFormState({ ...formState, conditions: newConditions });
    };

    const addCondition = () => {
        setFormState({
            ...formState,
            conditions: [...formState.conditions, { field: "vendor", operator: "equals", value: "" }]
        });
    };

    const removeCondition = (index: number) => {
        const newConditions = formState.conditions.filter((_: any, i: number) => i !== index);
        setFormState({ ...formState, conditions: newConditions });
    };

    return (
        <Page
            title="Metafield Automation"
            primaryAction={{ content: "Create Rule", onAction: () => handleOpenModal() }}
            subtitle="Automatically set metafields based on conditions"
        >
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        {rules.length === 0 ? (
                            <EmptyState
                                heading="No automation rules yet"
                                action={{ content: "Create Rule", onAction: () => handleOpenModal() }}
                                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            >
                                <p>Create rules to automatically assign metafields when products or customers are created.</p>
                            </EmptyState>
                        ) : (
                            <ResourceList
                                resourceName={{ singular: "rule", plural: "rules" }}
                                items={rules}
                                renderItem={(item: any) => {
                                    return (
                                        <ResourceItem
                                            id={item._id}
                                            accessibilityLabel={`Edit ${item.name}`}
                                            onClick={() => handleOpenModal(item)}
                                            shortcutActions={[
                                                {
                                                    content: item.isEnabled ? 'Turn Off' : 'Turn On',
                                                    onAction: () => handleToggle(item._id, item.isEnabled),
                                                },
                                                {
                                                    content: 'Delete',
                                                    onAction: () => handleDelete(item._id),
                                                }
                                            ]}
                                        >
                                            <InlineStack align="space-between" blockAlign="center">
                                                <BlockStack gap="200">
                                                    <InlineStack gap="200" blockAlign="center">
                                                        <Text variant="headingMd" as="h3">{item.name}</Text>
                                                        <Badge tone={item.isEnabled ? "success" : "critical"}>
                                                            {item.isEnabled ? "Active" : "Inactive"}
                                                        </Badge>
                                                        <Badge tone="info">{item.resourceType}</Badge>
                                                    </InlineStack>
                                                    <Text variant="bodyMd" as="p" tone="subdued">
                                                        Set <code>{item.definition.namespace}.{item.definition.key}</code> to "{item.definition.value}"
                                                    </Text>
                                                    <Text variant="bodySm" as="p">
                                                        {item.conditions.length === 0
                                                            ? "Applied to ALL items"
                                                            : `When: ${item.conditions.map((c: any) => `${c.field} ${c.operator} ${c.value}`).join(" AND ")}`
                                                        }
                                                    </Text>
                                                </BlockStack>
                                            </InlineStack>
                                        </ResourceItem>
                                    );
                                }}
                            />
                        )}
                    </Card>
                </Layout.Section>
            </Layout>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={formState._id ? "Edit Rule" : "Create New Rule"}
                primaryAction={{
                    content: "Save Rule",
                    onAction: handleSave,
                    loading: isSaving,
                }}
                secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
                size="large"
            >
                <Modal.Section>
                    <BlockStack gap="500">
                        {/* General Info */}
                        <BlockStack gap="300">
                            <Text variant="headingSm" as="h3">General Information</Text>
                            <InlineStack gap="400">
                                <div style={{ flex: 2 }}>
                                    <TextField
                                        label="Rule Name"
                                        value={formState.name}
                                        onChange={(v) => setFormState({ ...formState, name: v })}
                                        autoComplete="off"
                                        placeholder="e.g. Nike Shoes Material"
                                        error={errors.name}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Select
                                        label="Resource Type"
                                        options={[
                                            { label: "Products", value: "products" },
                                            { label: "Customers", value: "customers" },
                                        ]}
                                        value={formState.resourceType}
                                        onChange={(v) => setFormState({ ...formState, resourceType: v })}
                                    />
                                </div>
                            </InlineStack>
                        </BlockStack>

                        <Divider />

                        {/* Conditions */}
                        <BlockStack gap="300">
                            <InlineStack align="space-between">
                                <Text variant="headingSm" as="h3">Conditions (ALL must be true)</Text>
                                <Button icon={PlusIcon} onClick={addCondition} variant="plain">Add Condition</Button>
                            </InlineStack>

                            {formState.conditions.length === 0 && (
                                <Banner tone="info">No conditions set. This rule will apply to ALL new {formState.resourceType}.</Banner>
                            )}

                            {formState.conditions.map((condition: any, index: number) => (
                                <InlineStack key={index} gap="300" align="start">
                                    <div style={{ width: '150px' }}>
                                        <Select
                                            label="Field"
                                            labelHidden
                                            options={
                                                formState.resourceType === 'products'
                                                    ? [
                                                        { label: "Vendor", value: "vendor" },
                                                        { label: "Product Type", value: "product_type" },
                                                        { label: "Title", value: "title" },
                                                        { label: "Tag", value: "tags" },
                                                        { label: "Price", value: "price" },
                                                        { label: "SKU", value: "sku" }
                                                    ]
                                                    : [
                                                        { label: "Email", value: "email" },
                                                        { label: "Tags", value: "tags" },
                                                        { label: "Total Spent", value: "total_spent" },
                                                        { label: "Country", value: "default_address.country_code" }
                                                    ]
                                            }
                                            value={condition.field}
                                            onChange={(v) => updateCondition(index, 'field', v)}
                                        />
                                    </div>
                                    <div style={{ width: '150px' }}>
                                        <Select
                                            label="Operator"
                                            labelHidden
                                            options={[
                                                { label: "Equals", value: "equals" },
                                                { label: "Not Equals", value: "not_equals" },
                                                { label: "Contains", value: "contains" },
                                                { label: "Starts With", value: "starts_with" },
                                                { label: "Greater Than", value: "greater_than" },
                                                { label: "Less Than", value: "less_than" },
                                            ]}
                                            value={condition.operator}
                                            onChange={(v) => updateCondition(index, 'operator', v)}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <TextField
                                            label="Value"
                                            labelHidden
                                            value={condition.value}
                                            onChange={(v) => updateCondition(index, 'value', v)}
                                            autoComplete="off"
                                            placeholder="Value to match..."
                                        />
                                    </div>
                                    <div style={{ marginTop: '4px' }}>
                                        <Button icon={DeleteIcon} onClick={() => removeCondition(index)} tone="critical" variant="plain" />
                                    </div>
                                </InlineStack>
                            ))}
                        </BlockStack>

                        <Divider />

                        {/* Actions */}
                        <BlockStack gap="300">
                            <Text variant="headingSm" as="h3">Action: Set Metafield</Text>
                            <InlineStack gap="400">
                                <TextField
                                    label="Namespace"
                                    value={formState.definition.namespace}
                                    onChange={(v) => setFormState({ ...formState, definition: { ...formState.definition, namespace: v } })}
                                    autoComplete="off"
                                    error={errors.namespace}
                                    helpText="e.g. custom, my_app (3-255 chars, no spaces)"
                                />
                                <TextField
                                    label="Key"
                                    value={formState.definition.key}
                                    onChange={(v) => setFormState({ ...formState, definition: { ...formState.definition, key: v } })}
                                    autoComplete="off"
                                    error={errors.key}
                                    helpText="e.g. material, size (3-255 chars, no spaces)"
                                />
                                <Select
                                    label="Type"
                                    options={[
                                        { label: "Single Line Text", value: "single_line_text_field" },
                                        { label: "Integer", value: "number_integer" },
                                        { label: "Decimal", value: "number_decimal" },
                                        { label: "JSON", value: "json" },
                                    ]}
                                    value={formState.definition.valueType}
                                    onChange={(v) => setFormState({ ...formState, definition: { ...formState.definition, valueType: v } })}
                                />
                            </InlineStack>
                            <TextField
                                label="Value to Set"
                                value={formState.definition.value}
                                onChange={(v) => setFormState({ ...formState, definition: { ...formState.definition, value: v } })}
                                autoComplete="off"
                                multiline={formState.definition.valueType === 'json' ? 3 : undefined}
                                error={errors.value}
                            />
                        </BlockStack>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}
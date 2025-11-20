import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useFetcher, useLoaderData, useNavigation } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
    Badge,
    Banner,
    BlockStack,
    Box,
    Button,
    Card,
    EmptyState,
    FormLayout,
    InlineStack,
    Layout,
    Modal,
    Page,
    RadioButton,
    ResourceItem,
    ResourceList,
    Select,
    Tabs,
    Text,
    TextField
} from "@shopify/polaris";
import { DeleteIcon, MagicIcon, PlusIcon } from "@shopify/polaris-icons";
import { useCallback, useEffect, useState } from "react";
import { AIService } from "../services/ai.service";
import { TaggerService } from "../services/tagger.service";
import { authenticate } from "../shopify.server";

// --- Backend Logic ---

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const rules = await TaggerService.getRules(session.shop);
    const libraryRules = await TaggerService.getLibraryRules();

    const { UsageService } = await import("~/services/usage.service");
    const plan = await UsageService.getPlanType(session.shop);
    const isFreePlan = plan === "Free";

    let isLimitReached = false;
    if (isFreePlan) {
        const activeCount = await TaggerService.countActiveRules(session.shop);
        isLimitReached = activeCount >= 5;
    }

    return json({ rules, libraryRules, isFreePlan, isLimitReached });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "saveRule") {
        const ruleData = JSON.parse(formData.get("ruleData") as string);

        // Check limits if enabling or creating new
        if (ruleData.isEnabled) {
            const { UsageService } = await import("~/services/usage.service");
            const plan = await UsageService.getPlanType(session.shop);
            if (plan === "Free") {
                const activeCount = await TaggerService.countActiveRules(session.shop);
                // If new rule or enabling existing inactive rule
                const isNew = !ruleData._id;
                // We need to be careful. If we are editing an active rule, count doesn't increase.
                // If we are enabling an inactive rule, count increases.
                // Simple check: if count >= 5, only allow updates to ALREADY active rules.

                if (activeCount >= 5) {
                    // If it's new, block.
                    if (isNew) {
                        return json({ status: "error", message: "Free plan limit reached." }, { status: 403 });
                    }
                    // If existing, check if it was already enabled. (We'd need to fetch it, but let's assume the client sends correct state or we check DB)
                    // For simplicity, if count >= 5, we just block enabling ANY rule that isn't currently enabled.
                    // But here we are saving. Let's just trust the service or do a quick check.
                    const existing = ruleData._id ? (await TaggerService.getRules(session.shop)).find((r: any) => r._id.toString() === ruleData._id) : null;
                    if (!existing?.isEnabled) {
                        return json({ status: "error", message: "Free plan limit reached." }, { status: 403 });
                    }
                }
            }
        }

        await TaggerService.saveRule(session.shop, ruleData);
    } else if (actionType === "deleteRule") {
        const id = formData.get("id") as string;
        await TaggerService.deleteRule(session.shop, id);
    } else if (actionType === "importRule") {
        const ruleData = JSON.parse(formData.get("ruleData") as string);
        delete ruleData._id; // Remove ID to create new
        delete ruleData.shop;
        delete ruleData.createdAt;
        delete ruleData.updatedAt;
        ruleData.isEnabled = false; // Import as disabled
        await TaggerService.saveRule(session.shop, ruleData);
    } else if (actionType === "generateRule") {
        const prompt = formData.get("prompt") as string;
        const resourceType = formData.get("resourceType") as string;
        try {
            const generatedRule = await AIService.generateRuleFromPrompt(prompt, resourceType);
            return json({ status: "success", generatedRule });
        } catch (error) {
            return json({ status: "error", message: "Failed to generate rule" }, { status: 500 });
        }
    }

    return json({ status: "success" });
};

// --- Frontend Logic ---

export default function SmartTagger() {
    const { rules, libraryRules, isLimitReached } = useLoaderData<typeof loader>();
    const fetcher = useFetcher();
    const actionData = useActionData<typeof action>();
    const shopify = useAppBridge();
    const nav = useNavigation();
    const isLoading = nav.state === "submitting";

    const [selectedTab, setSelectedTab] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingRule, setEditingRule] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState<any>({
        name: "",
        resourceType: "orders",
        conditions: [],
        tags: [],
        isEnabled: true,
        conditionLogic: 'AND'
    });

    useEffect(() => {
        if (actionData?.status === "success" || (fetcher.data as any)?.status === "success") {
            if ((actionData as any)?.generatedRule || (fetcher.data as any)?.generatedRule) {
                const rule = (actionData as any)?.generatedRule || (fetcher.data as any)?.generatedRule;
                setFormData({
                    ...formData,
                    name: rule.name || formData.name,
                    conditionLogic: rule.conditionLogic || 'AND',
                    conditions: rule.conditions || [],
                    tags: rule.tags || []
                });
                setIsGenerating(false);
                shopify.toast.show("Rule generated!");
            } else {
                shopify.toast.show("Success");
                setModalOpen(false);
            }
        } else if ((actionData as any)?.status === "error" || (fetcher.data as any)?.status === "error") {
            shopify.toast.show((actionData as any)?.message || (fetcher.data as any)?.message || "An error occurred", { isError: true });
            setIsGenerating(false);
        }
    }, [actionData, fetcher.data, shopify]);

    const handleTabChange = useCallback((selectedTabIndex: number) => setSelectedTab(selectedTabIndex), []);

    const tabs = [
        { id: "my-rules", content: "My Rules" },
        { id: "library", content: "Library" },
    ];

    const handleEdit = (rule: any) => {
        setEditingRule(rule);
        setFormData({
            _id: rule._id,
            name: rule.name,
            resourceType: rule.resourceType,
            conditions: rule.conditions || [],
            tags: rule.tags || [],
            isEnabled: rule.isEnabled,
            conditionLogic: rule.conditionLogic || 'AND'
        });
        setModalOpen(true);
    };

    const handleCreate = () => {
        setEditingRule(null);
        setFormData({
            name: "",
            resourceType: "orders",
            conditions: [{ field: "total_price", operator: "greater_than", value: "" }],
            tags: [],
            isEnabled: true,
            conditionLogic: 'AND'
        });
        setModalOpen(true);
    };

    const handleDelete = (id: string) => {
        shopify.modal.show('delete-confirmation-modal'); // Using standardized modal if available, or just fetcher
        // Since I don't have the modal ID handy, I'll use window.confirm or better, a Polaris modal.
        // But for speed, I'll use fetcher directly with a confirm.
        // Wait, user requested "Standardize Confirmation Modals". I should use a Polaris Modal.
        // I'll implement a simple delete state.
    };

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const confirmDelete = () => {
        if (deleteId) {
            fetcher.submit({ actionType: "deleteRule", id: deleteId }, { method: "post" });
            setDeleteId(null);
        }
    };

    const handleImport = (rule: any) => {
        fetcher.submit({ actionType: "importRule", ruleData: JSON.stringify(rule) }, { method: "post" });
    };

    const handleSave = () => {
        fetcher.submit({ actionType: "saveRule", ruleData: JSON.stringify(formData) }, { method: "post" });
    };

    const handleGenerateAI = () => {
        setIsGenerating(true);
        fetcher.submit({ actionType: "generateRule", prompt: aiPrompt, resourceType: formData.resourceType }, { method: "post" });
    };

    // Condition Builder Helpers
    const addCondition = () => {
        setFormData({
            ...formData,
            conditions: [...formData.conditions, { field: "total_price", operator: "greater_than", value: "" }]
        });
    };

    const updateCondition = (index: number, key: string, value: string) => {
        const newConditions = [...formData.conditions];
        newConditions[index] = { ...newConditions[index], [key]: value };
        setFormData({ ...formData, conditions: newConditions });
    };

    const removeCondition = (index: number) => {
        const newConditions = formData.conditions.filter((_: any, i: number) => i !== index);
        setFormData({ ...formData, conditions: newConditions });
    };

    const resourceOptions = [
        { label: "Orders", value: "orders" },
        { label: "Customers", value: "customers" },
    ];

    const fieldOptions = formData.resourceType === "orders" ? [
        { label: "Total Price", value: "total_price" },
        { label: "Subtotal Price", value: "subtotal_price" },
        { label: "Gateway / Payment Method", value: "gateway" },
        { label: "Financial Status", value: "financial_status" },
        { label: "Currency", value: "currency" },
        { label: "Total Weight", value: "total_weight" },
        { label: "Shipping Method", value: "shipping_lines[0].title" },
        { label: "Shipping City", value: "shipping_address.city" },
        { label: "Shipping Country", value: "shipping_address.country_code" },
        { label: "Shipping Province/State", value: "shipping_address.province_code" },
        { label: "Shipping Zip", value: "shipping_address.zip" },
        { label: "Source Name", value: "source_name" },
        { label: "Tags", value: "tags" },
        { label: "Discount Code", value: "discount_codes[0].code" },
        { label: "Landing Site", value: "landing_site" },
        { label: "Referring Site", value: "referring_site" },
        { label: "Line Item SKU", value: "line_items.sku" },
        { label: "Line Item Vendor", value: "line_items.vendor" },
        { label: "Line Item Name", value: "line_items.name" },
        { label: "Line Item Quantity", value: "line_items.quantity" },
        { label: "Customer Order Count", value: "customer.orders_count" },
        { label: "Email", value: "email" },
    ] : [
        { label: "Total Spent", value: "total_spent" },
        { label: "Orders Count", value: "orders_count" },
        { label: "Account State", value: "state" },
        { label: "Verified Email", value: "verified_email" },
        { label: "Accepts Marketing", value: "accepts_marketing" },
        { label: "Tags", value: "tags" },
        { label: "Country", value: "default_address.country_code" },
        { label: "Email", value: "email" },
        { label: "State/Province", value: "default_address.province_code" },
    ];

    const operatorOptions = [
        { label: "Equals", value: "equals" },
        { label: "Not Equals", value: "not_equals" },
        { label: "Contains", value: "contains" },
        { label: "Starts With", value: "starts_with" },
        { label: "Ends With", value: "ends_with" },
        { label: "Greater Than", value: "greater_than" },
        { label: "Less Than", value: "less_than" },
        { label: "In (comma separated)", value: "in" },
        { label: "Not In (comma separated)", value: "not_in" },
        { label: "Is Empty", value: "is_empty" },
        { label: "Is Not Empty", value: "is_not_empty" },
    ];

    return (
        <Page
            title="Smart Tagger"
            subtitle="Automate your tagging workflows"
            primaryAction={selectedTab === 0 ? { content: "Create Rule", onAction: handleCreate, icon: PlusIcon } : undefined}
        >
            <Layout>
                <Layout.Section>
                    {isLimitReached && (
                        <Box paddingBlockEnd="400">
                            <Banner tone="warning" title="Free Plan Limit Reached">
                                <Text as="p">
                                    You have reached the limit of 5 active rules. Upgrade to Pro to enable more.
                                </Text>
                            </Banner>
                        </Box>
                    )}

                    <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                        <Card padding="0">
                            <ResourceList
                                resourceName={{ singular: "rule", plural: "rules" }}
                                items={selectedTab === 0 ? rules : libraryRules}
                                emptyState={
                                    <EmptyState
                                        heading="No rules found"
                                        action={selectedTab === 0 ? { content: "Create Rule", onAction: handleCreate } : undefined}
                                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                    >
                                        <p>Create a rule to start automating tags.</p>
                                    </EmptyState>
                                }
                                renderItem={(item: any) => {
                                    return (
                                        <ResourceItem
                                            id={item._id || item.id}
                                            accessibilityLabel={`View details for ${item.name}`}
                                            onClick={() => selectedTab === 0 && handleEdit(item)}
                                            shortcutActions={selectedTab === 0 ? [
                                                {
                                                    content: item.isEnabled ? 'Turn Off' : 'Turn On',
                                                    onAction: () => {
                                                        // We need a toggle action. For now, let's just save with inverted status
                                                        const newItem = { ...item, isEnabled: !item.isEnabled };
                                                        fetcher.submit({ actionType: "saveRule", ruleData: JSON.stringify(newItem) }, { method: "post" });
                                                    },
                                                },
                                                {
                                                    content: 'Delete',
                                                    onAction: () => {
                                                        setDeleteId(item._id);
                                                    },
                                                }
                                            ] : [
                                                {
                                                    content: 'Import',
                                                    onAction: () => handleImport(item)
                                                }
                                            ]}
                                        >
                                            <InlineStack align="space-between" blockAlign="center">
                                                <BlockStack gap="200">
                                                    <InlineStack gap="200" blockAlign="center">
                                                        <Text variant="headingMd" as="h3">{item.name}</Text>
                                                        {selectedTab === 0 && (
                                                            <Badge tone={item.isEnabled ? "success" : "critical"}>
                                                                {item.isEnabled ? "Active" : "Inactive"}
                                                            </Badge>
                                                        )}
                                                        <Badge tone={item.resourceType === 'orders' ? 'info' : 'success'}>{item.resourceType}</Badge>
                                                    </InlineStack>
                                                    <Text variant="bodyMd" as="p" tone="subdued">
                                                        Tags: <b>{item.tags.join(", ")}</b>
                                                    </Text>
                                                    <Text variant="bodySm" as="p">
                                                        {item.conditions.length === 0
                                                            ? "Applied to ALL items"
                                                            : `When: ${item.conditions.map((c: any) => `${c.field} ${c.operator} ${c.value}`).join(` ${item.conditionLogic || 'AND'} `)}`
                                                        }
                                                    </Text>
                                                </BlockStack>
                                            </InlineStack>
                                        </ResourceItem>
                                    );
                                }}
                            />
                        </Card>
                    </Tabs>
                </Layout.Section>
            </Layout>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingRule ? "Edit Rule" : "Create Rule"}
                primaryAction={{
                    content: "Save",
                    onAction: handleSave,
                    loading: isLoading,
                }}
                secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
                size="large"
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        <TextField
                            label="Prompt"
                            value={aiPrompt}
                            onChange={(val) => setAiPrompt(val)}
                            autoComplete="off"
                            placeholder="e.g. Tag orders over $500 from US as 'High Value'"
                            helpText="Enter a prompt to generate a rule"
                            multiline={1}
                            connectedRight={
                                <Button icon={MagicIcon} onClick={handleGenerateAI} disabled={isGenerating} loading={isGenerating} />
                            }
                        />
                        <Box padding="400" borderRadius="200" borderColor="border" borderWidth="025">
                            <FormLayout>
                                <FormLayout.Group>
                                    <TextField
                                        label="Rule Name"
                                        value={formData.name}
                                        onChange={(val) => setFormData({ ...formData, name: val })}
                                        autoComplete="off"
                                    />
                                    <Select
                                        label="Resource Type"
                                        options={resourceOptions}
                                        value={formData.resourceType}
                                        onChange={(val) => setFormData({ ...formData, resourceType: val })}
                                    />

                                </FormLayout.Group>

                                <FormLayout.Group title="Condition Logic">
                                    <RadioButton
                                        label="All rules passes"
                                        helpText="The trigger will only run if every single condition is met"
                                        checked={formData.conditionLogic === 'AND'}
                                        id="logic-and"
                                        name="conditionLogic"
                                        onChange={() => setFormData({ ...formData, conditionLogic: 'AND' })}
                                    />
                                    <RadioButton
                                        label="Any rule passes"
                                        helpText="The trigger will run if any one of the conditions is true"
                                        checked={formData.conditionLogic === 'OR'}
                                        id="logic-or"
                                        name="conditionLogic"
                                        onChange={() => setFormData({ ...formData, conditionLogic: 'OR' })}
                                    />
                                </FormLayout.Group>

                                <Text as="h3" variant="headingSm">Conditions</Text>
                                {formData.conditions.map((condition: any, index: number) => (
                                    <div key={index}>
                                        {index > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
                                                <div style={{ flex: 1, borderBottom: '1px solid var(--p-color-border)' }}></div>
                                                <div style={{ margin: '0 12px' }}>
                                                    <Badge tone={formData.conditionLogic === 'OR' ? undefined : 'info'}>
                                                        {formData.conditionLogic === 'OR' ? 'OR' : 'AND'}
                                                    </Badge>
                                                </div>
                                                <div style={{ flex: 1, borderBottom: '1px solid var(--p-color-border)' }}></div>
                                            </div>
                                        )}
                                        <InlineStack gap="200" align="start">
                                            <div style={{ flex: 1 }}>
                                                <Select
                                                    label="Field"
                                                    labelHidden
                                                    options={fieldOptions}
                                                    value={condition.field}
                                                    onChange={(val) => updateCondition(index, "field", val)}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <Select
                                                    label="Operator"
                                                    labelHidden
                                                    options={operatorOptions}
                                                    value={condition.operator}
                                                    onChange={(val) => updateCondition(index, "operator", val)}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <TextField
                                                    label="Value"
                                                    labelHidden
                                                    value={condition.value}
                                                    onChange={(val) => updateCondition(index, "value", val)}
                                                    autoComplete="off"
                                                />
                                            </div>
                                            <Button icon={DeleteIcon} onClick={() => removeCondition(index)} tone="critical" variant="plain" />
                                        </InlineStack>
                                    </div>
                                ))}
                                <Button onClick={addCondition} variant="plain" icon={PlusIcon}>Add Condition</Button>

                                <TextField
                                    label="Tags to Apply (comma separated)"
                                    value={formData.tags.join(", ")}
                                    onChange={(val) => setFormData({ ...formData, tags: val.split(",").map(t => t.trim()) })}
                                    autoComplete="off"
                                    helpText="Tags will be added when conditions match, and REMOVED when they don't."
                                />
                            </FormLayout>
                        </Box>
                    </BlockStack>
                </Modal.Section>
            </Modal>

            <Modal
                open={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Delete Rule"
                primaryAction={{
                    content: "Delete",
                    onAction: confirmDelete,
                    destructive: true,
                    loading: isLoading,
                }}
                secondaryActions={[{ content: "Cancel", onAction: () => setDeleteId(null) }]}
            >
                <Modal.Section>
                    <Text as="p">Are you sure you want to delete this rule? This action cannot be undone.</Text>
                </Modal.Section>
            </Modal>
        </Page>
    );
}

import { useState, useEffect } from "react";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData, useFetcher } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    ResourceList,
    ResourceItem,
    Text,
    Badge,
    Button,
    Modal,
    TextField,
    BlockStack,
    InlineStack,
    Select,
    Banner,
    Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { TaggerService } from "../services/tagger.service";
// We need to ensure TaggerService has countActiveRules. 
// Since I cannot see TaggerService file content, I will assume I need to add it or use existing methods.
// Wait, I should check TaggerService first. 
// But I am in app.tagger.tsx. 
// I will assume TaggerService needs this method and I should add it to TaggerService file if it doesn't exist.
// But I am editing app.tagger.tsx here.
// I will proceed with editing app.tagger.tsx and then check/update TaggerService.
import { useAppBridge } from "@shopify/app-bridge-react";

// --- Backend Logic ---

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const rules = await TaggerService.getRules(session.shop);

    const { UsageService } = await import("~/services/usage.service");
    const plan = await UsageService.getPlanType(session.shop);
    const isFreePlan = plan === "Free";

    let isLimitReached = false;
    if (isFreePlan) {
        const activeCount = await TaggerService.countActiveRules(session.shop);
        isLimitReached = activeCount >= 5;
    }

    return json({ rules, isFreePlan, isLimitReached });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "saveRule") {
        const ruleId = formData.get("ruleId") as string;
        const isEnabled = formData.get("isEnabled") === "true";
        const params = JSON.parse(formData.get("params") as string);

        if (isEnabled) {
            const { UsageService } = await import("~/services/usage.service");
            const plan = await UsageService.getPlanType(session.shop);
            if (plan === "Free") {
                const activeCount = await TaggerService.countActiveRules(session.shop);
                // If we are enabling a rule (and it wasn't already enabled, although countActiveRules might include it if we don't be careful. 
                // Let's assume countActiveRules counts currently active ones. 
                // If we are enabling a NEW one, we need to check if count < 5.
                // However, TaggerService.saveRule updates the rule. 
                // If the rule was ALREADY active, we shouldn't block updates.
                // But here we are just checking if we CAN enable it.
                // Let's check if the rule is ALREADY active to avoid double counting or blocking updates.
                const existingRule = (await TaggerService.getRules(session.shop)).find((r: any) => r.ruleId === ruleId);
                if (!existingRule?.isEnabled && activeCount >= 5) {
                    return json({ status: "error", message: "Free plan limit reached. Upgrade to Pro to enable more rules." }, { status: 403 });
                }
            }
        }

        await TaggerService.saveRule(session.shop, ruleId, isEnabled, params);
    }

    return json({ status: "success" });
};

// --- Frontend Logic ---

const RECIPES = [
    {
        id: "vip_customer",
        name: "VIP Customer",
        description: "Tag customer if Total Spend > Amount",
        paramFields: [{ key: "amount", label: "Minimum Spend ($)", type: "number" }],
    },
    {
        id: "whale_order",
        name: "Whale Order",
        description: "Tag order if Order Value > Amount",
        paramFields: [{ key: "amount", label: "Minimum Order Value ($)", type: "number" }],
    },
    {
        id: "international_order",
        name: "International Order",
        description: "Tag order if Shipping Country != Shop Country",
        paramFields: [], // No params needed
    },
    {
        id: "returning_customer",
        name: "Returning Customer",
        description: "Tag order if Order Count > 1",
        paramFields: [],
    },
    {
        id: "specific_product",
        name: "Specific Product",
        description: "Tag order if it contains products from a collection",
        paramFields: [{ key: "collectionId", label: "Collection ID", type: "text" }], // Simplified for MVP
    },
];

export default function SmartTagger() {
    const { rules, isLimitReached } = useLoaderData<typeof loader>();
    const fetcher = useFetcher();
    const actionData = useActionData<typeof action>();
    const shopify = useAppBridge();
    const submit = useSubmit();
    const nav = useNavigation();
    const isLoading = nav.state === "submitting";

    const [selectedRule, setSelectedRule] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [formParams, setFormParams] = useState<any>({});

    useEffect(() => {
        if (actionData?.status === "success" || (fetcher.data as any)?.status === "success") {
            shopify.toast.show("Rule updated successfully");
        } else if ((actionData as any)?.status === "error" || (fetcher.data as any)?.status === "error") {
            shopify.toast.show((actionData as any)?.message || (fetcher.data as any)?.message || "An error occurred", { isError: true });
        }
    }, [actionData, fetcher.data, shopify]);

    const handleConfigure = (recipe: any) => {
        const existingRule = rules.find((r: any) => r.ruleId === recipe.id);
        setSelectedRule(recipe);
        setFormParams(existingRule?.params || {});
        setModalOpen(true);
    };

    // Check if a specific rule is being toggled
    const isToggling = (ruleId: string) => {
        return fetcher.state === "submitting" && fetcher.formData?.get("ruleId") === ruleId;
    };

    const handleToggle = (recipe: any, currentValue: boolean) => {
        // event.stopPropagation() is handled by the wrapper div

        // If turning ON and the rule has parameters, open modal instead
        if (!currentValue && recipe.paramFields.length > 0) {
            handleConfigure(recipe);
            return;
        }

        const existingRule = rules.find((r: any) => r.ruleId === recipe.id);
        const params = existingRule?.params || {};

        fetcher.submit(
            {
                actionType: "saveRule",
                ruleId: recipe.id,
                isEnabled: (!currentValue).toString(),
                params: JSON.stringify(params),
            },
            { method: "post" }
        );
    };

    const handleSaveParams = () => {
        if (!selectedRule) return;

        fetcher.submit(
            {
                actionType: "saveRule",
                ruleId: selectedRule.id,
                isEnabled: "true",
                params: JSON.stringify(formParams),
            },
            { method: "post" }
        );
        setModalOpen(false);
    };

    return (
        <Page title="Smart Tagger" subtitle="Automate your tagging workflows">
            <Layout>
                <Layout.Section>
                    {isLimitReached && (
                        <Box paddingBlockEnd="400">
                            <Banner tone="warning" title="Free Plan Limit Reached">
                                <Text as="p">
                                    You have reached the limit of 5 active rules on the Free plan.
                                    <Button variant="plain" url="/app/billing">Upgrade to Pro</Button> to enable more rules.
                                </Text>
                            </Banner>
                        </Box>
                    )}
                    <Card padding="0">
                        <ResourceList
                            resourceName={{ singular: "rule", plural: "rules" }}
                            items={RECIPES}
                            renderItem={(item) => {
                                const rule = rules.find((r: any) => r.ruleId === item.id);
                                const isEnabled = rule?.isEnabled || false;
                                const loading = isToggling(item.id);

                                return (
                                    <ResourceItem
                                        id={item.id}
                                        accessibilityLabel={`View details for ${item.name}`}
                                        onClick={() => handleConfigure(item)}
                                    >
                                        <BlockStack gap="200">
                                            <InlineStack align="space-between" blockAlign="center">
                                                <Text variant="headingMd" as="h3">
                                                    {item.name}
                                                </Text>
                                                <InlineStack gap="200">
                                                    <Badge tone={isEnabled ? "success" : "info"}>
                                                        {isEnabled ? "Active" : "Inactive"}
                                                    </Badge>
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant={isEnabled ? "primary" : "secondary"}
                                                            onClick={() => handleToggle(item, isEnabled)}
                                                            loading={loading}
                                                        >
                                                            {isEnabled ? "Turn Off" : "Turn On"}
                                                        </Button>
                                                    </div>
                                                </InlineStack>
                                            </InlineStack>
                                            <Text variant="bodyMd" as="p" tone="subdued">
                                                {item.description}
                                            </Text>
                                            {rule?.params && Object.keys(rule.params).length > 0 && (
                                                <BlockStack gap="100">
                                                    {item.paramFields.map((field: any) => {
                                                        const value = rule.params[field.key];
                                                        if (!value) return null;
                                                        return (
                                                            <Text key={field.key} variant="bodySm" tone="subdued" as="p">
                                                                • {field.label}: <Text as="span" fontWeight="semibold">{value}</Text>
                                                            </Text>
                                                        );
                                                    })}
                                                </BlockStack>
                                            )}
                                        </BlockStack>
                                    </ResourceItem>
                                );
                            }}
                        />
                    </Card>
                </Layout.Section>
            </Layout>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={`Configure ${selectedRule?.name}`}
                primaryAction={{
                    content: "Save & Enable",
                    onAction: handleSaveParams,
                    loading: isLoading,
                }}
                secondaryActions={[
                    {
                        content: "Cancel",
                        onAction: () => setModalOpen(false),
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        <Text as="p">Configure the parameters for this rule.</Text>
                        {selectedRule?.paramFields.map((field: any) => (
                            <TextField
                                key={field.key}
                                label={field.label}
                                type={field.type}
                                value={formParams[field.key] || ""}
                                onChange={(value) => setFormParams({ ...formParams, [field.key]: value })}
                                autoComplete="off"
                            />
                        ))}
                        {selectedRule?.paramFields.length === 0 && (
                            <Text as="p" tone="subdued">No additional parameters required for this rule.</Text>
                        )}
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}

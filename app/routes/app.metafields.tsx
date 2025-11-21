import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useFetcher, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
    Banner,
    Box,
    Button,
    Card,
    EmptyState,
    Layout,
    Modal,
    Page,
    ResourceList,
    Text
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { DeleteConfirmModal } from "~/components/Tagger/DeleteConfirmModal";
import { MetafieldFormModal } from "~/components/Metafield/MetafieldFormModal";
import { MetafieldListItem } from "~/components/Metafield/MetafieldListItem";
import { useMetafieldForm } from "~/hooks/useMetafieldForm";
import type { MetafieldRule } from "~/types/metafield.types";
import { MetafieldService } from "../services/metafield.service";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const rules = await MetafieldService.getRules(session.shop);

    const { UsageService } = await import("~/services/usage.service");
    const plan = await UsageService.getPlanType(session.shop);
    const isFreePlan = plan === "Free";

    let isLimitReached = false;
    if (isFreePlan) {
        const count = await MetafieldService.countRules(session.shop);
        isLimitReached = count >= 5;
    }

    return json({ rules, isFreePlan, isLimitReached });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "saveRule") {
        const ruleData = JSON.parse(formData.get("rule") as string);

        if (ruleData._id) {
            try {
                await MetafieldService.updateRule(ruleData._id, ruleData);
            } catch (error) {
                return json({ status: "error", message: (error as Error).message }, { status: 400 });
            }
        } else {
            const { UsageService } = await import("~/services/usage.service");
            const plan = await UsageService.getPlanType(session.shop);
            if (plan === "Free") {
                const count = await MetafieldService.countRules(session.shop);
                if (count >= 5) {
                    return json({ status: "error", message: "Free plan limit reached. Upgrade to Pro to create more rules." }, { status: 403 });
                }
            }
            try {
                await MetafieldService.createRule(session.shop, ruleData);
            } catch (error) {
                return json({ status: "error", message: (error as Error).message }, { status: 400 });
            }
        }
    } else if (actionType === "deleteRule") {
        const id = formData.get("id") as string;
        await MetafieldService.deleteRule(id);
    } else if (actionType === "toggleRule") {
        const id = formData.get("id") as string;
        const isEnabled = formData.get("isEnabled") === "true";
        await MetafieldService.toggleRule(id, isEnabled);
    } else if (actionType === "generateRule") {
        const prompt = formData.get("prompt") as string;
        const resourceType = formData.get("resourceType") as string;
        const { AIService } = await import("~/services/ai.service");
        try {
            const rule = await AIService.generateMetafieldRuleFromPrompt(prompt, resourceType);
            return json({ status: "success", rule });
        } catch (error) {
            return json({ status: "error", message: "Failed to generate rule" }, { status: 500 });
        }
    }

    return json({ status: "success" });
};

export default function MetafieldRules() {
    const { rules, isLimitReached } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const shopify = useAppBridge();
    const submit = useSubmit();
    const nav = useNavigation();
    const isSaving = nav.state === "submitting";
    const fetcher = useFetcher<any>();

    const [modalOpen, setModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [aiPrompt, setAiPrompt] = useState("");
    const [editingRule, setEditingRule] = useState<MetafieldRule | null>(null);

    const {
        formData,
        setFormData,
        errors,
        validateForm,
        initCreateForm,
        initEditForm
    } = useMetafieldForm();

    // Handle action responses
    useEffect(() => {
        if (actionData?.status === "success") {
            shopify.toast.show("Action completed successfully");
            setModalOpen(false);
        } else if ((actionData as any)?.status === "error") {
            shopify.toast.show((actionData as any)?.message || "An error occurred", { isError: true });
        }
    }, [actionData, shopify]);

    // Handle AI generation response
    useEffect(() => {
        if (fetcher.data?.status === "success" && fetcher.data?.rule) {
            const generatedRule = fetcher.data.rule;
            setFormData({
                ...formData,
                name: generatedRule.name || formData.name,
                conditions: generatedRule.conditions || [],
                conditionLogic: generatedRule.conditionLogic || 'AND',
                definition: {
                    ...formData.definition,
                    ...generatedRule.definition
                }
            });
            shopify.toast.show("Rule generated from AI!");
        } else if (fetcher.data?.status === "error") {
            shopify.toast.show("Failed to generate rule from AI", { isError: true });
        }
    }, [fetcher.data, shopify]);

    const handleOpenModal = (rule: MetafieldRule | null = null) => {
        setAiPrompt("");
        if (rule) {
            setEditingRule(rule);
            initEditForm(rule);
        } else {
            setEditingRule(null);
            initCreateForm();
        }
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!validateForm()) {
            return;
        }

        submit(
            {
                actionType: "saveRule",
                rule: JSON.stringify(formData),
            },
            { method: "post" }
        );
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = () => {
        if (deleteId) {
            submit({ actionType: "deleteRule", id: deleteId }, { method: "post" });
            setDeleteId(null);
        }
    };

    const handleToggle = (id: string, currentStatus: boolean) => {
        submit({ actionType: "toggleRule", id, isEnabled: (!currentStatus).toString() }, { method: "post" });
    };

    const handleGenerateAI = () => {
        if (!aiPrompt.trim()) return;
        fetcher.submit(
            { actionType: "generateRule", prompt: aiPrompt, resourceType: formData.resourceType },
            { method: "post" }
        );
    };

    return (
        <Page
            title="Metafield Automation"
            primaryAction={{ content: "Create Rule", onAction: () => handleOpenModal(), disabled: isLimitReached }}
            subtitle="Automatically set metafields based on conditions"
        >
            <Layout>
                <Layout.Section>
                    {isLimitReached && (
                        <Box paddingBlockEnd="400">
                            <Banner tone="warning" title="Free Plan Limit Reached">
                                <Text as="p">
                                    You have reached the limit of 5 automation rules on the Free plan.
                                    <Button variant="plain" url="/app/billing">Upgrade to Pro</Button> to create more rules.
                                </Text>
                            </Banner>
                        </Box>
                    )}
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
                                renderItem={(item: MetafieldRule) => (
                                    <MetafieldListItem
                                        rule={item}
                                        onEdit={handleOpenModal}
                                        onToggle={handleToggle}
                                        onDelete={handleDelete}
                                    />
                                )}
                            />
                        )}
                    </Card>
                </Layout.Section>
            </Layout>

            <MetafieldFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editingRule={editingRule}
                formData={formData}
                onFormDataChange={setFormData}
                errors={errors}
                onSave={handleSave}
                isLoading={isSaving}
                aiPrompt={aiPrompt}
                onAiPromptChange={setAiPrompt}
                onGenerateAI={handleGenerateAI}
                isGenerating={fetcher.state === "submitting"}
            />

            <DeleteConfirmModal
                open={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                isLoading={isSaving}
            />
        </Page>
    );
}
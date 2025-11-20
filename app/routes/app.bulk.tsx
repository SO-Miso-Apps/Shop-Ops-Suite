import { useEffect, useState } from "react";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData, Link } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    FormLayout,
    TextField,
    Select,
    Button,
    BlockStack,
    Banner,
    Text,
    Modal,
    List,
    InlineStack,
    ProgressBar,
    Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { bulkQueue } from "../queue.server";
import { dryRunTagOperation } from "../services/bulk.server";
import { UsageService } from "../services/usage.service";
import { getPlan } from "~/utils/get-plan";
import { generateJobId } from "~/utils/id-generator";

export const loader = async ({ request }: { request: Request }) => {
    const { session } = await authenticate.admin(request);

    // Get current usage stats
    const usage = await UsageService.getCurrentUsage(session.shop);
    const plan = await UsageService.getPlanType(session.shop);
    const limit = plan === "Free" ? 500 : null;

    return json({ usage, plan, limit });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType") as string;

    if (actionType === "dryRun") {
        const resourceType = formData.get("resourceType") as "products" | "customers" | "orders";
        const findTag = formData.get("findTag") as string;
        const replaceTag = formData.get("replaceTag") as string;
        const operation = formData.get("operation") as "replace" | "add" | "remove";

        try {
            const result = await dryRunTagOperation(
                session.shop,
                resourceType,
                operation,
                findTag,
                replaceTag
            );

            return json({
                status: "preview",
                count: result.count,
                preview: result.preview,
                resourceType,
                operation,
                findTag,
                replaceTag,
            });
        } catch (error) {
            return json({
                status: "error",
                message: (error as Error).message,
            });
        }
    }

    if (actionType === "execute") {
        const resourceType = formData.get("resourceType") as string;
        const findTag = formData.get("findTag") as string;
        const replaceTag = formData.get("replaceTag") as string;
        const operation = formData.get("operation") as string;
        const affectedCount = parseInt(formData.get("affectedCount") as string);

        // Check quota
        const quotaCheck = await UsageService.checkQuota(session.shop, affectedCount);
        if (!quotaCheck.allowed) {
            return json({
                status: "quota_exceeded",
                message: quotaCheck.message,
                current: quotaCheck.current,
                limit: quotaCheck.limit,
            });
        }

        // Push to Bulk Queue
        const jobId = generateJobId();
        await bulkQueue.add("bulk-tag-update", {
            shop: session.shop,
            resourceType,
            findTag,
            replaceTag,
            operation,
            jobId,
        });

        return json({ status: "queued", jobId });
    }

    return json({});
};

export default function BulkOperations() {
    const loaderData = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>() as {
        status?: "queued" | "preview" | "quota_exceeded" | "error";
        count?: number;
        preview?: Array<{ id: string; title?: string; tags: string[] }>;
        resourceType?: string;
        operation?: string;
        findTag?: string;
        replaceTag?: string;
        message?: string;
        current?: number;
        limit?: number | null;
    };
    const submit = useSubmit();
    const nav = useNavigation();
    const isLoading = nav.state === "submitting";
    const isQueued = actionData?.status === "queued";
    const isPreview = actionData?.status === "preview";
    const isQuotaExceeded = actionData?.status === "quota_exceeded";

    const [isShowUpgradeBanner, setShowUpgradeBanner] = useState(true);
    const [formState, setFormState] = useState({
        resourceType: "products",
        operation: "replace",
        findTag: "",
        replaceTag: "",
    });

    const [showPreviewModal, setShowPreviewModal] = useState(false);

    useEffect(() => {
        if (isPreview) {
            setShowPreviewModal(true);
        }
    }, [isPreview]);

    const handleDryRun = () => {
        const formDataObj = { ...formState, actionType: "dryRun" };
        submit(formDataObj, { method: "post" });
    };

    const handleExecute = () => {
        const formDataObj = {
            ...formState,
            actionType: "execute",
            affectedCount: actionData?.count?.toString() || "0",
        };
        submit(formDataObj, { method: "post" });
        setShowPreviewModal(false);
    };

    const usagePercent = loaderData.limit
        ? Math.round((loaderData.usage.count / loaderData.limit) * 100)
        : 0;

    return (
        <Page title="Bulk Operations">
            <Layout>
                <Layout.Section>
                    {/* Usage Banner */}
                    {loaderData.plan === "Free" && isShowUpgradeBanner && (
                        <Banner
                            tone={usagePercent >= 90 ? "warning" : "info"}
                            title={`${loaderData.plan} Plan - ${loaderData.usage.count}/${loaderData.limit} operations this month`}
                            onDismiss={() => setShowUpgradeBanner(false)}
                        >
                            <BlockStack gap="200">
                                <ProgressBar progress={usagePercent} size="small" />
                                {usagePercent >= 90 && (
                                    <Text as="p">
                                        You're running low on quota. Upgrade to Pro for unlimited operations. <Link to="/app/billing">Upgrade Now</Link>
                                    </Text>
                                )}
                            </BlockStack>
                        </Banner>
                    )}

                </Layout.Section>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h2">Find & Replace Tags</Text>
                            <Text as="p">
                                Mass update tags across your store. This operation runs in the background.
                            </Text>

                            {isQueued && (
                                <Banner tone="success" onDismiss={() => window.location.reload()}>
                                    Bulk operation started! Check Activity Log for progress.
                                </Banner>
                            )}

                            {isQuotaExceeded && (
                                <Banner tone="critical">
                                    <BlockStack gap="200">
                                        <Text as="p">{actionData.message}</Text>
                                        <Button url="/app/billing">Upgrade to Pro</Button>
                                    </BlockStack>
                                </Banner>
                            )}

                            {actionData?.status === "error" && (
                                <Banner tone="critical">
                                    Error: {actionData.message}
                                </Banner>
                            )}

                            <FormLayout>
                                <Select
                                    label="Resource"
                                    options={[
                                        { label: "Products", value: "products" },
                                        { label: "Customers", value: "customers" },
                                        { label: "Orders", value: "orders" },
                                    ]}
                                    value={formState.resourceType}
                                    onChange={(value) => setFormState({ ...formState, resourceType: value })}
                                />

                                <Select
                                    label="Operation"
                                    options={[
                                        { label: "Find & Replace", value: "replace" },
                                        { label: "Add Tag", value: "add" },
                                        { label: "Remove Tag", value: "remove" },
                                    ]}
                                    value={formState.operation}
                                    onChange={(value) => setFormState({ ...formState, operation: value })}
                                />

                                <TextField
                                    label={formState.operation === "add" ? "Tag to Add" : "Find Tag"}
                                    value={formState.findTag}
                                    onChange={(value) => setFormState({ ...formState, findTag: value })}
                                    autoComplete="off"
                                    helpText={formState.operation === "replace" ? "The tag you want to change." : undefined}
                                />

                                {formState.operation === "replace" && (
                                    <TextField
                                        label="Replace With"
                                        value={formState.replaceTag}
                                        onChange={(value) => setFormState({ ...formState, replaceTag: value })}
                                        autoComplete="off"
                                        helpText="The new tag value."
                                    />
                                )}

                                <Button
                                    variant="primary"
                                    onClick={handleDryRun}
                                    loading={isLoading}
                                    disabled={!formState.findTag}
                                >
                                    Preview Operation
                                </Button>
                            </FormLayout>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>

            {/* Preview Modal */}
            <Modal
                open={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                title="Confirm Bulk Operation"
                primaryAction={{
                    content: `Update ${actionData?.count || 0} Items`,
                    onAction: handleExecute,
                    loading: isLoading,
                }}
                secondaryActions={[
                    {
                        content: "Cancel",
                        onAction: () => setShowPreviewModal(false),
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        <Text as="p">
                            Found <strong>{actionData?.count || 0}</strong> {actionData?.resourceType} that will be affected by this operation.
                        </Text>

                        {actionData?.preview && actionData.preview.length > 0 && (
                            <BlockStack gap="200">
                                <Text variant="headingSm" as="h3">Preview (first 10 items):</Text>
                                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                                    <List>
                                        {actionData.preview.map((item: any) => (
                                            <List.Item key={item.id}>
                                                <strong>{item.title}</strong>
                                                <br />
                                                <Text as="span" tone="subdued">Tags: {item.tags.join(", ")}</Text>
                                            </List.Item>
                                        ))}
                                    </List>
                                </Box>
                            </BlockStack>
                        )}

                        <Banner tone="warning">
                            This operation will run in the background and cannot be undone (except via Backup/Revert for Pro users).
                        </Banner>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}

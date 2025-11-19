import { useState } from "react";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
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
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { bulkQueue } from "../queue.server";

export const loader = async ({ request }: { request: Request }) => {
    await authenticate.admin(request);
    return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();

    const resourceType = formData.get("resourceType") as string;
    const findTag = formData.get("findTag") as string;
    const replaceTag = formData.get("replaceTag") as string;
    const operation = formData.get("operation") as string; // 'replace', 'add', 'remove'

    // Push to Bulk Queue
    await bulkQueue.add("bulk-tag-update", {
        shop: session.shop,
        resourceType,
        findTag,
        replaceTag,
        operation,
    });

    return json({ status: "queued" });
};

export default function BulkOperations() {
    const actionData = useActionData<typeof action>();
    const submit = useSubmit();
    const nav = useNavigation();
    const isLoading = nav.state === "submitting";
    const isQueued = actionData?.status === "queued";

    const [formState, setFormState] = useState({
        resourceType: "products",
        operation: "replace",
        findTag: "",
        replaceTag: "",
    });

    const handleSubmit = () => {
        submit(formState, { method: "post" });
    };

    return (
        <Page title="Bulk Operations">
            <Layout>
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
                                    onClick={handleSubmit}
                                    loading={isLoading}
                                    disabled={!formState.findTag}
                                >
                                    Run Operation
                                </Button>
                            </FormLayout>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}

import { useState } from "react";
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
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { MetafieldConfig } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const configs = await MetafieldConfig.find({ shop: session.shop });
    return json({ configs });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "saveConfig") {
        const id = formData.get("id") as string;
        const resourceType = formData.get("resourceType") as string;
        const namespace = formData.get("namespace") as string;
        const key = formData.get("key") as string;
        const defaultValue = formData.get("defaultValue") as string;

        if (id) {
            await MetafieldConfig.findByIdAndUpdate(id, {
                resourceType,
                namespace,
                key,
                defaultValue,
                updatedAt: new Date(),
            });
        } else {
            await MetafieldConfig.create({
                shop: session.shop,
                resourceType,
                namespace,
                key,
                defaultValue,
            });
        }
    } else if (actionType === "deleteConfig") {
        const id = formData.get("id") as string;
        await MetafieldConfig.findByIdAndDelete(id);
    }

    return json({ status: "success" });
};

export default function Metafields() {
    const { configs } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const nav = useNavigation();
    const isSaving = nav.state === "submitting";

    const [modalOpen, setModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<any>(null);

    const [formState, setFormState] = useState({
        resourceType: "products",
        namespace: "custom",
        key: "",
        defaultValue: "",
    });

    const handleOpenModal = (config: any = null) => {
        if (config) {
            setEditingConfig(config);
            setFormState({
                resourceType: config.resourceType,
                namespace: config.namespace,
                key: config.key,
                defaultValue: config.defaultValue,
            });
        } else {
            setEditingConfig(null);
            setFormState({
                resourceType: "products",
                namespace: "custom",
                key: "",
                defaultValue: "",
            });
        }
        setModalOpen(true);
    };

    const handleSave = () => {
        submit(
            {
                actionType: "saveConfig",
                id: editingConfig?._id || "",
                ...formState,
            },
            { method: "post" }
        );
        setModalOpen(false);
    };

    const handleDelete = (id: string) => {
        submit({ actionType: "deleteConfig", id }, { method: "post" });
    };

    return (
        <Page
            title="Metafield Manager"
            primaryAction={{ content: "Add Default Value", onAction: () => handleOpenModal() }}
        >
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        {configs.length === 0 ? (
                            <EmptyState
                                heading="No default values configured"
                                action={{ content: "Add Default Value", onAction: () => handleOpenModal() }}
                                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                            >
                                <p>Automatically fill metafields when new products or customers are created.</p>
                            </EmptyState>
                        ) : (
                            <ResourceList
                                resourceName={{ singular: "config", plural: "configs" }}
                                items={configs}
                                renderItem={(item: any) => {
                                    return (
                                        <ResourceItem
                                            id={item._id}
                                            accessibilityLabel={`Edit ${item.key}`}
                                            onClick={() => handleOpenModal(item)}
                                            shortcutActions={[
                                                {
                                                    content: 'Delete',
                                                    onAction: () => handleDelete(item._id),
                                                },
                                            ]}
                                        >
                                            <InlineStack align="space-between" blockAlign="center">
                                                <BlockStack gap="200">
                                                    <Text variant="headingMd" as="h3">
                                                        {item.resourceType} / {item.namespace}.{item.key}
                                                    </Text>
                                                    <Text variant="bodyMd" as="p" tone="subdued">
                                                        Default: {item.defaultValue}
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
                title={editingConfig ? "Edit Configuration" : "New Default Value"}
                primaryAction={{
                    content: "Save",
                    onAction: handleSave,
                    loading: isSaving,
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
                        <Select
                            label="Resource Type"
                            options={[
                                { label: "Products", value: "products" },
                                { label: "Customers", value: "customers" },
                            ]}
                            value={formState.resourceType}
                            onChange={(value) => setFormState({ ...formState, resourceType: value })}
                        />
                        <TextField
                            label="Namespace"
                            value={formState.namespace}
                            onChange={(value) => setFormState({ ...formState, namespace: value })}
                            autoComplete="off"
                        />
                        <TextField
                            label="Key"
                            value={formState.key}
                            onChange={(value) => setFormState({ ...formState, key: value })}
                            autoComplete="off"
                        />
                        <TextField
                            label="Default Value"
                            value={formState.defaultValue}
                            onChange={(value) => setFormState({ ...formState, defaultValue: value })}
                            autoComplete="off"
                        />
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}

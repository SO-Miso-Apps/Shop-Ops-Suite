import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useActionData, useFetcher, useLoaderData, useNavigate, useNavigation, useSubmit } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
    Banner,
    BlockStack,
    Box,
    Button,
    Card,
    ChoiceList,
    EmptyState,
    InlineStack,
    Layout,
    Modal,
    Page,
    Pagination,
    Popover,
    ResourceList,
    Tabs,
    Text,
    TextField
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import { useEffect, useState } from "react";
import { DeleteConfirmModal } from "~/components/Tagger/DeleteConfirmModal";
import { MetafieldListItem } from "~/components/Metafield/MetafieldListItem";
import { useDebounce } from "~/hooks/useDebounce";
import type { MetafieldRule } from "~/types/metafield.types";
import { MetafieldService } from "../services/metafield.service";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const rules = await MetafieldService.getRules(session.shop);
    const libraryRules = await MetafieldService.getLibraryRules();

    const { UsageService } = await import("~/services/usage.service");
    const plan = await UsageService.getPlanType(session.shop);
    const isFreePlan = plan === "Free";

    let isLimitReached = false;
    if (isFreePlan) {
        const count = await MetafieldService.countRules(session.shop);
        isLimitReached = count >= 5;
    }

    return json({ rules, libraryRules, isFreePlan, isLimitReached });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "deleteRule") {
        const id = formData.get("id") as string;
        await MetafieldService.deleteRule(id);
    } else if (actionType === "toggleRule") {
        const id = formData.get("id") as string;
        const isEnabled = formData.get("isEnabled") === "true";
        await MetafieldService.toggleRule(id, isEnabled);
    } else if (actionType === "importRule") {
        const ruleData = JSON.parse(formData.get("ruleData") as string);
        delete ruleData._id;
        delete ruleData.id;
        delete ruleData.shop;
        delete ruleData.createdAt;
        delete ruleData.updatedAt;
        ruleData.isEnabled = false;
        await MetafieldService.createRule(session.shop, ruleData);
    }

    return json({ status: "success" });
};

export default function MetafieldRules() {
    const { rules, libraryRules, isLimitReached } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const shopify = useAppBridge();
    const submit = useSubmit();
    const nav = useNavigation();
    const navigate = useNavigate();
    const isSaving = nav.state === "submitting";
    const fetcher = useFetcher<any>();

    const [selectedTab, setSelectedTab] = useState(0);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Filter and pagination state
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [resourceFilter, setResourceFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [resourcePopoverActive, setResourcePopoverActive] = useState(false);
    const [statusPopoverActive, setStatusPopoverActive] = useState(false);
    const itemsPerPage = 20;

    // Handle AI generation response
    // Handle fetcher responses
    useEffect(() => {
        if (fetcher.data?.status === "success") {
            shopify.toast.show("Success");
        } else if (fetcher.data?.status === "error") {
            shopify.toast.show(fetcher.data.message || "An error occurred", { isError: true });
        }
    }, [fetcher.data, shopify]);

    const currentRules = selectedTab === 0 ? rules : libraryRules;

    // Filter rules based on search and filters
    const filteredRules = currentRules.filter((rule: MetafieldRule) => {
        // Search filter
        if (debouncedSearchQuery && !rule.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) {
            return false;
        }

        // Resource type filter
        if (resourceFilter.length > 0 && !resourceFilter.includes(rule.resourceType)) {
            return false;
        }

        // Status filter
        if (statusFilter.length > 0) {
            const isActive = rule.isEnabled;
            if (statusFilter.includes('active') && !isActive) return false;
            if (statusFilter.includes('inactive') && isActive) return false;
        }

        return true;
    });

    // Pagination
    const totalPages = Math.ceil(filteredRules.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRules = filteredRules.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, resourceFilter, statusFilter, selectedTab]);

    const handleOpenModal = (rule: MetafieldRule | null = null) => {
        if (rule) {
            if (rule._id) navigate(rule._id);
        } else {
            navigate("new");
        }
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

    const handleImport = (rule: MetafieldRule) => {
        submit(
            { actionType: "importRule", ruleData: JSON.stringify(rule) },
            { method: "post" }
        );
    };



    const tabs = [
        { id: "my-rules", content: "My Rules", accessibilityLabel: "My metafield rules" },
        { id: "library", content: "Library", accessibilityLabel: "Library metafield rules" },
    ];

    return (
        <Page
            title="Metafield Automation"
            subtitle="Automatically assign metafields to new resources"
            primaryAction={selectedTab === 0 ? { content: "Create Rule", onAction: () => handleOpenModal(), icon: PlusIcon } : undefined}
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
                        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                            <Box padding="400" borderBlockEndWidth="025" borderColor="border">
                                <BlockStack gap="300">
                                    <TextField
                                        label="Search rules"
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        placeholder="Search by rule name..."
                                        autoComplete="off"
                                        clearButton
                                        onClearButtonClick={() => setSearchQuery("")}
                                    />
                                    <InlineStack gap="200">
                                        <Popover
                                            active={resourcePopoverActive}
                                            activator={
                                                <Button
                                                    onClick={() => setResourcePopoverActive(!resourcePopoverActive)}
                                                    disclosure={resourcePopoverActive ? 'up' : 'down'}
                                                >
                                                    Resource: {resourceFilter.length > 0 ? resourceFilter.join(', ') : 'All'}
                                                </Button>
                                            }
                                            onClose={() => setResourcePopoverActive(false)}
                                        >
                                            <Box padding="400">
                                                <ChoiceList
                                                    title="Resource Type"
                                                    choices={[
                                                        { label: 'Products', value: 'products' },
                                                        { label: 'Customers', value: 'customers' },
                                                    ]}
                                                    selected={resourceFilter}
                                                    onChange={(value) => setResourceFilter(value)}
                                                    allowMultiple
                                                />
                                            </Box>
                                        </Popover>
                                        {selectedTab === 0 && (
                                            <Popover
                                                active={statusPopoverActive}
                                                activator={
                                                    <Button
                                                        onClick={() => setStatusPopoverActive(!statusPopoverActive)}
                                                        disclosure={statusPopoverActive ? 'up' : 'down'}
                                                    >
                                                        Status: {statusFilter.length > 0 ? statusFilter.join(', ') : 'All'}
                                                    </Button>
                                                }
                                                onClose={() => setStatusPopoverActive(false)}
                                            >
                                                <Box padding="400">
                                                    <ChoiceList
                                                        title="Status"
                                                        choices={[
                                                            { label: 'Active', value: 'active' },
                                                            { label: 'Inactive', value: 'inactive' },
                                                        ]}
                                                        selected={statusFilter}
                                                        onChange={(value) => setStatusFilter(value)}
                                                        allowMultiple
                                                    />
                                                </Box>
                                            </Popover>
                                        )}
                                        {(searchQuery || resourceFilter.length > 0 || statusFilter.length > 0) && (
                                            <Button
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    setResourceFilter([]);
                                                    setStatusFilter([]);
                                                }}
                                            >
                                                Clear filters
                                            </Button>
                                        )}
                                    </InlineStack>
                                </BlockStack>
                            </Box>
                            {currentRules.length === 0 ? (
                                <Box padding="400">
                                    <EmptyState
                                        heading={selectedTab === 0 ? "No automation rules yet" : "No library rules available"}
                                        action={selectedTab === 0 ? { content: "Create Rule", onAction: () => handleOpenModal() } : undefined}
                                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                    >
                                        <p>
                                            {selectedTab === 0
                                                ? "Create rules to automatically assign metafields when products or customers are created."
                                                : "Library rules are predefined examples you can import."}
                                        </p>
                                    </EmptyState>
                                </Box>
                            ) : (
                                <>
                                    <ResourceList
                                        resourceName={{ singular: "rule", plural: "rules" }}
                                        items={paginatedRules}
                                        emptyState={
                                            <EmptyState
                                                heading={filteredRules.length === 0 && (searchQuery || resourceFilter.length > 0 || statusFilter.length > 0) ? "No rules match your filters" : "No rules found"}
                                                action={selectedTab === 0 && filteredRules.length === 0 && !searchQuery && resourceFilter.length === 0 && statusFilter.length === 0 ? { content: "Create Rule", onAction: () => handleOpenModal() } : undefined}
                                                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                            >
                                                <p>{filteredRules.length === 0 && (searchQuery || resourceFilter.length > 0 || statusFilter.length > 0) ? "Try adjusting your search or filters." : "Create a rule to start automating metafields."}</p>
                                            </EmptyState>
                                        }
                                        renderItem={(item: MetafieldRule) => (
                                            <MetafieldListItem
                                                rule={item}
                                                selectedTab={selectedTab}
                                                limited={isLimitReached}
                                                onEdit={selectedTab === 0 ? handleOpenModal : undefined}
                                                onToggle={selectedTab === 0 ? handleToggle : undefined}
                                                onDelete={selectedTab === 0 ? handleDelete : undefined}
                                                onImport={selectedTab === 1 ? handleImport : undefined}
                                            />
                                        )}
                                    />
                                    {totalPages > 1 && (
                                        <Box padding="400" borderBlockStartWidth="025" borderColor="border">
                                            <InlineStack align="center">
                                                <Pagination
                                                    hasPrevious={currentPage > 1}
                                                    onPrevious={() => setCurrentPage(currentPage - 1)}
                                                    hasNext={currentPage < totalPages}
                                                    onNext={() => setCurrentPage(currentPage + 1)}
                                                    label={`Page ${currentPage} of ${totalPages} (${filteredRules.length} rules)`}
                                                />
                                            </InlineStack>
                                        </Box>
                                    )}
                                </>
                            )}
                        </Tabs>
                    </Card>
                </Layout.Section>
            </Layout>

            <Outlet />

            <DeleteConfirmModal
                open={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                isLoading={isSaving}
            />
        </Page>
    );
}
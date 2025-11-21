import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useActionData, useFetcher, useLoaderData, useNavigate, useNavigation } from "@remix-run/react";
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
	Page,
	Pagination,
	Popover,
	ResourceList,
	Tabs,
	Text,
	TextField
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import { useCallback, useEffect, useState } from "react";
import { DeleteConfirmModal } from "~/components/Tagger/DeleteConfirmModal";
import { RuleListItem } from "~/components/Tagger/RuleListItem";
import { useDebounce } from "~/hooks/useDebounce";
import type { TaggingRule } from "~/types/tagger.types";
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

	if (actionType === "deleteRule") {
		const id = formData.get("id") as string;
		await TaggerService.deleteRule(session.shop, id);
	} else if (actionType === "importRule") {
		const ruleData = JSON.parse(formData.get("ruleData") as string);
		delete ruleData._id;
		delete ruleData.shop;
		delete ruleData.createdAt;
		delete ruleData.updatedAt;
		ruleData.isEnabled = false;
		await TaggerService.saveRule(session.shop, ruleData);
	}

	return json({ status: "success" });
};

// --- Frontend Logic ---

export default function SmartTagger() {
	const { rules, libraryRules, isLimitReached } = useLoaderData<typeof loader>();
	const fetcher = useFetcher();
	const actionData = useActionData<typeof action>();
	const shopify = useAppBridge();
	const navigate = useNavigate();
	const nav = useNavigation();
	const isLoading = nav.state === "submitting";

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

	// Handle action/fetcher responses
	useEffect(() => {
		if (actionData?.status === "success" || (fetcher.data as any)?.status === "success") {
			if ((actionData as any)?.status === "success") {
				shopify.toast.show("Success");
			}
		} else if ((actionData as any)?.status === "error" || (fetcher.data as any)?.status === "error") {
			shopify.toast.show((actionData as any)?.message || (fetcher.data as any)?.message || "An error occurred", { isError: true });
		}
	}, [actionData, fetcher.data, shopify]);

	const handleTabChange = useCallback((selectedTabIndex: number) => setSelectedTab(selectedTabIndex), []);

	const tabs = [
		{ id: "my-rules", content: "My Rules", accessibilityLabel: "My tagging rules" },
		{ id: "library", content: "Library", accessibilityLabel: "Library tagging rules" },
	];

	const currentRules = selectedTab === 0 ? rules : libraryRules;

	// Filter rules based on search and filters
	const filteredRules = currentRules.filter((rule: TaggingRule) => {
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

	const handleEdit = (rule: TaggingRule) => {
		if (rule._id) navigate(rule._id);
	};

	const handleCreate = () => {
		navigate("new");
	};

	const handleToggle = (rule: TaggingRule) => {
		const newItem = { ...rule, isEnabled: !rule.isEnabled };
		fetcher.submit({ actionType: "saveRule", ruleData: JSON.stringify(newItem) }, { method: "post" });
	};

	const handleDelete = (id: string) => {
		setDeleteId(id);
	};

	const confirmDelete = () => {
		if (deleteId) {
			fetcher.submit({ actionType: "deleteRule", id: deleteId }, { method: "post" });
			setDeleteId(null);
		}
	};

	const handleImport = (rule: TaggingRule) => {
		fetcher.submit({ actionType: "importRule", ruleData: JSON.stringify(rule) }, { method: "post" });
	};



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
														{ label: 'Orders', value: 'orders' },
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
							<ResourceList
								resourceName={{ singular: "rule", plural: "rules" }}
								items={paginatedRules}
								emptyState={
									<EmptyState
										heading={filteredRules.length === 0 && (searchQuery || resourceFilter.length > 0 || statusFilter.length > 0) ? "No rules match your filters" : "No rules found"}
										action={selectedTab === 0 && filteredRules.length === 0 && !searchQuery && resourceFilter.length === 0 && statusFilter.length === 0 ? { content: "Create Rule", onAction: handleCreate } : undefined}
										image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
									>
										<p>{filteredRules.length === 0 && (searchQuery || resourceFilter.length > 0 || statusFilter.length > 0) ? "Try adjusting your search or filters." : "Create a rule to start automating tags."}</p>
									</EmptyState>
								}
								renderItem={(item: TaggingRule) => (
									<RuleListItem
										rule={item}
										selectedTab={selectedTab}
										limited={isLimitReached}
										onEdit={handleEdit}
										onToggle={handleToggle}
										onDelete={handleDelete}
										onImport={handleImport}
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
						</Card>
					</Tabs>
				</Layout.Section>
			</Layout>

			<Outlet />

			<DeleteConfirmModal
				open={!!deleteId}
				onClose={() => setDeleteId(null)}
				onConfirm={confirmDelete}
				isLoading={isLoading}
			/>
		</Page>
	);
}

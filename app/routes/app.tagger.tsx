import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useFetcher, useLoaderData, useNavigation } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
	Banner,
	Box,
	Card,
	EmptyState,
	Layout,
	Page,
	ResourceList,
	Tabs,
	Text
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import { useCallback, useEffect, useState } from "react";
import { DeleteConfirmModal } from "~/components/Tagger/DeleteConfirmModal";
import { RuleFormModal } from "~/components/Tagger/RuleFormModal";
import { RuleListItem } from "~/components/Tagger/RuleListItem";
import { useTaggerForm } from "~/hooks/useTaggerForm";
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

	if (actionType === "saveRule") {
		const ruleData = JSON.parse(formData.get("ruleData") as string);

		// Check limits if enabling or creating new
		if (ruleData.isEnabled) {
			const { UsageService } = await import("~/services/usage.service");
			const plan = await UsageService.getPlanType(session.shop);
			if (plan === "Free") {
				const activeCount = await TaggerService.countActiveRules(session.shop);
				const isNew = !ruleData._id;

				if (activeCount >= 5) {
					if (isNew) {
						return json({ status: "error", message: "Free plan limit reached." }, { status: 403 });
					}
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
		delete ruleData._id;
		delete ruleData.shop;
		delete ruleData.createdAt;
		delete ruleData.updatedAt;
		ruleData.isEnabled = false;
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
	const [editingRule, setEditingRule] = useState<TaggingRule | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const {
		formData,
		setFormData,
		errors,
		validateForm,
		initCreateForm,
		initEditForm
	} = useTaggerForm();

	// Handle action/fetcher responses
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
				shopify.toast.show("Rule generated!");
			} else {
				shopify.toast.show("Success");
				setModalOpen(false);
			}
		} else if ((actionData as any)?.status === "error" || (fetcher.data as any)?.status === "error") {
			shopify.toast.show((actionData as any)?.message || (fetcher.data as any)?.message || "An error occurred", { isError: true });
		}
	}, [actionData, fetcher.data, shopify]);

	const handleTabChange = useCallback((selectedTabIndex: number) => setSelectedTab(selectedTabIndex), []);

	const tabs = [
		{ id: "my-rules", content: "My Rules" },
		{ id: "library", content: "Library" },
	];

	const handleEdit = (rule: TaggingRule) => {
		setEditingRule(rule);
		initEditForm(rule);
		setModalOpen(true);
	};

	const handleCreate = () => {
		setEditingRule(null);
		initCreateForm();
		setModalOpen(true);
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

	const handleSave = () => {
		if (!validateForm()) {
			return;
		}
		fetcher.submit({ actionType: "saveRule", ruleData: JSON.stringify(formData) }, { method: "post" });
	};

	const handleGenerateAI = () => {
		fetcher.submit({ actionType: "generateRule", prompt: aiPrompt, resourceType: formData.resourceType }, { method: "post" });
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
								renderItem={(item: TaggingRule) => (
									<RuleListItem
										rule={item}
										selectedTab={selectedTab}
										onEdit={handleEdit}
										onToggle={handleToggle}
										onDelete={handleDelete}
										onImport={handleImport}
									/>
								)}
							/>
						</Card>
					</Tabs>
				</Layout.Section>
			</Layout>

			<RuleFormModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				editingRule={editingRule}
				formData={formData}
				onFormDataChange={setFormData}
				errors={errors}
				onSave={handleSave}
				isLoading={isLoading}
				aiPrompt={aiPrompt}
				onAiPromptChange={setAiPrompt}
				onGenerateAI={handleGenerateAI}
				isGenerating={fetcher.state === "submitting"}
			/>

			<DeleteConfirmModal
				open={!!deleteId}
				onClose={() => setDeleteId(null)}
				onConfirm={confirmDelete}
				isLoading={isLoading}
			/>
		</Page>
	);
}

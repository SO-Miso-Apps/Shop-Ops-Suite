import { json, type ActionFunctionArgs } from "@remix-run/node";
import { Link, useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
	Banner,
	BlockStack,
	Box,
	Button,
	Card,
	Layout,
	Page,
	ProgressBar,
	Text
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { BulkOperationForm } from "~/components/Bulk/BulkOperationForm";
import { BulkPreviewModal } from "~/components/Bulk/BulkPreviewModal";
import { useBulkForm } from "~/hooks/useBulkForm";
import type { BulkActionData } from "~/types/bulk.types";
import { generateJobId } from "~/utils/id-generator";
import { bulkQueue } from "../queue.server";
import { ActivityService } from "../services/activity.service";
import { dryRunTagOperation } from "../services/bulk.server";
import { UsageService } from "../services/usage.service";
import { authenticate } from "../shopify.server";
import {
	ArchiveIcon,
	DeleteIcon,
	DuplicateIcon,
	EditIcon,
	MagicIcon,
	PlusIcon,
	ReplaceIcon
} from "@shopify/polaris-icons";

export const loader = async ({ request }: { request: Request }) => {
	const { session, admin } = await authenticate.admin(request);

	const usage = await UsageService.getCurrentUsage(session.shop);
	const plan = await UsageService.getPlanType(session.shop);
	const limit = plan === "Free" ? 500 : null;

	const tagsSet = new Set<string>();
	try {
		const response = await admin.graphql(`
			query {
				products(first: 250) {
					edges {
						node {
							tags
						}
					}
				}
			}
		`);
		const data = await response.json();
		data.data.products.edges.forEach((edge: any) => {
			edge.node.tags.forEach((tag: string) => tagsSet.add(tag));
		});
	} catch (error) {
		console.error("Failed to fetch tags:", error);
	}

	const existingTags = Array.from(tagsSet).sort();

	// Fetch recent bulk operations
	const recentOperations = await ActivityService.getLogs(session.shop, 5, { category: "Bulk Operations" });

	return json({ usage, plan, limit, existingTags, recentOperations: recentOperations.logs });
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

		const quotaCheck = await UsageService.checkQuota(session.shop, affectedCount);
		if (!quotaCheck.allowed) {
			return json({
				status: "quota_exceeded",
				message: quotaCheck.message,
				current: quotaCheck.current,
				limit: quotaCheck.limit,
			});
		}

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
	const actionData = useActionData<typeof action>() as BulkActionData;
	const submit = useSubmit();
	const nav = useNavigation();
	const isLoading = nav.state === "submitting";
	const isQueued = actionData?.status === "queued";
	const isPreview = actionData?.status === "preview";
	const isQuotaExceeded = actionData?.status === "quota_exceeded";

	const [isShowUpgradeBanner, setShowUpgradeBanner] = useState(true);

	const {
		formState,
		updateFormState,
		showPreviewModal,
		openPreviewModal,
		closePreviewModal,
		findTagInputValue,
		setFindTagInputValue,
		findTagOptions,
		setFindTagOptions
	} = useBulkForm();

	useEffect(() => {
		if (isPreview) {
			openPreviewModal();
		}
	}, [isPreview, openPreviewModal]);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (findTagInputValue === "") {
				setFindTagOptions(
					loaderData.existingTags.slice(0, 10).map((tag: string) => ({
						value: tag,
						label: tag,
					}))
				);
			} else {
				const filterRegex = new RegExp(findTagInputValue, "i");
				const resultOptions = loaderData.existingTags
					.filter((tag: string) => tag.match(filterRegex))
					.slice(0, 10)
					.map((tag: string) => ({
						value: tag,
						label: tag,
					}));
				setFindTagOptions(resultOptions);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [findTagInputValue, loaderData.existingTags, setFindTagOptions]);

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
		closePreviewModal();
	};

	const handleSelectTag = (selected: string[]) => {
		const selectedTag = selected[0];
		updateFormState({ findTag: selectedTag });
		setFindTagInputValue(selectedTag);
	};

	const usagePercent = loaderData.limit
		? Math.round((loaderData.usage.count / loaderData.limit) * 100)
		: 0;

	const quickActions = [
		{
			title: "Find & Replace",
			description: "Replace a tag with another one.",
			icon: ReplaceIcon,
			action: () => {
				updateFormState({ operation: "replace" });
				// Scroll to form
				const formElement = document.getElementById("bulk-form");
				if (formElement) formElement.scrollIntoView({ behavior: "smooth" });
			}
		},
		{
			title: "Add Tag",
			description: "Add a new tag to resources.",
			icon: PlusIcon,
			action: () => {
				updateFormState({ operation: "add" });
				const formElement = document.getElementById("bulk-form");
				if (formElement) formElement.scrollIntoView({ behavior: "smooth" });
			}
		},
		{
			title: "Remove Tag",
			description: "Remove a specific tag.",
			icon: DeleteIcon,
			action: () => {
				updateFormState({ operation: "remove" });
				const formElement = document.getElementById("bulk-form");
				if (formElement) formElement.scrollIntoView({ behavior: "smooth" });
			}
		}
	];

	return (
		<Page
			title="Bulk Operations"
			subtitle="Manage tags across your entire store in seconds."
			primaryAction={{ content: "View Activity Log", url: "/app/activity" }}
		>
			<Layout>
				<Layout.Section>
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

				{/* Quick Actions */}
				<Layout.Section>
					<BlockStack gap="400">
						<Text variant="headingMd" as="h2">Quick Actions</Text>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
							{quickActions.map((action, index) => (
								<Box key={index} background="bg-surface" padding="400" borderRadius="200" shadow="200">
									<BlockStack gap="400">
										<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
											<Box background="bg-surface-secondary" padding="200" borderRadius="200">
												<div style={{ width: 20, height: 20 }}>
													<action.icon />
												</div>
											</Box>
											<Text variant="headingSm" as="h3">{action.title}</Text>
										</div>
										<Text variant="bodyMd" as="p" tone="subdued">{action.description}</Text>
										<Button onClick={action.action} variant="plain" textAlign="left">Use this template →</Button>
									</BlockStack>
								</Box>
							))}
						</div>
					</BlockStack>
				</Layout.Section>

				<Layout.Section>
					<div id="bulk-form">
						<BulkOperationForm
							formState={formState}
							onFormChange={updateFormState}
							onPreview={handleDryRun}
							isLoading={isLoading}
							isQueued={isQueued}
							isQuotaExceeded={isQuotaExceeded}
							actionData={actionData}
							findTagInputValue={findTagInputValue}
							onFindTagInputChange={setFindTagInputValue}
							findTagOptions={findTagOptions}
							onSelectTag={handleSelectTag}
						/>
					</div>
				</Layout.Section>

				{/* Recent Activity */}
				<Layout.Section>
					<Card>
						<BlockStack gap="400">
							<Text variant="headingMd" as="h2">Recent Bulk Operations</Text>
							{loaderData.recentOperations && loaderData.recentOperations.length > 0 ? (
								<BlockStack gap="400">
									{loaderData.recentOperations.map((op: any) => (
										<Box key={op.id} paddingBlockEnd="200" borderBlockEndWidth="025" borderColor="border">
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
												<BlockStack gap="100">
													<Text variant="bodyMd" as="span" fontWeight="semibold">{op.action}</Text>
													<Text variant="bodySm" as="span" tone="subdued">
														{new Date(op.timestamp).toLocaleString()}
													</Text>
												</BlockStack>
												<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
													<Text variant="bodySm" as="span" tone={op.status === "Success" ? "success" : op.status === "Failed" ? "critical" : "subdued"}>
														{op.status}
													</Text>
												</div>
											</div>
										</Box>
									))}
								</BlockStack>
							) : (
								<Text variant="bodyMd" as="p" tone="subdued">No recent operations found.</Text>
							)}
						</BlockStack>
					</Card>
				</Layout.Section>
			</Layout>

			<BulkPreviewModal
				open={showPreviewModal}
				onClose={closePreviewModal}
				onConfirm={handleExecute}
				isLoading={isLoading}
				actionData={actionData}
			/>
		</Page>
	);
}

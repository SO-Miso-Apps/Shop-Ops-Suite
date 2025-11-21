import { json, type ActionFunctionArgs } from "@remix-run/node";
import { Link, useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
	Banner,
	BlockStack,
	Box,
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
import { dryRunTagOperation } from "../services/bulk.server";
import { UsageService } from "../services/usage.service";
import { authenticate } from "../shopify.server";

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

	return json({ usage, plan, limit, existingTags });
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

	return (
		<Page title="Bulk Operations">
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
				<Layout.Section>
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

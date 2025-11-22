import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSearchParams, useSubmit } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
	Banner,
	BlockStack,
	Box,
	Button,
	Card,
	IndexFilters,
	IndexTable,
	InlineStack,
	Layout,
	Page,
	Text,
	useSetIndexFiltersMode
} from "@shopify/polaris";
import {
	AlertCircleIcon,
	ArrowUpIcon,
	MagicIcon,
	MoneyFilledIcon
} from "@shopify/polaris-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityService } from "~/services/activity.service";
import { CogsService } from "~/services/cogs.service";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const { admin, session } = await authenticate.admin(request);
	const { UsageService } = await import("~/services/usage.service");
	const plan = await UsageService.getPlanType(session.shop);
	const isFreePlan = plan === "Free";

	const url = new URL(request.url);
	const cursor = url.searchParams.get("page_info");
	const direction = url.searchParams.get("direction") || "next";
	const filter = url.searchParams.get("filter") || undefined;
	const query = url.searchParams.get("query") || undefined;

	let paginationArgs;
	if (isFreePlan) {
		// Free plan: Always fetch first 50, ignore cursor
		paginationArgs = { first: 50 };
	} else {
		paginationArgs = direction === "previous"
			? { last: 20, before: cursor }
			: { first: 20, after: cursor };
	}

	const { products, pageInfo, stats } = await CogsService.getProductsWithCosts(admin, paginationArgs, filter, query);

	// Fetch shop currency
	const { ShopConfig } = await import("~/models/ShopConfig");
	const shopConfig = await ShopConfig.findOne({ shop: session.shop });
	const currencyCode = shopConfig?.currencyCode || "USD";

	// Fetch recent COGS updates
	const recentActivities = await ActivityService.getLogs(session.shop, 5, { category: "Metafields", search: "Cost" });



	return json({
		products,
		pageInfo: isFreePlan ? { hasNextPage: false, hasPreviousPage: false } : pageInfo,
		currencyCode,
		isFreePlan,
		recentActivities: recentActivities.logs,
		stats
	});
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const { admin, session } = await authenticate.admin(request);
	const formData = await request.formData();
	const actionType = formData.get("actionType");

	if (actionType === "bulkUpdate") {
		const updates = JSON.parse(formData.get("updates") as string);
		const errors = await CogsService.updateProductCosts(admin, session.shop, updates);

		if (errors.length > 0) {
			return json({ status: "error", errors }, { status: 422 });
		}

		return json({ status: "success" });
	}

	return json({ status: "ignored" });
};

import { BulkApplyModal } from "../components/Cogs/BulkApplyModal";
import { ProductRow, type ProductData } from "../components/Cogs/ProductRow";

export default function COGS() {
	const { products: initialProducts, pageInfo, currencyCode, isFreePlan, recentActivities, stats } = useLoaderData<typeof loader>();
	const actionData = useActionData<{ status: string, errors?: string[] }>();
	const shopify = useAppBridge();
	const [searchParams, setSearchParams] = useSearchParams();
	const submit = useSubmit();
	const nav = useNavigation();
	const isSaving = nav.state === "submitting";

	// Local state for optimistic updates
	const [products, setProducts] = useState<ProductData[]>(initialProducts);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [queryValue, setQueryValue] = useState(searchParams.get("query") || "");
	const { mode, setMode } = useSetIndexFiltersMode();

	const handleQueryChange = useCallback((value: string) => {
		setQueryValue(value);
		setSearchParams((prev) => {
			if (value) {
				prev.set("query", value);
			} else {
				prev.delete("query");
			}
			// Reset pagination when searching
			prev.delete("page_info");
			prev.delete("direction");
			return prev;
		});
	}, [setSearchParams]);

	const handleQueryClear = useCallback(() => {
		handleQueryChange("");
	}, [handleQueryChange]);

	const handleFiltersClearAll = useCallback(() => {
		setSearchParams((prev) => {
			prev.delete("query");
			prev.delete("page_info");
			prev.delete("direction");
			return prev;
		});
		setQueryValue("");
	}, [setSearchParams]);



	// Sync with loader data if it changes (e.g. after save or pagination)
	useEffect(() => {
		setProducts(initialProducts);
		setHasChanges(false);
	}, [initialProducts]);

	// Handle action responses
	useEffect(() => {
		if (actionData?.status === "success") {
			shopify.toast.show("Costs updated successfully");
		} else if (actionData?.status === "error") {
			shopify.toast.show("Failed to update costs", { isError: true });
		}
	}, [actionData, shopify]);

	const resourceName = {
		singular: 'product',
		plural: 'products',
	};

	const handleUpdateCost = useCallback((inventoryItemId: string, newCost: number) => {
		setProducts(prevProducts => {
			return prevProducts.map(product => {
				const variantIndex = product.variants.findIndex(v => v.inventoryItemId === inventoryItemId);
				if (variantIndex !== -1) {
					const newVariants = [...product.variants];
					newVariants[variantIndex] = { ...newVariants[variantIndex], cost: newCost };
					return { ...product, variants: newVariants };
				}
				return product;
			});
		});
		setHasChanges(true);
	}, []);

	const handleSmartApply = (optionName: string, optionValue: string, cost: number) => {
		setProducts(prevProducts => {
			return prevProducts.map(product => {
				const newVariants = product.variants.map(variant => {
					const matchesOption = variant.selectedOptions.some(
						opt => opt.name === optionName && opt.value === optionValue
					);
					if (matchesOption) {
						return { ...variant, cost };
					}
					return variant;
				});
				return { ...product, variants: newVariants };
			});
		});
		setHasChanges(true);
	};

	const handleSave = () => {
		// Collect all changes
		const updates: { inventoryItemId: string; cost: string }[] = [];
		products.forEach(p => {
			p.variants.forEach(v => {
				// Find original to compare? Or just send all?
				// For MVP, let's send all modified ones or just all to be safe/simple
				// Optimization: Compare with initialProducts to only send changed ones
				const originalProduct = initialProducts.find((ip: any) => ip.id === p.id);
				const originalVariant = originalProduct?.variants.find((iv: any) => iv.id === v.id);

				if (originalVariant && originalVariant.cost !== v.cost) {
					updates.push({
						inventoryItemId: v.inventoryItemId,
						cost: v.cost.toString()
					});
				}
			});
		});

		if (updates.length === 0) {
			// Nothing to save
			return;
		}

		submit(
			{
				actionType: "bulkUpdate",
				updates: JSON.stringify(updates),
			},
			{ method: "post" }
		);
	};

	const handleNextPage = () => {
		if (pageInfo.hasNextPage) {
			setSearchParams((prev: URLSearchParams) => {
				prev.set("page_info", pageInfo.endCursor);
				prev.set("direction", "next");
				return prev;
			});
		}
	};

	const handlePreviousPage = () => {
		if (pageInfo.hasPreviousPage) {
			setSearchParams((prev: URLSearchParams) => {
				prev.set("page_info", pageInfo.startCursor);
				prev.set("direction", "previous");
				return prev;
			});
		}
	};

	const rowMarkup = products.map(
		(product, index) => (
			<ProductRow
				key={product.id}
				product={product}
				index={index}
				onUpdateCost={handleUpdateCost}
				currencyCode={currencyCode}
			/>
		)
	);

	return (
		<Page
			title="COGS & Profit Tracking"
			primaryAction={{
				content: "Save Changes",
				onAction: handleSave,
				loading: isSaving,
				disabled: !hasChanges
			}}
			secondaryActions={[
				{
					content: "Smart Bulk Apply",
					icon: MagicIcon,
					onAction: () => setIsModalOpen(true)
				}
			]}
		>
			<Layout>
				{actionData?.status === "error" && actionData?.errors && (
					<Layout.Section>
						<Banner tone="critical" title="Error updating costs">
							<Text as="p">
								{actionData.errors.length} error(s) occurred while updating costs. Please review and try again.
							</Text>
						</Banner>
					</Layout.Section>
				)}
				{isFreePlan && (
					<Layout.Section>
						<Box paddingBlockStart="400">
							<Banner tone="info">
								<Text as="p">
									You are on the Free plan, which is limited to tracking 50 products.
									<Button variant="plain" url="/app/billing">Upgrade to Pro</Button> for unlimited tracking.
								</Text>
							</Banner>
						</Box>
					</Layout.Section>
				)}


				{/* Stats Row */}
				<Layout.Section>
					<InlineStack gap="400" align="space-between">
						<div style={{ flex: 1 }}>
							<Card>
								<BlockStack gap="200">
									<InlineStack align="space-between">
										<Text variant="headingSm" as="h3">Total Inventory Value</Text>
										<Box background="bg-surface-secondary" padding="100" borderRadius="200">
											<div style={{ width: 20, height: 20 }}><MoneyFilledIcon /></div>
										</Box>
									</InlineStack>
									<Text variant="headingLg" as="p">
										{new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(stats.totalValue)}
									</Text>
								</BlockStack>
							</Card>
						</div>
						<div style={{ flex: 1 }}>
							<Card>
								<BlockStack gap="200">
									<InlineStack align="space-between">
										<Text variant="headingSm" as="h3">Average Margin</Text>
										<Box background="bg-surface-secondary" padding="100" borderRadius="200">
											<div style={{ width: 20, height: 20 }}><ArrowUpIcon /></div>
										</Box>
									</InlineStack>
									<Text variant="headingLg" as="p">{stats.avgMargin}%</Text>
								</BlockStack>
							</Card>
						</div>
						<div style={{ flex: 1 }}>
							<Card>
								<BlockStack gap="200">
									<InlineStack align="space-between">
										<Text variant="headingSm" as="h3">Missing Costs</Text>
										<Box background="bg-surface-critical" padding="100" borderRadius="200">
											<div style={{ width: 20, height: 20 }}><AlertCircleIcon /></div>
										</Box>
									</InlineStack>
									<Text variant="headingLg" as="p" tone="critical">{stats.missingCosts} Variants</Text>
								</BlockStack>
							</Card>
						</div>
					</InlineStack>
				</Layout.Section>


				<Layout.Section>
					<Card padding="0">
						<IndexFilters
							queryValue={queryValue}
							queryPlaceholder="Search products"
							onQueryChange={handleQueryChange}
							onQueryClear={handleQueryClear}
							primaryAction={undefined}
							cancelAction={{
								onAction: () => { },
								disabled: false,
								loading: false,
							}}
							tabs={[]}
							selected={0}
							onSelect={() => { }}
							canCreateNewView={false}
							filters={[]}
							appliedFilters={[]}
							onClearAll={handleFiltersClearAll}
							mode={mode}
							setMode={setMode}
						/>
						<IndexTable
							resourceName={resourceName}
							itemCount={products.length}
							headings={[
								{ title: 'Product' },
								{ title: 'Price Range' },
								{ title: 'Cost Input' },
								{ title: 'Avg Margin' },
								{ title: 'Profit' },
							]}
							selectable={false}
							pagination={{
								hasNext: pageInfo.hasNextPage,
								hasPrevious: pageInfo.hasPreviousPage,
								onNext: handleNextPage,
								onPrevious: handlePreviousPage,
							}}
						>
							{rowMarkup}
						</IndexTable>
					</Card>
				</Layout.Section>

				{/* Recent Activity */}
				<Layout.Section>
					<Card>
						<BlockStack gap="400">
							<Text variant="headingMd" as="h2">Recent Cost Updates</Text>
							{recentActivities && recentActivities.length > 0 ? (
								<BlockStack gap="400">
									{recentActivities.map((op: any) => (
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
								<Text variant="bodyMd" as="p" tone="subdued">No recent updates found.</Text>
							)}
						</BlockStack>
					</Card>
				</Layout.Section>
			</Layout>
			<BulkApplyModal
				open={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				products={products}
				onApply={handleSmartApply}
			/>
		</Page>
	);
}

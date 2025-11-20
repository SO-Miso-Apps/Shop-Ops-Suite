import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import {
	Badge,
	Banner,
	BlockStack,
	Box,
	Button,
	Card,
	Divider,
	Icon,
	InlineGrid,
	InlineStack,
	Layout,
	Modal,
	Page,
	ProgressBar,
	Text
} from "@shopify/polaris";
import { CheckCircleIcon } from "@shopify/polaris-icons";
import { useState } from "react";
import { BillingPlans } from "../enums/BillingPlans";
import { ActivityLog } from "../models/ActivityLog";
import { UsageService } from "../services/usage.service";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: { request: Request }) => {
	const { session } = await authenticate.admin(request);

	// Get current usage stats
	const usage = await UsageService.getCurrentUsage(session.shop);
	const plan = await UsageService.getPlanType(session.shop);
	const limit = plan === "Free" ? 500 : null;
	const usageHistory = await UsageService.getUsageHistory(session.shop, 3);
	const recentOperations = await ActivityLog.find({ shop: session.shop })
		.sort({ timestamp: -1 })
		.limit(10)
		.lean();

	return json({ usage, plan, limit, usageHistory, recentOperations });
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const { billing, session, } = await authenticate.admin(request);
	const formData = await request.formData();
	const plan = formData.get("plan") as BillingPlans;
	if (request.method === 'DELETE') {
		try {
			if (!Object.values(BillingPlans).includes(plan)) throw new Error('No plan active');
			// Attempt to check if the shop has an active payment for any plan
			const billingCheck = await billing.require({
				plans: [plan],
				onFailure: async () => {
					throw new Error('No plan active');
				},
			});
			// If the shop has an active subscription, log and return the details
			const subscription = billingCheck.appSubscriptions[0];
			await billing.cancel({
				subscriptionId: subscription.id,
				isTest: process.env.NODE_ENV !== 'production',
				prorate: true,
			});

			await ActivityLog.create({
				shop: session.shop,
				resourceType: "Billing",
				resourceId: plan,
				action: "Billing Cancelled",
				category: "System",
				detail: `${plan} plan subscription cancelled`,
				status: "Success",
				timestamp: new Date(),
			});

			return redirect('/app/billing');
		} catch (error) {
			throw error;
		}
	}
};


export default function Billing() {
	const { usage, plan, limit, usageHistory, recentOperations } = useLoaderData<typeof loader>();
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	const submit = useSubmit();
	const usagePercent = limit ? Math.round((usage.count / limit) * 100) : 0;

	const handleUpgrade = (planType: BillingPlans) => {
		navigate(`/billing/subscription?plan=${planType}`);
	};

	const handleCancel = (planType: BillingPlans) => {
		submit({ plan: planType }, { method: "delete" });
	};

	const onDismiss = () => setOpen(false);
	const handleCancelClick = () => setOpen(true);

	return (
		<Page
			title="Billing & Usage"
			backAction={{ url: "/app" }}
		>
			<Layout>
				<Layout.Section>
					{/* Current Plan Card */}
					<Card>
						<BlockStack gap="400">
							<InlineStack align="space-between" blockAlign="center">
								<BlockStack gap="100">
									<Text variant="headingMd" as="h2">Current Plan</Text>
									<InlineStack gap="200" blockAlign="center">
										<Text variant="headingLg" as="h3">
											{plan === BillingPlans.Pro ? "Pro Monthly" :
												plan === BillingPlans.ProAnnual ? "Pro Annual" : "Free Tier"}
										</Text>
										<Badge tone={plan === "Free" ? "info" : "success"}>
											{plan === "Free" ? "Free Tier" : "Active"}
										</Badge>
									</InlineStack>
								</BlockStack>
							</InlineStack>

							<Divider />

							{/* Usage Stats */}
							<BlockStack gap="300">
								<Text variant="headingSm" as="h3">This Month's Usage</Text>
								{plan === "Free" ? (
									<>
										<Text as="p">
											{usage.count} / {limit} items processed
										</Text>
										<ProgressBar
											progress={usagePercent}
											size="medium"
											tone={usagePercent >= 90 ? "critical" : "success"}
										/>
										{usagePercent >= 90 && (
											<Banner tone="warning">
												You're running low on quota. Upgrade to Pro for unlimited operations.
											</Banner>
										)}
									</>
								) : (
									<>
										<Text as="p" tone="success">
											{usage.count} items processed (Unlimited)
										</Text>
										<ProgressBar progress={100} size="medium" tone="success" />
									</>
								)}
							</BlockStack>
						</BlockStack>
					</Card>
				</Layout.Section>

				<Layout.Section>
					{/* Plan Comparison */}
					<Card>
						<BlockStack gap="400">
							<Text variant="headingMd" as="h2">Plan Features</Text>

							<InlineGrid columns={3} gap="400">
								{/* Free Plan */}
								<Box
									background={plan === "Free" ? "bg-surface-active" : "bg-surface"}
									padding="400"
									borderWidth="025"
									borderColor="border"
									borderRadius="200"
								>
									<BlockStack gap="300">
										<InlineStack align="space-between">
											<Text variant="headingSm" as="h3">Free Plan</Text>
											{plan === "Free" && <Badge>Current</Badge>}
										</InlineStack>
										<Text variant="headingLg" as="h4">$0/month</Text>
										<FeaturesList
											features={[
												'500 items/month limit',
												'Basic tag operations',
												'Activity logs',
												'Tag scanning',
											]}
										/>
									</BlockStack>
								</Box>

								{/* Pro Monthly */}
								<Box
									background={plan === BillingPlans.Pro ? "bg-surface-success" : "bg-surface"}
									padding="400"
									borderWidth="025"
									borderColor={plan === BillingPlans.Pro ? "border-success" : "border"}
									borderRadius="200"
								>
									<BlockStack gap="300">
										<InlineStack align="space-between">
											<Text variant="headingSm" as="h3">Pro Monthly</Text>
											{plan === BillingPlans.Pro && <Badge tone="success">Current</Badge>}
										</InlineStack>
										<Text variant="headingLg" as="h4">$9.99/month</Text>
										<FeaturesList
											features={[
												'Unlimited operations',
												'Backup & Revert capability',
												'AI Insights & recommendations',
												'Priority support',
												'Advanced bulk operations',
											]}
										/>
										{plan !== BillingPlans.Pro && plan !== BillingPlans.ProAnnual && (
											<Button variant="primary" onClick={() => handleUpgrade(BillingPlans.Pro)} fullWidth>
												Upgrade Monthly
											</Button>
										)}
										{plan === BillingPlans.Pro && (
											<Button variant="primary" onClick={handleCancelClick} fullWidth>
												Cancel Monthly
											</Button>
										)}
									</BlockStack>
								</Box>

								{/* Pro Annual */}
								<Box
									background={plan === BillingPlans.ProAnnual ? "bg-surface-success" : "bg-surface"}
									padding="400"
									borderWidth="025"
									borderColor={plan === BillingPlans.ProAnnual ? "border-success" : "border"}
									borderRadius="200"
								>
									<BlockStack gap="300">
										<InlineStack align="space-between">
											<Text variant="headingSm" as="h3">Pro Annual</Text>
											{plan === BillingPlans.ProAnnual ? (
												<Badge tone="success">Current</Badge>
											) : (
												<Badge tone="info">Save 17%</Badge>
											)}
										</InlineStack>
										<Text variant="headingLg" as="h4">$99.99/year</Text>
										<FeaturesList
											features={[
												'All Pro features',
												'2 months free',
												'Priority feature access'
											]}
										/>
										{plan !== BillingPlans.ProAnnual && (
											<Button variant="primary" tone="success" onClick={() => handleUpgrade(BillingPlans.ProAnnual)} fullWidth>
												Upgrade Annual
											</Button>
										)}
										{plan === BillingPlans.ProAnnual && (
											<Button variant="primary" tone="critical" onClick={handleCancelClick} fullWidth>
												Cancel Annual
											</Button>
										)}
									</BlockStack>
								</Box>
							</InlineGrid>
						</BlockStack>
					</Card>
				</Layout.Section>

				<Layout.Section>
					{/* Usage History */}
					<Card>
						<BlockStack gap="400">
							<Text variant="headingMd" as="h2">Usage History</Text>
							<BlockStack gap="200">
								{usageHistory.map((month) => {
									const monthName = new Date(month.month + "-01").toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
									});
									return (
										<InlineStack key={month.month} align="space-between" blockAlign="center">
											<Text as="p">{monthName}</Text>
											<Text as="p" tone={month.count > 0 ? "base" : "subdued"}>
												{month.count} {plan === "Free" && limit ? `/ ${limit}` : ""} items
											</Text>
										</InlineStack>
									);
								})}
							</BlockStack>
						</BlockStack>
					</Card>
				</Layout.Section>

				<Layout.Section>
					{/* Recent Operations */}
					<Card>
						<BlockStack gap="400">
							<Text variant="headingMd" as="h2">Recent Operations</Text>
							{recentOperations.length > 0 ? (
								<BlockStack gap="200">
									{recentOperations.slice(0, 5).map((op: any) => (
										<Box
											key={op._id}
											padding="300"
											background="bg-surface-secondary"
											borderRadius="200"
										>
											<InlineStack align="space-between" blockAlign="start">
												<BlockStack gap="100">
													<Text as="p" fontWeight="semibold">{op.action}</Text>
													<Text as="p" tone="subdued" variant="bodySm">
														{op.detail}
													</Text>
												</BlockStack>
												<Badge tone={op.status === "Success" ? "success" : op.status === "Failed" ? "critical" : "info"}>
													{op.status}
												</Badge>
											</InlineStack>
										</Box>
									))}
								</BlockStack>
							) : (
								<Text as="p" tone="subdued">No recent operations</Text>
							)}
						</BlockStack>
					</Card>
				</Layout.Section>
			</Layout>
			<Modal
				open={open}
				onClose={onDismiss}
				title="Cancel Subscription"
				primaryAction={{
					content: "Cancel",
					onAction: () => {
						onDismiss();
						submit({ plan }, { method: "delete" });
					},
				}}
				secondaryActions={[{
					content: "Cancel",
					onAction: onDismiss,
				}]}
			>
				<Modal.Section>
					<Text as="p">Are you sure you want to cancel your subscription?</Text>
				</Modal.Section>
			</Modal>
		</Page>
	);
}


function FeaturesList({ features }: { features: string[] }) {
	return (
		<BlockStack gap="100">
			{features.map((feature, index) => (
				<InlineStack key={index} align="start" blockAlign="center" gap="100">
					<span><Icon source={CheckCircleIcon} /></span>
					<Text as="p">{feature}</Text>
				</InlineStack>
			))}
		</BlockStack>
	);
}
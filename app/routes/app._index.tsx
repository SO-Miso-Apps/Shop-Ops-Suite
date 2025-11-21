import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  BlockStack,
  Box,
  Button,
  CalloutCard,
  Card,
  Divider,
  Icon,
  InlineGrid,
  Layout,
  Page,
  Text,
  Tooltip,
  Badge,
  IndexTable,
  EmptyState,
  Link,
} from "@shopify/polaris";
import {
  OrderFilledIcon,
  ProductFilledIcon,
  ClockIcon,
  PlusIcon,
  DeleteIcon,
  EditIcon,
  CheckIcon,
  AlertCircleIcon,
  InfoIcon,
  ArrowRightIcon
} from "@shopify/polaris-icons";
import { useEffect, useState } from "react";
import { DashboardService } from "../services/dashboard.service";
import { authenticate } from "../shopify.server";

import { ActionFunctionArgs } from "@remix-run/node";
import { useSubmit } from "@remix-run/react";
import { SetupGuide } from "../components/Dashboard/SetupGuide";
import { Settings } from "../models/Settings";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const dashboardData = await DashboardService.getDashboardData(admin, session.shop);
  const setupProgress = await DashboardService.getSetupProgress(session.shop);

  return json({ ...dashboardData, setupProgress });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "dismiss_setup_guide") {
    await Settings.findOneAndUpdate(
      { shop: session.shop },
      { setupGuideDismissed: true },
      { upsert: true }
    );
    return json({ success: true });
  }

  return null;
};

export default function Dashboard() {
  const { stats, suggestions, charts, setupProgress, recentActivities } = useLoaderData<typeof loader>() as any;
  const navigate = useNavigate();
  const submit = useSubmit();
  const [isClient, setIsClient] = useState(false);
  const [ChartsModule, setChartsModule] = useState<any>(null);

  // Only render charts on client-side to avoid SSR issues
  useEffect(() => {
    setIsClient(true);
    // Dynamically import polaris-viz only on client
    import('@shopify/polaris-viz').then((module) => {
      setChartsModule(module);
    });
  }, []);

  // Prepare data for LineChart (Activity Trend)
  const activityTrendData = charts?.activityTrend ? [{
    name: 'Activities',
    data: charts.activityTrend.map((item: any) => ({
      key: item.date,
      value: item.count,
    })),
  }] : [];

  // Prepare data for DonutChart (Category Breakdown)
  const categoryBreakdownData = charts?.categoryBreakdown ? charts.categoryBreakdown.map((item: any) => ({
    name: item.name,
    data: [{
      key: item.name,
      value: item.value,
    }]
  })) : [];

  return (
    <Page title="Dashboard" subtitle="Shop-Ops Suite Overview" primaryAction={{ content: "New Rule", onAction: () => navigate("/app/tagger/new"), icon: PlusIcon }}>

      <Layout>
        {/* Setup Guide */}
        {setupProgress && !setupProgress.dismissed && (
          <Layout.Section>
            <SetupGuide
              steps={setupProgress.steps}
              onDismiss={() => {
                const formData = new FormData();
                formData.append("action", "dismiss_setup_guide");
                submit(formData, { method: "post" });
              }}
            />
          </Layout.Section>
        )}

        {/* Top Stats Row */}
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <StatsCard title="Active Rules" value={stats.activeRules.toString()} icon={CheckIcon} />
            <StatsCard title="Total Orders" value={stats.totalOrders.toString()} icon={OrderFilledIcon} />
            <StatsCard title="Total Products" value={stats.totalProducts.toString()} icon={ProductFilledIcon} />
            <StatsCard title="Hours Saved" value={`${stats.savingsHours} h`} icon={ClockIcon} highlight />
          </InlineGrid>
        </Layout.Section>

        {/* Charts Section */}
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
            {/* Activity Trend Chart (Spans 2 columns) */}
            <div style={{ gridColumn: 'span 2' }}>
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">
                    Activity Trend (Last 7 Days)
                  </Text>
                  <Box minHeight="300px">
                    {isClient && ChartsModule && activityTrendData.length > 0 && activityTrendData[0].data.length > 0 ? (
                      <ChartsModule.LineChart
                        data={activityTrendData}
                        theme="Light"
                        xAxisOptions={{
                          labelFormatter: (value: string | number | null) => {
                            if (!value) return '';
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          },
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', background: '#f1f2f4', borderRadius: '8px' }}>
                        <Text variant="bodyMd" as="p" tone="subdued">
                          {!isClient || !ChartsModule ? 'Loading chart...' : 'No activity data available'}
                        </Text>
                      </div>
                    )}
                  </Box>
                </BlockStack>
              </Card>
            </div>

            {/* Category Breakdown Chart */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Activity by Category
                </Text>
                <Box minHeight="300px">
                  {isClient && ChartsModule && categoryBreakdownData.length > 0 ? (
                    <ChartsModule.DonutChart
                      data={categoryBreakdownData}
                      theme="Light"
                      legendPosition="bottom"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', background: '#f1f2f4', borderRadius: '8px' }}>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        {!isClient || !ChartsModule ? 'Loading chart...' : 'No category data available'}
                      </Text>
                    </div>
                  )}
                </Box>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        {/* Bottom Section: Recent Activity & Quick Actions */}
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
            {/* Recent Activity Feed (Spans 2 columns) */}
            <div style={{ gridColumn: 'span 2' }}>
              <Card>
                <BlockStack gap="400">
                  <InlineGrid columns="1fr auto">
                    <Text variant="headingMd" as="h3">Recent Activity</Text>
                    <Button variant="plain" onClick={() => navigate("/app/activity")}>View All</Button>
                  </InlineGrid>
                  <Divider />
                  {recentActivities && recentActivities.length > 0 ? (
                    <BlockStack gap="400">
                      {recentActivities.map((activity: any) => (
                        <Box key={activity.id} paddingBlockEnd="200">
                          <InlineGrid columns="auto 1fr auto" gap="400" alignItems="center">
                            <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                              <Icon source={activity.status === 'Failed' ? AlertCircleIcon : CheckIcon} tone={activity.status === 'Failed' ? 'critical' : 'success'} />
                            </Box>
                            <BlockStack gap="100">
                              <Text variant="bodyMd" as="span" fontWeight="semibold">{activity.action}</Text>
                              <Text variant="bodySm" as="span" tone="subdued">{activity.details[0]?.message || 'No details'}</Text>
                            </BlockStack>
                            <Text variant="bodySm" as="span" tone="subdued">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </Text>
                          </InlineGrid>
                        </Box>
                      ))}
                    </BlockStack>
                  ) : (
                    <EmptyState
                      heading="No recent activity"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Your recent operations will appear here.</p>
                    </EmptyState>
                  )}
                </BlockStack>
              </Card>
            </div>

            {/* Sidebar: Quick Actions & AI Advisor */}
            <BlockStack gap="400">
              {/* Quick Actions */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h3">Quick Actions</Text>
                  <Divider />
                  <BlockStack gap="200">
                    <Button fullWidth icon={PlusIcon} textAlign="start" onClick={() => navigate("/app/tagger/new")}>New Smart Rule</Button>
                    <Button fullWidth icon={EditIcon} textAlign="start" onClick={() => navigate("/app/bulk")}>Bulk Edit Products</Button>
                    <Button fullWidth icon={DeleteIcon} textAlign="start" onClick={() => navigate("/app/cleaner")}>Clean Tags</Button>
                    <Button fullWidth icon={InfoIcon} textAlign="start" onClick={() => navigate("/app/metafields")}>Manage Metafields</Button>
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* AI Advisor (Simplified View) */}
              {suggestions.length > 0 && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h3">AI Insights</Text>
                    <Divider />
                    {suggestions.map((suggestion: any) => (
                      <Box key={suggestion.id} background="bg-surface-secondary" padding="300" borderRadius="200">
                        <BlockStack gap="200">
                          <Text variant="bodyMd" as="p" fontWeight="semibold">{suggestion.title}</Text>
                          <Text variant="bodySm" as="p">{suggestion.content}</Text>
                          <Button size="micro" variant="plain" onClick={() => {
                            if (suggestion.action === "Create Rule") navigate("/app/tagger");
                            if (suggestion.action === "Update Costs") navigate("/app/cogs");
                            if (suggestion.action === "Clean Tags") navigate("/app/cleaner");
                            if (suggestion.action === "View Activity") navigate("/app/activity");
                          }}>{suggestion.action}</Button>
                        </BlockStack>
                      </Box>
                    ))}
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </InlineGrid>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function StatsCard({ title, value, highlight = false, icon }: { title: string; value: string; highlight?: boolean; icon?: React.FunctionComponent<React.SVGProps<SVGSVGElement>> }) {
  return (
    <Card>
      <BlockStack gap="400">
        <InlineGrid columns="1fr auto" alignItems="center">
          <Text variant="headingSm" as="h3" tone="subdued">
            {title}
          </Text>
          {icon && (
            <Box background={highlight ? "bg-surface-success" : "bg-surface-secondary"} padding="100" borderRadius="200">
              <Icon source={icon} tone={highlight ? "success" : "base"} />
            </Box>
          )}
        </InlineGrid>
        <Text variant="headingXl" as="p" tone={highlight ? "success" : undefined}>
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}



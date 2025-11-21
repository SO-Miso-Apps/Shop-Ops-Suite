import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  BlockStack,
  Box,
  CalloutCard,
  Card,
  Divider,
  InlineGrid,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
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
  const { stats, suggestions, charts, setupProgress } = useLoaderData<typeof loader>();
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

  // Prepare data for BarChart (Category Breakdown)
  const categoryBreakdownData = charts?.categoryBreakdown ? [{
    data: charts.categoryBreakdown.map((item: any) => ({
      key: item.name,
      value: item.value,
    })),
  }] : [];

  console.log("suggestions", suggestions);
  return (
    <Page title="Dashboard" subtitle="Shop-Ops Suite Overview">

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
            <StatsCard title="Active Rules" value={stats.activeRules.toString()} />
            <StatsCard title="Total Orders" value={stats.totalOrders.toString()} />
            <StatsCard title="Total Products" value={stats.totalProducts.toString()} />
            <StatsCard title="Hours Saved" value={`${stats.savingsHours} h`} highlight />
          </InlineGrid>
        </Layout.Section>

        {/* Charts Section */}
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            {/* Activity Trend Chart */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Activity Trend (Last 7 Days)
                </Text>
                <Divider />
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

            {/* Category Breakdown Chart */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Activity by Category
                </Text>
                <Divider />
                <Box minHeight="300px">
                  {isClient && ChartsModule && categoryBreakdownData.length > 0 && categoryBreakdownData[0].data.length > 0 ? (
                    <ChartsModule.BarChart
                      data={categoryBreakdownData}
                      theme="Light"
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

        {/* AI Advisor Section */}
        <Layout.Section>
          <Text variant="headingLg" as="h2">
            AI Operations Advisor
          </Text>
          <Box paddingBlockStart="400">
            <BlockStack>
              {suggestions.length === 0 ? (
                <CalloutCard
                  title="All systems operational"
                  illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
                  primaryAction={{
                    content: "Configure Rules",
                    onAction: () => navigate("/app/tagger"),
                  }}
                >
                  <p>Your shop data looks good. No immediate actions required.</p>
                </CalloutCard>
              ) : (
                suggestions.map((suggestion) => (
                  <CalloutCard
                    key={suggestion.id}
                    title={suggestion.title}
                    illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
                    primaryAction={{
                      content: suggestion.action,
                      onAction: () => {
                        // Handle predefined actions
                        if (suggestion.action === "Create Rule") navigate("/app/tagger");
                        if (suggestion.action === "Update Costs") navigate("/app/cogs");
                        if (suggestion.action === "Clean Tags") navigate("/app/cleaner");
                        if (suggestion.action === "View Activity") navigate("/app/activity");
                        // "Learn More" doesn't navigate anywhere
                      },
                    }}
                  >
                    <p>{suggestion.content}</p>
                  </CalloutCard>
                ))
              )}
            </BlockStack>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function StatsCard({ title, value, highlight = false }: { title: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="headingSm" as="h3" tone="subdued">
          {title}
        </Text>
        <Text variant="headingXl" as="p" tone={highlight ? "success" : undefined}>
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}





import { useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  CalloutCard,
  Card,
  Text,
  InlineGrid,
  Box,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { DashboardService } from "../services/dashboard.service";

export const loader = async ({ request }: { request: Request }) => {
  const { admin, session } = await authenticate.admin(request);
  const data = await DashboardService.getDashboardData(admin, session.shop);
  return json(data);
};

export default function Dashboard() {
  const { stats, suggestions } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Page title="Dashboard" subtitle="Shop-Ops Suite Overview">
      <BlockStack gap="500">
        {/* Top Stats Row */}
        <Layout>
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
              <StatsCard title="Active Rules" value={stats.activeRules.toString()} />
              <StatsCard title="Total Orders" value={stats.totalOrders.toString()} />
              <StatsCard title="Total Products" value={stats.totalProducts.toString()} />
              <StatsCard title="Hours Saved" value={`${stats.savingsHours}h`} highlight />
            </InlineGrid>
          </Layout.Section>

          {/* AI Advisor Section */}
          <Layout.Section>
            <Text variant="headingLg" as="h2">
              AI Operations Advisor
            </Text>
            <Box paddingBlockStart="400">
              <BlockStack gap="400">
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
                          if (suggestion.action === "Enable Rule") navigate("/app/tagger");
                          if (suggestion.action === "Update COGS") navigate("/app/cogs");
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

          {/* Savings Chart Section (Placeholder for MVP) */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  Automation Savings (Last 30 Days)
                </Text>
                <Divider />
                <Box padding="400" minHeight="200px">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', background: '#f1f2f4', borderRadius: '8px', color: '#6d7175' }}>
                    <Text variant="bodyMd" as="p">
                      Savings Chart Visualization (Coming Soon)
                    </Text>
                    {/* In a real implementation, we would use Recharts or similar here */}
                  </div>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
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



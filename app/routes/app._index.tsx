/**
 * Dashboard Route - Main Home Page
 *
 * Displays at-a-glance insights into automation activity:
 * - Key statistics (active recipes, actions, time saved)
 * - Active recipes list (top 5)
 * - Recent activity log (last 10)
 * - Quick action buttons
 */

import { useState } from 'react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useRevalidator, Link as RemixLink } from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Link,
  Badge,
  SkeletonBodyText,
  Modal
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';
import { getDataService } from '~/services/data';
import { StatsCard } from '~/components/StatsCard';
import { formatRelativeTime } from '~/utils/formatters';
import type { MockRecipe, MockAutomationLog } from '~/mocks/types';

/**
 * Loader - Fetch dashboard data
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  try {
    const dataService = getDataService();

    // Fetch all required data
    const [dashboardStats, activeRecipes, recentActivity] = await Promise.all([
      dataService.getDashboardStats(),
      dataService.getRecipes({ enabled: true }),
      dataService.getActivityLogs({ }, { page: 1, limit: 10 })
    ]);

    // Sort active recipes by most recently updated and take top 5
    const topActiveRecipes = activeRecipes
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    return json({
      stats: {
        activeRecipes: dashboardStats.activeRecipes,
        executionsToday: dashboardStats.executionsToday,
        executionsThisMonth: dashboardStats.executionsThisMonth,
        successRate: dashboardStats.successRate
      },
      activeRecipes: topActiveRecipes,
      recentActivity: recentActivity.data
    });
  } catch (error) {
    console.error('Dashboard loader error:', error);
    throw new Error('Failed to load dashboard data');
  }
}

/**
 * Dashboard Component
 */
export default function Dashboard() {
  const { stats, activeRecipes, recentActivity } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

  const isRefreshing = revalidator.state === 'loading';

  const handleRefresh = () => {
    revalidator.revalidate();
  };

  return (
    <Page>
      <TitleBar title="Dashboard">
        <button onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </TitleBar>

      <BlockStack gap="500">
        {/* Stats Section */}
        <Layout>
          <Layout.Section>
            <InlineStack gap="400" wrap>
              <div style={{ flex: '1 1 0', minWidth: '240px' }}>
                <StatsCard
                  value={stats.activeRecipes}
                  label="Active Recipes"
                  viewAllUrl="/app/recipes"
                  loading={isRefreshing}
                />
              </div>
              <div style={{ flex: '1 1 0', minWidth: '240px' }}>
                <StatsCard
                  value={stats.executionsToday}
                  label="Actions Today"
                  viewAllUrl="/app/activity"
                  loading={isRefreshing}
                />
              </div>
              <div style={{ flex: '1 1 0', minWidth: '240px' }}>
                <StatsCard
                  value={`${stats.successRate}%`}
                  label="Success Rate"
                  loading={isRefreshing}
                />
              </div>
              <div style={{ flex: '1 1 0', minWidth: '240px' }}>
                <StatsCard
                  value={stats.executionsThisMonth}
                  label="Actions This Month"
                  viewAllUrl="/app/activity"
                  loading={isRefreshing}
                />
              </div>
            </InlineStack>
          </Layout.Section>
        </Layout>

        {/* Main Content: Active Recipes + Recent Activity */}
        <Layout>
          {/* Active Recipes Column */}
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Active Recipes
                </Text>

                {isRefreshing ? (
                  <SkeletonBodyText lines={5} />
                ) : activeRecipes.length === 0 ? (
                  <EmptyStateActiveRecipes />
                ) : (
                  <BlockStack gap="300">
                    {activeRecipes.map((recipe: MockRecipe) => (
                      <InlineStack key={recipe.recipeId} align="space-between" blockAlign="center">
                        <Text variant="bodyMd" as="p">
                          {recipe.title}
                        </Text>
                        <Badge tone="success">Active</Badge>
                      </InlineStack>
                    ))}
                  </BlockStack>
                )}

                <div style={{ paddingTop: '8px' }}>
                  <Link url="/app/recipes" removeUnderline>
                    Manage Recipes →
                  </Link>
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Recent Activity Column */}
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Recent Activity
                </Text>

                {isRefreshing ? (
                  <SkeletonBodyText lines={10} />
                ) : recentActivity.length === 0 ? (
                  <EmptyStateActivity />
                ) : (
                  <BlockStack gap="200">
                    {recentActivity.map((log: MockAutomationLog) => (
                      <BlockStack key={log.logId} gap="100">
                        <InlineStack gap="200" blockAlign="center">
                          <Text variant="bodySm" as="span" tone="subdued">
                            {formatRelativeTime(log.createdAt)}
                          </Text>
                          <Badge tone={log.status === 'success' ? 'success' : log.status === 'failure' ? 'critical' : 'warning'}>
                            {log.status}
                          </Badge>
                        </InlineStack>
                        <Text variant="bodyMd" as="p">
                          {log.recipeTitle} → {log.resourceTitle}
                        </Text>
                      </BlockStack>
                    ))}
                  </BlockStack>
                )}

                <div style={{ paddingTop: '8px' }}>
                  <Link url="/app/activity" removeUnderline>
                    View All Activity →
                  </Link>
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Quick Actions Section */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Quick Actions
                </Text>

                <InlineStack gap="300" wrap>
                  <RemixLink to="/app/recipes">
                    <Button>+ Add Recipe</Button>
                  </RemixLink>
                  <Button onClick={() => setShowComingSoonModal(true)}>
                    🧹 Clean Tags
                  </Button>
                  <Button onClick={() => setShowComingSoonModal(true)}>
                    ⚡ Bulk Operations
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Coming Soon Modal */}
      <Modal
        open={showComingSoonModal}
        onClose={() => setShowComingSoonModal(false)}
        title="Coming Soon"
        primaryAction={{
          content: 'Close',
          onAction: () => setShowComingSoonModal(false)
        }}
      >
        <Modal.Section>
          <Text variant="bodyMd" as="p">
            This feature will be available in Phase 2 of development.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

/**
 * Empty State - Active Recipes
 */
function EmptyStateActiveRecipes() {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <BlockStack gap="300">
        <div style={{ fontSize: '48px' }}>📋</div>
        <Text variant="headingSm" as="p">
          No active recipes yet
        </Text>
        <Text variant="bodyMd" as="p" tone="subdued">
          Browse the recipe library to get started with automation
        </Text>
        <div>
          <RemixLink to="/app/recipes">
            <Button>Browse Recipes</Button>
          </RemixLink>
        </div>
      </BlockStack>
    </div>
  );
}

/**
 * Empty State - Recent Activity
 */
function EmptyStateActivity() {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <BlockStack gap="300">
        <div style={{ fontSize: '48px' }}>📊</div>
        <Text variant="headingSm" as="p">
          No activity yet
        </Text>
        <Text variant="bodyMd" as="p" tone="subdued">
          Actions will appear here once you activate a recipe
        </Text>
      </BlockStack>
    </div>
  );
}

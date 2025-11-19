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
  Modal,
  ResourceList,
  ResourceItem,
  Box,
  EmptyState,
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { RefreshIcon } from '@shopify/polaris-icons';
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
        <Button
          icon={RefreshIcon}
          onClick={handleRefresh}
          disabled={isRefreshing}
          ariaLabel={isRefreshing ? 'Refreshing data' : 'Refresh data'}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </TitleBar>

      <BlockStack gap="500">
        {/* Stats Section */}
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack gap="400" wrap>
                <Box minInlineSize="240px" flexGrow="1">
                  <StatsCard
                    value={stats.activeRecipes}
                    label="Active Recipes"
                    viewAllUrl="/app/recipes"
                    loading={isRefreshing}
                  />
                </Box>
                <Box minInlineSize="240px" flexGrow="1">
                  <StatsCard
                    value={stats.executionsToday}
                    label="Actions Today"
                    viewAllUrl="/app/activity"
                    loading={isRefreshing}
                  />
                </Box>
                <Box minInlineSize="240px" flexGrow="1">
                  <StatsCard
                    value={`${stats.successRate}%`}
                    label="Success Rate"
                    loading={isRefreshing}
                  />
                </Box>
                <Box minInlineSize="240px" flexGrow="1">
                  <StatsCard
                    value={stats.executionsThisMonth}
                    label="Actions This Month"
                    viewAllUrl="/app/activity"
                    loading={isRefreshing}
                  />
                </Box>
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Main Content: Active Recipes + Recent Activity */}
        <Layout>
          {/* Active Recipes Column */}
          <Layout.Section variant="oneHalf">
            <Card
              title="Active Recipes"
              actions={[{ content: 'View all', url: '/app/recipes' }]}
            >
              {isRefreshing ? (
                <SkeletonBodyText lines={5} />
              ) : activeRecipes.length === 0 ? (
                <EmptyState
                  heading="No active recipes yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  imageContained={true}
                  fullWidth={true}
                >
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Browse the recipe library to get started with automation.
                  </Text>
                  <RemixLink to="/app/recipes">
                    <Button primary>Browse Recipes</Button>
                  </RemixLink>
                </EmptyState>
              ) : (
                <ResourceList
                  resourceName={{ singular: 'recipe', plural: 'recipes' }}
                  items={activeRecipes}
                  renderItem={(recipe: MockRecipe) => {
                    const { recipeId, title } = recipe;
                    return (
                      <ResourceItem
                        id={recipeId}
                        url={`/app/recipes/${recipeId}`}
                        accessibilityLabel={`View details for ${title}`}
                      >
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="bodyMd" as="p" fontWeight="semibold">
                            {title}
                          </Text>
                          <Badge tone="success">Active</Badge>
                        </InlineStack>
                      </ResourceItem>
                    );
                  }}
                />
              )}
            </Card>
          </Layout.Section>

          {/* Recent Activity Column */}
          <Layout.Section variant="oneHalf">
            <Card
              title="Recent Activity"
              actions={[{ content: 'View all', url: '/app/activity' }]}
            >
              {isRefreshing ? (
                <SkeletonBodyText lines={10} />
              ) : recentActivity.length === 0 ? (
                <EmptyState
                  heading="No activity yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-blog-post.png"
                  imageContained={true}
                  fullWidth={true}
                >
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Actions will appear here once you activate a recipe.
                  </Text>
                </EmptyState>
              ) : (
                <ResourceList
                  resourceName={{ singular: 'log entry', plural: 'log entries' }}
                  items={recentActivity}
                  renderItem={(log: MockAutomationLog) => {
                    const { logId, recipeTitle, resourceTitle, status, createdAt } = log;
                    return (
                      <ResourceItem
                        id={logId}
                        url={`/app/activity/${logId}`}
                        accessibilityLabel={`View details for activity log ${logId}`}
                      >
                        <BlockStack gap="100">
                          <InlineStack gap="200" blockAlign="center">
                            <Text variant="bodySm" as="span" tone="subdued">
                              {formatRelativeTime(createdAt)}
                            </Text>
                            <Badge tone={status === 'success' ? 'success' : status === 'failure' ? 'critical' : 'warning'}>
                              {status}
                            </Badge>
                          </InlineStack>
                          <Text variant="bodyMd" as="p" fontWeight="semibold">
                            {recipeTitle} → {resourceTitle}
                          </Text>
                        </BlockStack>
                      </ResourceItem>
                    );
                  }}
                />
              )}
            </Card>
          </Layout.Section>
        </Layout>

        {/* Quick Actions Section */}
        <Layout>
          <Layout.Section>
            <Card title="Quick Actions">
              <BlockStack gap="400">
                <Text variant="bodyMd" as="p" tone="subdued">
                  Perform common tasks quickly.
                </Text>
                <InlineStack gap="300" wrap>
                  <RemixLink to="/app/recipes">
                    <Button primary>+ Add Recipe</Button>
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


/**
 * Settings Route - Plan Management & Preferences
 *
 * Tabbed interface for:
 * - Plan & Billing (current plan, upgrade options)
 * - Usage & Limits (usage tracking with progress bars)
 * - Preferences (email notifications, timezone, log retention)
 * - Account (shop information)
 */

import { useState, useCallback, useMemo } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams, Form, useActionData } from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Tabs,
  Badge,
  Banner,
  ProgressBar,
  Divider,
  Checkbox,
  Select,
  TextField,
  Link,
  Modal
} from '@shopify/polaris';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';
import { getDataService } from '~/services/data';
import { formatDate } from '~/utils/formatters';

/**
 * Common timezones list
 */
const TIMEZONES = [
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
  { label: 'Mountain Time (MT)', value: 'America/Denver' },
  { label: 'Central Time (CT)', value: 'America/Chicago' },
  { label: 'Eastern Time (ET)', value: 'America/New_York' },
  { label: 'UTC', value: 'UTC' },
  { label: 'London (GMT)', value: 'Europe/London' },
  { label: 'Paris (CET)', value: 'Europe/Paris' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
  { label: 'Auckland (NZST)', value: 'Pacific/Auckland' }
];

/**
 * Plan features configuration
 */
const PLAN_FEATURES = {
  free: [
    'Up to 3 active recipes',
    '1,000 actions per month',
    '1 bulk operation per week',
    '30-day activity log retention',
    'Email support (48h response)'
  ],
  pro: [
    'Unlimited active recipes',
    '25,000 actions per month',
    'Unlimited bulk operations',
    '1-year activity log retention',
    'Priority email support (24h response)',
    'Advanced recipe customization',
    'Scheduled automation'
  ],
  enterprise: [
    'Unlimited active recipes',
    'Unlimited actions per month',
    'Unlimited bulk operations',
    'Unlimited activity log retention',
    'Dedicated account manager',
    'Phone & Slack support',
    'Custom recipe development',
    'SLA guarantee (99.9% uptime)',
    'Advanced analytics dashboard'
  ]
};

/**
 * Loader - Fetch settings, usage, and shop data
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  try {
    const dataService = getDataService();
    const [settings, shop] = await Promise.all([
      dataService.getSettings(),
      dataService.getShop()
    ]);

    // Calculate usage percentages
    const usageData = {
      activeRecipes: {
        current: settings.usage.recipesUsed,
        limit: settings.usage.recipesLimit,
        percentage: Math.round((settings.usage.recipesUsed / settings.usage.recipesLimit) * 100)
      },
      actions: {
        current: settings.usage.executionsThisMonth,
        limit: settings.usage.executionsLimit,
        percentage: Math.round((settings.usage.executionsThisMonth / settings.usage.executionsLimit) * 100)
      },
      bulkOps: {
        current: settings.usage.bulkOperationsUsed,
        limit: settings.usage.bulkOperationsLimit,
        percentage: Math.round((settings.usage.bulkOperationsUsed / settings.usage.bulkOperationsLimit) * 100)
      },
      resetDate: getNextMonthReset()
    };

    return json({
      settings,
      shop,
      usage: usageData
    });
  } catch (error) {
    console.error('Settings loader error:', error);
    throw new Error('Failed to load settings');
  }
}

/**
 * Action - Handle preference updates and plan upgrades
 */
export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);

  const formData = await request.formData();
  const actionType = formData.get('_action') as string;

  try {
    const dataService = getDataService();

    if (actionType === 'updatePreferences') {
      const emailNotifications = formData.get('emailNotifications') === 'on';
      const timezone = formData.get('timezone') as string;

      await dataService.updateSettings({
        preferences: {
          emailNotifications,
          timezone
        }
      });

      return json({ success: true, message: 'Preferences updated successfully' });
    }

    if (actionType === 'upgradeToPro') {
      // Mock upgrade to Pro with trial
      await dataService.updateSettings({
        plan: 'pro',
        billingStatus: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        usage: {
          recipesUsed: 0,
          recipesLimit: 999999, // Unlimited
          executionsThisMonth: 0,
          executionsLimit: 25000,
          bulkOperationsUsed: 0,
          bulkOperationsLimit: 999999 // Unlimited
        }
      });

      return json({ success: true, message: '14-day Pro trial started! Welcome to unlimited automation.' });
    }

    return json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Settings action error:', error);
    return json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}

/**
 * Helper: Calculate next month reset date
 */
function getNextMonthReset(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

/**
 * Helper: Calculate days until reset
 */
function getDaysUntilReset(resetDate: Date | string): number {
  const now = new Date();
  const reset = typeof resetDate === 'string' ? new Date(resetDate) : resetDate;
  const diff = reset.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Settings Component
 */
export default function Settings() {
  const { settings, shop, usage } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  const shopify = useAppBridge();

  // State
  const selectedTab = parseInt(searchParams.get('tab') || '0', 10);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);

  // Handle tab change
  const handleTabChange = useCallback((newTabIndex: number) => {
    setSearchParams({ tab: String(newTabIndex) }, { replace: true });
  }, [setSearchParams]);

  // Handle upgrade click
  const handleUpgrade = useCallback(() => {
    setShowUpgradeModal(true);
  }, []);

  // Handle contact sales
  const handleContactSales = useCallback(() => {
    setShowContactSalesModal(true);
  }, []);

  // Show toast on action success
  if (actionData?.success) {
    shopify.toast.show(actionData.message);
  } else if (actionData?.error) {
    shopify.toast.show(actionData.error, { isError: true });
  }

  // Check if usage is critical/warning
  const hasWarning = useMemo(() => {
    return usage.activeRecipes.percentage >= 80 ||
           usage.actions.percentage >= 80 ||
           usage.bulkOps.percentage >= 80;
  }, [usage]);

  const hasCritical = useMemo(() => {
    return usage.activeRecipes.percentage >= 100 ||
           usage.actions.percentage >= 100 ||
           usage.bulkOps.percentage >= 100;
  }, [usage]);

  const tabs = [
    { id: 'billing', content: 'Plan & Billing' },
    { id: 'usage', content: 'Usage & Limits' },
    { id: 'preferences', content: 'Preferences' },
    { id: 'account', content: 'Account' }
  ];

  return (
    <Page>
      <TitleBar title="Settings" />

      <Layout>
        <Layout.Section>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
            <BlockStack gap="500">
              {/* Tab 0: Plan & Billing */}
              {selectedTab === 0 && (
                <BlockStack gap="500">
                  {/* Current Plan Card */}
                  <Card>
                    <BlockStack gap="400">
                      <InlineStack align="space-between" blockAlign="center">
                        <div>
                          <Text variant="headingLg" as="h2">
                            Current Plan
                          </Text>
                          <InlineStack gap="200" blockAlign="center">
                            <Text variant="headingMd" as="h3">
                              {settings.plan === 'free' && 'Free Plan'}
                              {settings.plan === 'pro' && 'Pro Plan'}
                              {settings.plan === 'enterprise' && 'Enterprise Plan'}
                            </Text>
                            {settings.billingStatus === 'trial' && (
                              <Badge tone="info">Trial</Badge>
                            )}
                          </InlineStack>
                        </div>
                        {settings.plan === 'free' && (
                          <Button variant="primary" onClick={handleUpgrade}>
                            Upgrade to Pro →
                          </Button>
                        )}
                      </InlineStack>

                      {settings.billingStatus === 'trial' && settings.trialEndsAt && (
                        <Banner tone="info">
                          Your Pro trial ends on {formatDate(settings.trialEndsAt, 'MMMM DD, YYYY')}
                          ({getDaysUntilReset(settings.trialEndsAt)} days remaining)
                        </Banner>
                      )}

                      <Divider />

                      <BlockStack gap="200">
                        <Text variant="headingSm" as="h4">
                          Features
                        </Text>
                        {PLAN_FEATURES[settings.plan].map((feature, idx) => (
                          <InlineStack key={idx} gap="200" blockAlign="center">
                            <Text tone="success">✓</Text>
                            <Text variant="bodyMd">{feature}</Text>
                          </InlineStack>
                        ))}
                      </BlockStack>
                    </BlockStack>
                  </Card>

                  {/* Upgrade Options (only show if Free plan) */}
                  {settings.plan === 'free' && (
                    <>
                      {/* Pro Plan Card */}
                      <Card>
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <div>
                              <Text variant="headingLg" as="h2">
                                Pro Plan
                              </Text>
                              <Text variant="headingMd" as="h3" tone="subdued">
                                $19.99/month
                              </Text>
                            </div>
                            <Button variant="primary" onClick={handleUpgrade}>
                              Start 14-Day Free Trial →
                            </Button>
                          </InlineStack>

                          <Divider />

                          <BlockStack gap="200">
                            <Text variant="headingSm" as="h4">
                              Everything in Free, plus:
                            </Text>
                            {PLAN_FEATURES.pro.slice(5).map((feature, idx) => (
                              <InlineStack key={idx} gap="200" blockAlign="center">
                                <Text tone="success">✓</Text>
                                <Text variant="bodyMd">{feature}</Text>
                              </InlineStack>
                            ))}
                          </BlockStack>
                        </BlockStack>
                      </Card>

                      {/* Enterprise Plan Card */}
                      <Card>
                        <BlockStack gap="400">
                          <InlineStack align="space-between" blockAlign="center">
                            <div>
                              <Text variant="headingLg" as="h2">
                                Enterprise Plan
                              </Text>
                              <Text variant="headingMd" as="h3" tone="subdued">
                                Custom Pricing
                              </Text>
                            </div>
                            <Button onClick={handleContactSales}>
                              Contact Sales →
                            </Button>
                          </InlineStack>

                          <Divider />

                          <BlockStack gap="200">
                            <Text variant="headingSm" as="h4">
                              Everything in Pro, plus:
                            </Text>
                            {PLAN_FEATURES.enterprise.slice(5).map((feature, idx) => (
                              <InlineStack key={idx} gap="200" blockAlign="center">
                                <Text tone="success">✓</Text>
                                <Text variant="bodyMd">{feature}</Text>
                              </InlineStack>
                            ))}
                          </BlockStack>
                        </BlockStack>
                      </Card>
                    </>
                  )}
                </BlockStack>
              )}

              {/* Tab 1: Usage & Limits */}
              {selectedTab === 1 && (
                <BlockStack gap="500">
                  {/* Warning Banners */}
                  {hasCritical && (
                    <Banner tone="critical">
                      <BlockStack gap="200">
                        <Text variant="bodyMd" as="p">
                          ⚠️ You've reached your plan limit. Upgrade to Pro for unlimited automation.
                        </Text>
                        <Button variant="primary" onClick={handleUpgrade}>
                          Upgrade Now →
                        </Button>
                      </BlockStack>
                    </Banner>
                  )}

                  {hasWarning && !hasCritical && (
                    <Banner tone="warning">
                      <BlockStack gap="200">
                        <Text variant="bodyMd" as="p">
                          You're approaching your plan limit. Consider upgrading to avoid interruptions.
                        </Text>
                        {settings.plan === 'free' && (
                          <Button onClick={handleUpgrade}>
                            Upgrade to Pro →
                          </Button>
                        )}
                      </BlockStack>
                    </Banner>
                  )}

                  {/* Usage Card */}
                  <Card>
                    <BlockStack gap="500">
                      <Text variant="headingLg" as="h2">
                        Usage This Month
                      </Text>

                      {/* Active Recipes */}
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text variant="bodyMd" as="p">
                            Active Recipes
                          </Text>
                          <Text variant="bodyMd" as="p" tone="subdued">
                            {usage.activeRecipes.current} / {usage.activeRecipes.limit}
                          </Text>
                        </InlineStack>

                        <ProgressBar
                          progress={usage.activeRecipes.percentage}
                          tone={
                            usage.activeRecipes.percentage >= 100 ? 'critical' :
                            usage.activeRecipes.percentage >= 80 ? 'warning' :
                            'primary'
                          }
                        />

                        <Text variant="bodySm" as="p" alignment="end">
                          {usage.activeRecipes.percentage}%
                        </Text>
                      </BlockStack>

                      {/* Actions This Month */}
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text variant="bodyMd" as="p">
                            Actions This Month
                          </Text>
                          <Text variant="bodyMd" as="p" tone="subdued">
                            {usage.actions.current.toLocaleString()} / {usage.actions.limit.toLocaleString()}
                          </Text>
                        </InlineStack>

                        <ProgressBar
                          progress={usage.actions.percentage}
                          tone={
                            usage.actions.percentage >= 100 ? 'critical' :
                            usage.actions.percentage >= 80 ? 'warning' :
                            'primary'
                          }
                        />

                        <Text variant="bodySm" as="p" alignment="end">
                          {usage.actions.percentage}%
                        </Text>
                      </BlockStack>

                      {/* Bulk Operations */}
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text variant="bodyMd" as="p">
                            Bulk Operations This Week
                          </Text>
                          <Text variant="bodyMd" as="p" tone="subdued">
                            {usage.bulkOps.current} / {usage.bulkOps.limit}
                          </Text>
                        </InlineStack>

                        <ProgressBar
                          progress={usage.bulkOps.percentage}
                          tone={
                            usage.bulkOps.percentage >= 100 ? 'critical' :
                            usage.bulkOps.percentage >= 80 ? 'warning' :
                            'primary'
                          }
                        />

                        <Text variant="bodySm" as="p" alignment="end">
                          {usage.bulkOps.percentage}%
                        </Text>
                      </BlockStack>

                      <Divider />

                      <Text variant="bodySm" as="p" tone="subdued">
                        Resets: {formatDate(usage.resetDate, 'MMMM DD, YYYY')} ({getDaysUntilReset(usage.resetDate)} days)
                      </Text>
                    </BlockStack>
                  </Card>
                </BlockStack>
              )}

              {/* Tab 2: Preferences */}
              {selectedTab === 2 && (
                <Form method="post">
                  <input type="hidden" name="_action" value="updatePreferences" />

                  <Card>
                    <BlockStack gap="400">
                      <Text variant="headingLg" as="h2">
                        Preferences
                      </Text>

                      <Checkbox
                        label="Email notifications"
                        helpText="Receive weekly summary emails about automation activity"
                        checked={settings.preferences.emailNotifications}
                        name="emailNotifications"
                      />

                      <Select
                        label="Timezone"
                        options={TIMEZONES}
                        value={settings.preferences.timezone}
                        name="timezone"
                        helpText="Used for scheduling and activity log timestamps"
                      />

                      <TextField
                        label="Activity log retention"
                        value={`${settings.preferences.logRetentionDays} days (${settings.plan} plan)`}
                        disabled
                        autoComplete="off"
                        helpText={
                          settings.plan === 'free'
                            ? 'Upgrade to Pro for 365-day retention'
                            : 'Your logs are retained for the maximum allowed period'
                        }
                      />

                      <InlineStack gap="300">
                        <Button variant="primary" submit>
                          Save Changes
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                </Form>
              )}

              {/* Tab 3: Account */}
              {selectedTab === 3 && (
                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingLg" as="h2">
                      Account Information
                    </Text>

                    <BlockStack gap="300">
                      <div>
                        <Text variant="bodySm" as="p" tone="subdued">
                          Shop Name
                        </Text>
                        <Text variant="bodyMd" as="p">
                          {shop.shopName}
                        </Text>
                      </div>

                      <div>
                        <Text variant="bodySm" as="p" tone="subdued">
                          Shop Domain
                        </Text>
                        <Link url={`https://admin.shopify.com/store/${shop.shop.replace('.myshopify.com', '')}`} external>
                          {shop.shop}
                        </Link>
                      </div>

                      <div>
                        <Text variant="bodySm" as="p" tone="subdued">
                          Email
                        </Text>
                        <Text variant="bodyMd" as="p">
                          {shop.email}
                        </Text>
                      </div>

                      <div>
                        <Text variant="bodySm" as="p" tone="subdued">
                          Currency
                        </Text>
                        <Text variant="bodyMd" as="p">
                          {shop.currency}
                        </Text>
                      </div>

                      <div>
                        <Text variant="bodySm" as="p" tone="subdued">
                          Installed
                        </Text>
                        <Text variant="bodyMd" as="p">
                          {formatDate(shop.installedAt, 'MMMM DD, YYYY')}
                        </Text>
                      </div>
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Tabs>
        </Layout.Section>
      </Layout>

      {/* Upgrade Modal */}
      <Modal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade to Pro"
        primaryAction={{
          content: 'Start 14-Day Free Trial',
          onAction: async () => {
            const formData = new FormData();
            formData.append('_action', 'upgradeToPro');
            const response = await fetch('/app/settings', {
              method: 'POST',
              body: formData
            });
            if (response.ok) {
              setShowUpgradeModal(false);
              window.location.reload();
            }
          }
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setShowUpgradeModal(false)
        }]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">
              $19.99/month
            </Text>

            <Text variant="bodyMd" as="p">
              Start your 14-day free trial. No credit card required.
            </Text>

            <Divider />

            <BlockStack gap="200">
              <Text variant="headingSm" as="h4">
                Pro Plan includes:
              </Text>
              {PLAN_FEATURES.pro.map((feature, idx) => (
                <InlineStack key={idx} gap="200" blockAlign="center">
                  <Text tone="success">✓</Text>
                  <Text variant="bodyMd">{feature}</Text>
                </InlineStack>
              ))}
            </BlockStack>

            <Banner tone="info">
              <Text variant="bodySm" as="p">
                Your trial will automatically convert to a paid subscription after 14 days. You can cancel anytime.
              </Text>
            </Banner>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Contact Sales Modal */}
      <Modal
        open={showContactSalesModal}
        onClose={() => setShowContactSalesModal(false)}
        title="Contact Enterprise Sales"
        primaryAction={{
          content: 'Close',
          onAction: () => setShowContactSalesModal(false)
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="bodyMd" as="p">
              Enterprise plans are customized for high-volume Shopify stores with advanced automation needs.
            </Text>

            <BlockStack gap="200">
              <Text variant="headingSm" as="h4">
                Enterprise includes:
              </Text>
              {PLAN_FEATURES.enterprise.map((feature, idx) => (
                <InlineStack key={idx} gap="200" blockAlign="center">
                  <Text tone="success">✓</Text>
                  <Text variant="bodyMd">{feature}</Text>
                </InlineStack>
              ))}
            </BlockStack>

            <Divider />

            <Text variant="bodyMd" as="p">
              To learn more about Enterprise pricing and features, please contact our sales team at{' '}
              <Link url="mailto:enterprise@shopops.com">enterprise@shopops.com</Link>
            </Text>

            <Banner tone="info">
              <Text variant="bodySm" as="p">
                This is a mock contact form. In Phase 2, this will integrate with a CRM system.
              </Text>
            </Banner>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

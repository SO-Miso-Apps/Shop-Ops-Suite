/**
 * Activity Log Route
 *
 * Complete audit trail of all automation actions.
 * Provides transparency, debugging, and compliance reporting.
 */

import { useState, useCallback, useMemo } from 'react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useSearchParams, useSubmit } from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  ChoiceList,
  IndexTable,
  Badge,
  EmptyState,
  Pagination,
  Collapsible,
  Divider
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';
import { getDataService } from '~/services/data';
import { formatDateTime, formatRelativeTime } from '~/utils/formatters';
import type { MockAutomationLog, LogStatus, ActionType } from '~/mocks/types';

/**
 * Loader - Fetch and filter activity logs
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || 'all';
  const actionType = url.searchParams.get('actionType') || 'all';
  const resourceType = url.searchParams.get('resourceType') || 'all';
  const dateFrom = url.searchParams.get('dateFrom') || '';
  const dateTo = url.searchParams.get('dateTo') || '';

  try {
    const dataService = getDataService();

    // Build filters
    const filters: any = {};
    if (status !== 'all') filters.status = status;
    if (actionType !== 'all') filters.actionType = actionType;
    if (resourceType !== 'all') filters.resourceType = resourceType;
    if (search) filters.search = search;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    // Fetch paginated logs
    const result = await dataService.getActivityLogs(filters, { page, limit: 50 });

    return json({
      logs: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      },
      filters: {
        search,
        status,
        actionType,
        resourceType,
        dateFrom,
        dateTo
      }
    });
  } catch (error) {
    console.error('Activity log loader error:', error);
    throw new Error('Failed to load activity logs');
  }
}

/**
 * Action - Export to CSV
 */
export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);

  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'export') {
    try {
      const dataService = getDataService();

      // Get all logs matching current filters (no pagination for export)
      const search = formData.get('search') as string || '';
      const status = formData.get('status') as string || 'all';
      const actionType = formData.get('actionType') as string || 'all';
      const resourceType = formData.get('resourceType') as string || 'all';
      const dateFrom = formData.get('dateFrom') as string || '';
      const dateTo = formData.get('dateTo') as string || '';

      const filters: any = {};
      if (status !== 'all') filters.status = status;
      if (actionType !== 'all') filters.actionType = actionType;
      if (resourceType !== 'all') filters.resourceType = resourceType;
      if (search) filters.search = search;
      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);

      const result = await dataService.getActivityLogs(filters, { page: 1, limit: 10000 });

      // Generate CSV
      const csv = generateCSV(result.data);

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="activity-log-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } catch (error) {
      console.error('CSV export error:', error);
      return json({ success: false, error: 'Failed to export CSV' }, { status: 500 });
    }
  }

  return json({ success: false, error: 'Unknown action' }, { status: 400 });
}

/**
 * Generate CSV from logs
 */
function generateCSV(logs: MockAutomationLog[]): string {
  const headers = ['Time', 'Recipe', 'Action', 'Resource Type', 'Resource', 'Status', 'Changes Made', 'Error Message'];
  const rows = logs.map(log => [
    new Date(log.createdAt).toISOString(),
    log.recipeTitle,
    log.actionType,
    log.resourceType,
    log.resourceTitle,
    log.status,
    log.changesMade?.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ') || '',
    log.errorMessage || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Activity Log Component
 */
export default function ActivityLog() {
  const { logs, pagination, filters } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const submit = useSubmit();

  // Local state
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([filters.status]);
  const [selectedActionType, setSelectedActionType] = useState<string[]>([filters.actionType]);
  const [selectedResourceType, setSelectedResourceType] = useState<string[]>([filters.resourceType]);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);

  // Apply filters
  const applyFilters = useCallback(() => {
    const newParams = new URLSearchParams();
    if (searchTerm) newParams.set('search', searchTerm);
    if (selectedStatus[0] !== 'all') newParams.set('status', selectedStatus[0]);
    if (selectedActionType[0] !== 'all') newParams.set('actionType', selectedActionType[0]);
    if (selectedResourceType[0] !== 'all') newParams.set('resourceType', selectedResourceType[0]);
    if (dateFrom) newParams.set('dateFrom', dateFrom);
    if (dateTo) newParams.set('dateTo', dateTo);
    newParams.set('page', '1'); // Reset to page 1 when filters change
    setSearchParams(newParams, { replace: true });
  }, [searchTerm, selectedStatus, selectedActionType, selectedResourceType, dateFrom, dateTo, setSearchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedStatus(['all']);
    setSelectedActionType(['all']);
    setSelectedResourceType(['all']);
    setDateFrom('');
    setDateTo('');
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Toggle row expansion
  const toggleRow = useCallback((logId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  }, []);

  // Pagination handlers
  const goToPage = useCallback((page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(page));
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Export to CSV
  const handleExport = useCallback(() => {
    const formData = new FormData();
    formData.append('_action', 'export');
    formData.append('search', searchTerm);
    formData.append('status', selectedStatus[0]);
    formData.append('actionType', selectedActionType[0]);
    formData.append('resourceType', selectedResourceType[0]);
    formData.append('dateFrom', dateFrom);
    formData.append('dateTo', dateTo);
    submit(formData, { method: 'post' });
  }, [submit, searchTerm, selectedStatus, selectedActionType, selectedResourceType, dateFrom, dateTo]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedStatus[0] !== 'all') count++;
    if (selectedActionType[0] !== 'all') count++;
    if (selectedResourceType[0] !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [searchTerm, selectedStatus, selectedActionType, selectedResourceType, dateFrom, dateTo]);

  const hasLogs = logs.length > 0;

  return (
    <Page>
      <TitleBar title="Activity Log">
        <button onClick={handleExport}>
          Export CSV
        </button>
      </TitleBar>

      <BlockStack gap="500">
        {/* Filters Section */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h2">
                    Filters
                  </Text>
                  <InlineStack gap="200">
                    {activeFiltersCount > 0 && (
                      <Badge tone="info">{activeFiltersCount} active</Badge>
                    )}
                    <Button
                      plain
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      {showFilters ? 'Hide' : 'Show'}
                    </Button>
                  </InlineStack>
                </InlineStack>

                <Collapsible
                  open={showFilters}
                  id="filters-collapsible"
                  transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
                >
                  <BlockStack gap="400">
                    {/* Search */}
                    <TextField
                      label="Search"
                      value={searchTerm}
                      onChange={setSearchTerm}
                      placeholder="Search by recipe, resource, or action..."
                      autoComplete="off"
                      clearButton
                      onClearButtonClick={() => setSearchTerm('')}
                    />

                    {/* Date Range */}
                    <InlineStack gap="400" wrap>
                      <div style={{ flex: '1 1 0', minWidth: '200px' }}>
                        <TextField
                          label="From Date"
                          type="date"
                          value={dateFrom}
                          onChange={setDateFrom}
                          autoComplete="off"
                        />
                      </div>
                      <div style={{ flex: '1 1 0', minWidth: '200px' }}>
                        <TextField
                          label="To Date"
                          type="date"
                          value={dateTo}
                          onChange={setDateTo}
                          autoComplete="off"
                        />
                      </div>
                    </InlineStack>

                    {/* Filter Dropdowns */}
                    <InlineStack gap="400" wrap>
                      <div style={{ flex: '1 1 0', minWidth: '200px' }}>
                        <ChoiceList
                          title="Status"
                          choices={[
                            { label: 'All Statuses', value: 'all' },
                            { label: '✅ Success', value: 'success' },
                            { label: '❌ Failure', value: 'failure' },
                            { label: '⚠️ Partial', value: 'partial' }
                          ]}
                          selected={selectedStatus}
                          onChange={setSelectedStatus}
                        />
                      </div>
                      <div style={{ flex: '1 1 0', minWidth: '200px' }}>
                        <ChoiceList
                          title="Action Type"
                          choices={[
                            { label: 'All Actions', value: 'all' },
                            { label: 'Add Tag', value: 'addTag' },
                            { label: 'Remove Tag', value: 'removeTag' },
                            { label: 'Set Metafield', value: 'setMetafield' }
                          ]}
                          selected={selectedActionType}
                          onChange={setSelectedActionType}
                        />
                      </div>
                      <div style={{ flex: '1 1 0', minWidth: '200px' }}>
                        <ChoiceList
                          title="Resource Type"
                          choices={[
                            { label: 'All Resources', value: 'all' },
                            { label: 'Product', value: 'product' },
                            { label: 'Customer', value: 'customer' },
                            { label: 'Order', value: 'order' }
                          ]}
                          selected={selectedResourceType}
                          onChange={setSelectedResourceType}
                        />
                      </div>
                    </InlineStack>

                    {/* Filter Actions */}
                    <InlineStack gap="300">
                      <Button onClick={applyFilters} variant="primary">
                        Apply Filters
                      </Button>
                      {activeFiltersCount > 0 && (
                        <Button onClick={clearFilters}>
                          Clear All
                        </Button>
                      )}
                    </InlineStack>
                  </BlockStack>
                </Collapsible>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Activity Table */}
        {!hasLogs ? (
          <Layout>
            <Layout.Section>
              <EmptyState
                heading="No activity logs found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  {activeFiltersCount > 0
                    ? 'Try adjusting your filters to see more results'
                    : 'Activity will appear here once you activate recipes and they start processing'}
                </p>
                {activeFiltersCount > 0 && (
                  <Button onClick={clearFilters}>Clear filters</Button>
                )}
              </EmptyState>
            </Layout.Section>
          </Layout>
        ) : (
          <Layout>
            <Layout.Section>
              <Card padding="0">
                <IndexTable
                  itemCount={logs.length}
                  selectable={false}
                  headings={[
                    { title: 'Time' },
                    { title: 'Recipe' },
                    { title: 'Action' },
                    { title: 'Resource' },
                    { title: 'Status' }
                  ]}
                >
                  {logs.map((log: MockAutomationLog, index: number) => {
                    const isExpanded = expandedRows.has(log.logId);

                    return (
                      <IndexTable.Row
                        id={log.logId}
                        key={log.logId}
                        position={index}
                        onClick={() => toggleRow(log.logId)}
                      >
                        <IndexTable.Cell>
                          <BlockStack gap="100">
                            <Text variant="bodyMd" as="span">
                              {formatRelativeTime(log.createdAt)}
                            </Text>
                            <Text variant="bodySm" as="span" tone="subdued">
                              {formatDateTime(log.createdAt)}
                            </Text>
                          </BlockStack>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Text variant="bodyMd" as="span">
                            {log.recipeTitle}
                          </Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Text variant="bodyMd" as="span">
                            {formatActionType(log.actionType)}
                          </Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <BlockStack gap="100">
                            <Text variant="bodyMd" as="span">
                              {log.resourceTitle}
                            </Text>
                            <Text variant="bodySm" as="span" tone="subdued">
                              {log.resourceType}
                            </Text>
                          </BlockStack>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Badge tone={getStatusTone(log.status)}>
                            {log.status}
                          </Badge>
                        </IndexTable.Cell>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <IndexTable.Cell colSpan={5}>
                            <div style={{ padding: '16px', backgroundColor: '#f9fafb' }}>
                              <BlockStack gap="400">
                                <Divider />

                                {/* Log Details */}
                                <BlockStack gap="300">
                                  <Text variant="headingSm" as="h3">
                                    Details
                                  </Text>

                                  <InlineStack gap="400" wrap>
                                    <div style={{ flex: '1 1 0', minWidth: '200px' }}>
                                      <BlockStack gap="100">
                                        <Text variant="bodySm" as="span" tone="subdued">
                                          Log ID
                                        </Text>
                                        <Text variant="bodyMd" as="span">
                                          {log.logId}
                                        </Text>
                                      </BlockStack>
                                    </div>
                                    <div style={{ flex: '1 1 0', minWidth: '200px' }}>
                                      <BlockStack gap="100">
                                        <Text variant="bodySm" as="span" tone="subdued">
                                          Recipe ID
                                        </Text>
                                        <Text variant="bodyMd" as="span">
                                          {log.recipeId}
                                        </Text>
                                      </BlockStack>
                                    </div>
                                    <div style={{ flex: '1 1 0', minWidth: '200px' }}>
                                      <BlockStack gap="100">
                                        <Text variant="bodySm" as="span" tone="subdued">
                                          Resource ID
                                        </Text>
                                        <Text variant="bodyMd" as="span">
                                          {log.resourceId}
                                        </Text>
                                      </BlockStack>
                                    </div>
                                  </InlineStack>
                                </BlockStack>

                                {/* Changes Made */}
                                {log.changesMade && log.changesMade.length > 0 && (
                                  <BlockStack gap="300">
                                    <Text variant="headingSm" as="h3">
                                      Changes Made
                                    </Text>
                                    <div style={{
                                      backgroundColor: 'white',
                                      padding: '12px',
                                      borderRadius: '8px',
                                      border: '1px solid #e1e3e5'
                                    }}>
                                      <BlockStack gap="200">
                                        {log.changesMade.map((change, idx) => (
                                          <InlineStack key={idx} gap="200" blockAlign="center">
                                            <Text variant="bodyMd" as="span" fontWeight="medium">
                                              {change.field}:
                                            </Text>
                                            <Badge tone="warning">{String(change.oldValue || 'null')}</Badge>
                                            <Text variant="bodyMd" as="span">→</Text>
                                            <Badge tone="success">{String(change.newValue || 'null')}</Badge>
                                          </InlineStack>
                                        ))}
                                      </BlockStack>
                                    </div>
                                  </BlockStack>
                                )}

                                {/* Error Message */}
                                {log.errorMessage && (
                                  <BlockStack gap="300">
                                    <Text variant="headingSm" as="h3">
                                      Error Message
                                    </Text>
                                    <div style={{
                                      backgroundColor: '#fef3f2',
                                      padding: '12px',
                                      borderRadius: '8px',
                                      border: '1px solid #f87171'
                                    }}>
                                      <Text variant="bodyMd" as="p" tone="critical">
                                        {log.errorMessage}
                                      </Text>
                                    </div>
                                  </BlockStack>
                                )}
                              </BlockStack>
                            </div>
                          </IndexTable.Cell>
                        )}
                      </IndexTable.Row>
                    );
                  })}
                </IndexTable>
              </Card>
            </Layout.Section>
          </Layout>
        )}

        {/* Pagination */}
        {hasLogs && pagination.totalPages > 1 && (
          <Layout>
            <Layout.Section>
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
                <Pagination
                  hasPrevious={pagination.page > 1}
                  onPrevious={() => goToPage(pagination.page - 1)}
                  hasNext={pagination.page < pagination.totalPages}
                  onNext={() => goToPage(pagination.page + 1)}
                  label={`Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total logs)`}
                />
              </div>
            </Layout.Section>
          </Layout>
        )}

        {/* Summary Stats */}
        {hasLogs && (
          <Layout>
            <Layout.Section>
              <Card>
                <InlineStack gap="400" align="space-between">
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    {activeFiltersCount > 0 ? `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} applied` : 'No filters applied'}
                  </Text>
                </InlineStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}

/**
 * Helper: Get badge tone from status
 */
function getStatusTone(status: LogStatus): 'success' | 'critical' | 'warning' {
  switch (status) {
    case 'success': return 'success';
    case 'failure': return 'critical';
    case 'partial': return 'warning';
    default: return 'warning';
  }
}

/**
 * Helper: Format action type for display
 */
function formatActionType(actionType: ActionType): string {
  switch (actionType) {
    case 'addTag': return 'Add Tag';
    case 'removeTag': return 'Remove Tag';
    case 'setMetafield': return 'Set Metafield';
    default: return actionType;
  }
}

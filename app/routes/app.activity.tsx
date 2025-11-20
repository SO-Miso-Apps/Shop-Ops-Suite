import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigate, useSearchParams, useRevalidator } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    IndexTable,
    Text,
    Badge,
    ChoiceList,
    IndexFilters,
    type IndexFiltersProps,
    useSetIndexFiltersMode,
    Button,
    Tooltip,
    List,
    Pagination,
    Popover,
    ActionList,
    Icon,
    ButtonGroup,
} from "@shopify/polaris";
import { CalendarIcon } from '@shopify/polaris-icons';
import { useCallback, useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import { ActivityService } from "../services/activity.service";
import { RevertService } from "../services/revert.service";
import { Backup } from "../models/Backup";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);

    // Parse URL params for filters and pagination
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || 'All';
    const status = url.searchParams.get('status')?.split(',').filter(Boolean) || [];
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const dateRange = url.searchParams.get('dateRange') || '';

    // Calculate date range
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (dateRange) {
        endDate = new Date();
        switch (dateRange) {
            case 'today':
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                break;
            case '7days':
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '1month':
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                break;
        }
    }

    // Get logs with server-side filtering and pagination
    const result = await ActivityService.getLogs(session.shop, limit, {
        category: category !== 'All' ? category : undefined,
        status: status.length > 0 ? status : undefined,
        search: search || undefined,
        page,
        startDate,
        endDate,
    });
    const logs = result.logs;

    // Check for backups
    const logsWithBackup = await Promise.all(logs.map(async (log: any) => {
        let hasBackup = false;
        if (log.jobId && log.resourceId === "Bulk") {
            const count = await Backup.countDocuments({ shop: session.shop, jobId: log.jobId });
            hasBackup = count > 0;
        }
        return { ...log, hasBackup };
    }));

    return json({
        logs: logsWithBackup,
        pagination: {
            currentPage: page,
            totalPages: result.totalPages,
            totalLogs: result.totalCount,
            limit,
        },
        dateRange,
    });
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const actionType = formData.get("actionType");

    if (actionType === "revert") {
        const jobId = formData.get("jobId") as string;
        try {
            await RevertService.revertBackup(session.shop, jobId);
            return json({ success: true, message: "Revert started" });
        } catch (e) {
            return json({ success: false, message: (e as Error).message }, { status: 400 });
        }
    }

    return null;
};

// Action categories for tabs
const ACTION_CATEGORIES = {
    "All": ["*"],
    "Tags": ["Smart Tag Applied", "Tag Cleanup", "Bulk Tag Update", "Auto-Tag"],
    "Bulk Operations": ["Bulk Operation", "Bulk Tag Update", "Bulk Update"],
    "Metafields": ["Metafield Updated", "Metafield Created", "COGS Updated"],
    "Data Cleaning": ["Tag Cleanup", "Data Cleanup"],
    "System": ["Webhook Received", "Job Queued", "Job Completed"],
};

export default function Activity() {
    const { logs, pagination, dateRange } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const revalidator = useRevalidator();
    const [datePopoverActive, setDatePopoverActive] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            revalidator.revalidate();
        }, 5000);
        return () => clearInterval(interval);
    }, [revalidator]);

    const resourceName = {
        singular: 'log',
        plural: 'logs',
    };

    // Get filter state from URL params
    const currentCategory = searchParams.get('category') || 'All';
    const currentSearch = searchParams.get('search') || '';
    const currentStatus = searchParams.get('status')?.split(',').filter(Boolean) || [];
    const currentPage = pagination?.currentPage || 1;

    // Find selected tab index from category
    const categoryKeys = Object.keys(ACTION_CATEGORIES);
    const selectedTab = categoryKeys.indexOf(currentCategory);

    // Update URL with new filters (triggers loader refresh)
    const updateFilters = useCallback((updates: {
        category?: string;
        search?: string;
        status?: string[];
        page?: number;
        dateRange?: string;
    }) => {
        const params = new URLSearchParams(searchParams);

        if (updates.category !== undefined) {
            if (updates.category === 'All') {
                params.delete('category');
            } else {
                params.set('category', updates.category);
            }
        }

        if (updates.search !== undefined) {
            if (updates.search) {
                params.set('search', updates.search);
            } else {
                params.delete('search');
            }
        }

        if (updates.status !== undefined) {
            if (updates.status.length > 0) {
                params.set('status', updates.status.join(','));
            } else {
                params.delete('status');
            }
        }

        if (updates.page !== undefined) {
            if (updates.page > 1) {
                params.set('page', updates.page.toString());
            } else {
                params.delete('page');
            }
        }

        if (updates.dateRange !== undefined) {
            if (updates.dateRange) {
                params.set('dateRange', updates.dateRange);
            } else {
                params.delete('dateRange');
            }
        }

        navigate(`?${params.toString()}`, { replace: true });
    }, [navigate, searchParams]);

    const handleFiltersQueryChange = useCallback(
        (value: string) => updateFilters({ search: value }),
        [updateFilters],
    );

    const handleStatusFilterChange = useCallback(
        (value: string[]) => updateFilters({ status: value }),
        [updateFilters],
    );

    const handleTabChange = useCallback(
        (tabIndex: number) => {
            const category = categoryKeys[tabIndex];
            updateFilters({ category });
        },
        [categoryKeys, updateFilters],
    );

    const handleFiltersClearAll = useCallback(() => {
        navigate('/app/activity', { replace: true });
    }, [navigate]);

    const handleRevert = (jobId: string) => {
        if (confirm("Are you sure you want to revert this bulk operation? This will restore the original tags.")) {
            submit({ actionType: "revert", jobId }, { method: "post" });
        }
    };

    // IndexFilters configuration
    const filters = [
        {
            key: 'status',
            label: 'Status',
            filter: (
                <ChoiceList
                    title="Status"
                    titleHidden
                    choices={[
                        { label: 'Success', value: 'Success' },
                        { label: 'Failed', value: 'Failed' },
                        { label: 'Pending', value: 'Pending' },
                    ]}
                    selected={currentStatus}
                    onChange={handleStatusFilterChange}
                    allowMultiple
                />
            ),
            shortcut: true,
        },
    ];

    const appliedFilters: IndexFiltersProps['appliedFilters'] = [];
    if (currentStatus.length > 0) {
        appliedFilters.push({
            key: 'status',
            label: `Status: ${currentStatus.join(', ')}`,
            onRemove: () => handleStatusFilterChange([]),
        });
    }

    // Create tabs for IndexFilters
    const tabs = categoryKeys.map((category) => ({
        content: category,
        index: categoryKeys.indexOf(category),
        id: category.toLowerCase().replace(/\s+/g, '-'),
    }));

    // No client-side filtering - logs already filtered by backend
    const rowMarkup = logs.map(
        ({ id, resourceType, action, details, status, timestamp, hasBackup, jobId }: any, index: number) => {
            // Get the latest detail message
            const latestDetail = details && details.length > 0
                ? details[details.length - 1].message
                : 'No details';

            // Create full history for tooltip
            const fullHistory = details && details.length > 0
                ? (
                    <List>
                        {details.map((detail: any, index: number) => (
                            <List.Item key={index}>
                                <Text variant="bodyMd" as="span">
                                    [{new Date(detail.timestamp).toLocaleString()}] {detail.message}
                                </Text>
                            </List.Item>
                        ))}
                    </List>
                )
                : 'No details';

            return (
                <IndexTable.Row
                    id={id}
                    key={id}
                    position={index}
                >
                    <IndexTable.Cell>
                        <Text variant="bodyMd" fontWeight="bold" as="span">
                            {action}
                        </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{resourceType}</IndexTable.Cell>
                    <IndexTable.Cell>
                        <Tooltip content={fullHistory}>
                            <Text as="span" truncate>
                                {latestDetail.length > 50 ? latestDetail.substring(0, 50) + "..." : latestDetail}
                                {details && details.length > 1 && ` (+${details.length - 1} more)`}
                            </Text>
                        </Tooltip>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Badge tone={status === 'Success' ? 'success' : status === 'Failed' ? 'critical' : 'info'}>
                            {status}
                        </Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        {new Date(timestamp).toLocaleString()}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        {hasBackup && (
                            <Button size="micro" onClick={() => handleRevert(jobId)}>Revert</Button>
                        )}
                    </IndexTable.Cell>
                </IndexTable.Row>
            );
        }
    );

    const { mode, setMode } = useSetIndexFiltersMode();

    // Get date range label
    const getDateRangeLabel = () => {
        switch (dateRange) {
            case 'today': return 'Today';
            case '7days': return 'Last 7 Days';
            case '1month': return 'Last Month';
            default: return 'All Time';
        }
    };

    // Date range popover activator
    const dateRangeActivator = (
        <Button
            onClick={() => setDatePopoverActive(!datePopoverActive)}
            disclosure={datePopoverActive ? 'up' : 'down'}
            icon={CalendarIcon}
        >
            {getDateRangeLabel()}
        </Button>
    );
    const secondaryActions = (
        <ButtonGroup>
            <Popover
                active={datePopoverActive}
                activator={dateRangeActivator}
                onClose={() => setDatePopoverActive(false)}
            >
                <ActionList
                    items={[
                        {
                            content: 'All Time',
                            onAction: () => {
                                updateFilters({ dateRange: '' });
                                setDatePopoverActive(false);
                            },
                        },
                        {
                            content: 'Today',
                            onAction: () => {
                                updateFilters({ dateRange: 'today' });
                                setDatePopoverActive(false);
                            },
                        },
                        {
                            content: 'Last 7 Days',
                            onAction: () => {
                                updateFilters({ dateRange: '7days' });
                                setDatePopoverActive(false);
                            },
                        },
                        {
                            content: 'Last Month',
                            onAction: () => {
                                updateFilters({ dateRange: '1month' });
                                setDatePopoverActive(false);
                            },
                        },
                    ]}
                />
            </Popover>
        </ButtonGroup>
    );
    return (
        <Page
            title="Activity Log"
            filterActions={true}
            secondaryActions={secondaryActions}
        >
            <Layout>
                <Layout.Section>
                    <Card padding="0">
                        <IndexFilters
                            queryValue={currentSearch}
                            queryPlaceholder="Search activities..."
                            onQueryChange={handleFiltersQueryChange}
                            onQueryClear={() => handleFiltersQueryChange('')}
                            filters={filters}
                            appliedFilters={appliedFilters}
                            onClearAll={handleFiltersClearAll}
                            mode={mode}
                            setMode={setMode}
                            tabs={tabs}
                            selected={selectedTab >= 0 ? selectedTab : 0}
                            onSelect={handleTabChange}
                            canCreateNewView={false}
                        />
                        <IndexTable
                            resourceName={resourceName}
                            itemCount={logs.length}
                            selectable={false}
                            headings={[
                                { title: 'Action' },
                                { title: 'Resource' },
                                { title: 'Detail' },
                                { title: 'Status' },
                                { title: 'Time' },
                                { title: 'Actions' },
                            ]}
                            emptyState={
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <Text as="p" tone="subdued">
                                        No {currentCategory.toLowerCase()} activities found
                                    </Text>
                                </div>
                            }
                        >
                            {rowMarkup}
                        </IndexTable>
                        {pagination && pagination.totalPages > 1 && (
                            <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                                <Pagination
                                    hasPrevious={currentPage > 1}
                                    onPrevious={() => updateFilters({ page: currentPage - 1 })}
                                    hasNext={currentPage < pagination.totalPages}
                                    onNext={() => updateFilters({ page: currentPage + 1 })}
                                    label={`Page ${currentPage} of ${pagination.totalPages} (${pagination.totalLogs} total logs)`}
                                />
                            </div>
                        )}
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}

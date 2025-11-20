import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigate, useSearchParams } from "@remix-run/react";
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
} from "@shopify/polaris";
import { useCallback } from "react";
import { authenticate } from "../shopify.server";
import { ActivityService } from "../services/activity.service";
import { RevertService } from "../services/revert.service";
import { Backup } from "../models/Backup";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);

    // Parse URL params for filters
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || 'All';
    const status = url.searchParams.get('status')?.split(',').filter(Boolean) || [];
    const search = url.searchParams.get('search') || '';

    // Get logs with server-side filtering
    const logs = await ActivityService.getLogs(session.shop, 50, {
        category: category !== 'All' ? category : undefined,
        status: status.length > 0 ? status : undefined,
        search: search || undefined,
    });

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
        logs: logsWithBackup
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
    const { logs } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const resourceName = {
        singular: 'log',
        plural: 'logs',
    };

    // Get filter state from URL params
    const currentCategory = searchParams.get('category') || 'All';
    const currentSearch = searchParams.get('search') || '';
    const currentStatus = searchParams.get('status')?.split(',').filter(Boolean) || [];

    // Find selected tab index from category
    const categoryKeys = Object.keys(ACTION_CATEGORIES);
    const selectedTab = categoryKeys.indexOf(currentCategory);

    // Update URL with new filters (triggers loader refresh)
    const updateFilters = useCallback((updates: {
        category?: string;
        search?: string;
        status?: string[];
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
        ({ id, resourceType, action, detail, status, timestamp, hasBackup, jobId }: any, index: number) => (
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
                    <Tooltip content={detail}>
                        <Text as="span" truncate>
                            {detail.length > 50 ? detail.substring(0, 50) + "..." : detail}
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
        ),
    );

    const { mode, setMode } = useSetIndexFiltersMode();

    return (
        <Page title="Activity Log">
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
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}

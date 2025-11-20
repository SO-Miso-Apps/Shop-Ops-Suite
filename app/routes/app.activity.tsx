import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    IndexTable,
    Text,
    Badge,
    useIndexResourceState,
    Filters,
    ChoiceList,
    type IndexFiltersProps,
    useSetIndexFiltersMode,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { ActivityService } from "../services/activity.service";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);

    // Simple pagination (first 50) for MVP
    const logs = await ActivityService.getLogs(session.shop, 50);

    return json({
        logs
    });
};

export default function Activity() {
    const { logs } = useLoaderData<typeof loader>();

    const resourceName = {
        singular: 'log',
        plural: 'logs',
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange } =
        useIndexResourceState(logs);

    // Filtering State
    const [queryValue, setQueryValue] = useState('');
    const [statusFilter, setStatusFilter] = useState<string[]>([]);

    const handleFiltersQueryChange = useCallback(
        (value: string) => setQueryValue(value),
        [],
    );

    const handleStatusFilterChange = useCallback(
        (value: string[]) => setStatusFilter(value),
        [],
    );

    const handleFiltersClearAll = useCallback(() => {
        handleFiltersQueryChange('');
        handleStatusFilterChange([]);
    }, [handleFiltersQueryChange, handleStatusFilterChange]);

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
                    ]}
                    selected={statusFilter || []}
                    onChange={handleStatusFilterChange}
                    allowMultiple
                />
            ),
            shortcut: true,
        },
    ];

    const appliedFilters: IndexFiltersProps['appliedFilters'] = [];
    if (statusFilter.length > 0) {
        const key = 'status';
        appliedFilters.push({
            key,
            label: `Status: ${statusFilter.join(', ')}`,
            onRemove: () => handleStatusFilterChange([]),
        });
    }

    // Filter Logic (Client-side for MVP)
    const filteredLogs = logs.filter((log: any) => {
        const matchesQuery = log.detail.toLowerCase().includes(queryValue.toLowerCase()) ||
            log.action.toLowerCase().includes(queryValue.toLowerCase());
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(log.status);
        return matchesQuery && matchesStatus;
    });

    const rowMarkup = filteredLogs.map(
        ({ id, resourceType, resourceId, action, detail, status, timestamp }: any, index: number) => (
            <IndexTable.Row
                id={id}
                key={id}
                selected={selectedResources.includes(id)}
                position={index}
            >
                <IndexTable.Cell>
                    <Text variant="bodyMd" fontWeight="bold" as="span">
                        {action}
                    </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{resourceType}</IndexTable.Cell>
                <IndexTable.Cell>{detail}</IndexTable.Cell>
                <IndexTable.Cell>
                    <Badge tone={status === 'Success' ? 'success' : 'critical'}>
                        {status}
                    </Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    {new Date(timestamp).toLocaleString()}
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
                        <Filters
                            queryValue={queryValue}
                            filters={filters}
                            appliedFilters={appliedFilters}
                            onQueryChange={handleFiltersQueryChange}
                            onQueryClear={() => handleFiltersQueryChange('')}
                            onClearAll={handleFiltersClearAll}
                        />
                        <IndexTable
                            resourceName={resourceName}
                            itemCount={filteredLogs.length}
                            selectedItemsCount={
                                allResourcesSelected ? 'All' : selectedResources.length
                            }
                            onSelectionChange={handleSelectionChange}
                            headings={[
                                { title: 'Action' },
                                { title: 'Resource' },
                                { title: 'Detail' },
                                { title: 'Status' },
                                { title: 'Time' },
                            ]}
                        >
                            {rowMarkup}
                        </IndexTable>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}

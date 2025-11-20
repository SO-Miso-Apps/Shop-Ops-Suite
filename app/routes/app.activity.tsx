import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
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
    Button,
    ButtonGroup,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { ActivityService } from "../services/activity.service";
import { RevertService } from "../services/revert.service";
import { Backup } from "../models/Backup";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);

    // Simple pagination (first 50) for MVP
    const logs = await ActivityService.getLogs(session.shop, 50);

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

export default function Activity() {
    const { logs } = useLoaderData<typeof loader>();
    const submit = useSubmit();

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

    const handleRevert = (jobId: string) => {
        if (confirm("Are you sure you want to revert this bulk operation? This will restore the original tags.")) {
            submit({ actionType: "revert", jobId }, { method: "post" });
        }
    };

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
        ({ id, resourceType, resourceId, action, detail, status, timestamp, hasBackup, jobId }: any, index: number) => (
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
                                { title: 'Actions' },
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

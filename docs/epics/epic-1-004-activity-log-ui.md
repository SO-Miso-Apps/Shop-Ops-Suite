# Epic 4: Activity Log UI

**Status:** ✅ Complete
**Priority:** P0 (Blocker)
**Estimated Duration:** 3 days
**Dependencies:** Epic 1 (Core UI Infrastructure) ✅
**Phase:** Phase 1 - MVP

---

## Epic Overview

Build the Activity Log interface to provide complete transparency into all automation actions. This is a critical trust-building feature and debugging tool that differentiates Shop-Ops Suite from competitors.

## Business Value

- **Transparency:** Shows exactly what the app is doing (builds trust)
- **Debugging:** Helps users troubleshoot issues without contacting support
- **Compliance:** Provides audit trail for data changes
- **Competitive Moat:** Most competitor apps have poor/no logging

## Success Criteria

- [x] Activity log displays all mock automation logs
- [x] Table shows: timestamp, recipe, action, resource, status
- [x] Expandable rows show detailed information
- [x] Filters work: date range, action type, resource type, status
- [x] Search by resource ID or name
- [x] Export to CSV functionality
- [x] Pagination (50 items per page)
- [x] Mobile responsive design
- [x] Direct links to Shopify Admin resources

---

## Tasks

### Task 4.1: Activity Log Route & Layout

**Estimated Time:** 2 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Create the activity log route with page layout, filters, and table structure.

#### Acceptance Criteria
- [x] Route `/app/activity` renders correctly
- [x] Page title "Activity Log" with "Export CSV" action
- [x] Filters section at top
- [x] Table displays below filters
- [x] Pagination controls at bottom

#### Subtasks

##### Subtask 4.1.1: Create Activity Log Route
**Estimated Time:** 1 hour

**Steps:**
1. Create `app/routes/app.activity.tsx`
2. Set up basic page structure:
   ```tsx
   <Page
     title="Activity Log"
     primaryAction={{
       content: 'Export CSV',
       onAction: handleExportCSV
     }}
   >
     <Layout>
       <Layout.Section>
         {/* Filters */}
       </Layout.Section>
       <Layout.Section>
         {/* Activity table */}
       </Layout.Section>
     </Layout>
   </Page>
   ```
3. Import mock data service
4. Define TypeScript interfaces for filters and log data

**Acceptance Criteria:**
- [x] Route accessible at `/app/activity`
- [x] Page title displays correctly
- [x] Export CSV button visible
- [x] Layout renders without errors

**Files to Create:**
- `app/routes/app.activity.tsx`

---

##### Subtask 4.1.2: Fetch Activity Log Data
**Estimated Time:** 1 hour

**Steps:**
1. In loader, parse URL query params:
   - `dateRange` (e.g., "last7days", "last30days", "custom")
   - `actionType` (e.g., "all", "addTag", "removeTag", etc.)
   - `resourceType` (e.g., "all", "product", "customer", "order")
   - `status` (e.g., "all", "success", "failure", "partial")
   - `search` (resource ID or name)
   - `page` (default: 1)
2. Call `dataService.getActivityLogs(filters)`
3. Apply pagination (50 items per page)
4. Return logs and filter state

**Acceptance Criteria:**
- [x] Loader fetches logs with filters applied
- [x] Pagination works correctly
- [x] URL params update on filter change
- [x] TypeScript types correct
- [x] Error handling for service failures

**Files to Modify:**
- `app/routes/app.activity.tsx`

**Example Code:**
```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const filters = {
    dateRange: url.searchParams.get('dateRange') || 'last7days',
    actionType: url.searchParams.get('actionType') || 'all',
    resourceType: url.searchParams.get('resourceType') || 'all',
    status: url.searchParams.get('status') || 'all',
    search: url.searchParams.get('search') || '',
    page: parseInt(url.searchParams.get('page') || '1', 10),
  };

  const dataService = getDataService();
  const { logs, totalCount } = await dataService.getActivityLogs({
    ...filters,
    limit: 50,
    offset: (filters.page - 1) * 50,
  });

  return json({
    logs,
    totalCount,
    filters,
    totalPages: Math.ceil(totalCount / 50),
  });
}
```

---

### Task 4.2: Filters UI

**Estimated Time:** 3 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Build comprehensive filter controls for date range, action type, resource type, status, and search.

#### Acceptance Criteria
- [x] Date range dropdown (Last 7 days, Last 30 days, Last 90 days, Custom)
- [x] Action type dropdown (All, Add tag, Remove tag, Set metafield, etc.)
- [x] Resource type dropdown (All, Product, Customer, Order)
- [x] Status dropdown (All, Success, Failure, Partial)
- [x] Search input (resource ID or name)
- [x] Clear filters button
- [x] Filters update URL params
- [x] Active filter count badge

#### Subtasks

##### Subtask 4.2.1: Create Filter Bar Component
**Estimated Time:** 2 hours

**Steps:**
1. Create filters section above table
2. Use Polaris `Filters` component
3. Add filter controls:
   - Date range: `Select` component
   - Action type: `Select` component
   - Resource type: `Select` component
   - Status: `Select` component
4. Add search input: `TextField` with search icon
5. Add "Clear Filters" button
6. Show active filter count badge (e.g., "3 filters active")

**Acceptance Criteria:**
- [x] All 5 filter controls rendered
- [x] Dropdowns populated with correct options
- [x] Search input accepts text
- [x] Clear button resets all filters
- [x] Filter count badge updates dynamically
- [x] Mobile: filters stack vertically

**Files to Modify:**
- `app/routes/app.activity.tsx`

**Example Code:**
```tsx
const filterOptions = {
  dateRange: [
    { label: 'Last 7 days', value: 'last7days' },
    { label: 'Last 30 days', value: 'last30days' },
    { label: 'Last 90 days', value: 'last90days' },
    { label: 'Custom...', value: 'custom' },
  ],
  actionType: [
    { label: 'All', value: 'all' },
    { label: 'Add tag', value: 'addTag' },
    { label: 'Remove tag', value: 'removeTag' },
    { label: 'Set metafield', value: 'setMetafield' },
    { label: 'Bulk update', value: 'bulkUpdate' },
  ],
  // ... etc
};
```

---

##### Subtask 4.2.2: Implement Filter Logic
**Estimated Time:** 1 hour

**Steps:**
1. Use `useSearchParams()` from Remix to manage URL state
2. On filter change:
   - Update URL search params
   - Reset pagination to page 1
   - Trigger loader revalidation
3. Debounce search input (300ms)
4. Calculate active filter count
5. Handle "Clear Filters" button click

**Acceptance Criteria:**
- [x] Filter changes update URL immediately
- [x] Loader re-fetches data on filter change
- [x] Pagination resets to page 1 on filter change
- [x] Search debounced to avoid excessive requests
- [x] Active filters counted correctly (excludes "all")

**Files to Modify:**
- `app/routes/app.activity.tsx`

**Example Code:**
```tsx
const [searchParams, setSearchParams] = useSearchParams();

const handleFilterChange = (filterName: string, value: string) => {
  const newParams = new URLSearchParams(searchParams);
  newParams.set(filterName, value);
  newParams.set('page', '1'); // Reset pagination
  setSearchParams(newParams);
};

const clearFilters = () => {
  setSearchParams({});
};

const activeFilterCount = Object.entries(filters).filter(
  ([key, value]) => value !== 'all' && value !== '' && key !== 'page'
).length;
```

---

### Task 4.3: Activity Log Table

**Estimated Time:** 4 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Build the main activity log table with expandable rows for detailed information.

#### Acceptance Criteria
- [x] Table displays: Time, Recipe, Action, Resource, Status
- [x] Rows clickable to expand details
- [x] Expanded view shows full details (timestamp, execution time, before/after, link to Shopify)
- [x] Status badges color-coded (success=green, failure=red, partial=yellow)
- [x] Timestamps formatted (HH:MM or full date based on age)
- [x] Empty state when no logs found

#### Subtasks

##### Subtask 4.3.1: Create Activity Table Component
**Estimated Time:** 2 hours

**Steps:**
1. Use Polaris `IndexTable` component
2. Define columns:
   - Time (60px width)
   - Recipe (200px width, truncated)
   - Action (180px width)
   - Resource (200px width, truncated)
   - Status (60px width, center-aligned)
3. Map over logs and render rows
4. Use `ActivityLogItem` component from Epic 1 (or inline)
5. Add click handler to expand/collapse rows
6. Track expanded row IDs in state

**Acceptance Criteria:**
- [x] Table renders all columns correctly
- [x] Column widths match wireframe
- [x] Rows render without errors
- [x] Click anywhere on row to expand
- [x] Only one row expanded at a time
- [x] Mobile: horizontal scroll enabled

**Files to Modify:**
- `app/routes/app.activity.tsx`

**Example Code:**
```tsx
const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

<IndexTable
  itemCount={logs.length}
  headings={[
    { title: 'Time' },
    { title: 'Recipe' },
    { title: 'Action' },
    { title: 'Resource' },
    { title: 'Status', alignment: 'center' },
  ]}
  selectable={false}
>
  {logs.map((log, index) => (
    <Fragment key={log._id}>
      <IndexTable.Row
        id={log._id}
        position={index}
        onClick={() => setExpandedLogId(
          expandedLogId === log._id ? null : log._id
        )}
      >
        <IndexTable.Cell>{formatTime(log.createdAt)}</IndexTable.Cell>
        <IndexTable.Cell>{truncate(log.recipeName, 30)}</IndexTable.Cell>
        <IndexTable.Cell>{log.actionType}</IndexTable.Cell>
        <IndexTable.Cell>{formatResource(log)}</IndexTable.Cell>
        <IndexTable.Cell>
          <StatusBadge status={log.status} />
        </IndexTable.Cell>
      </IndexTable.Row>

      {expandedLogId === log._id && (
        <IndexTable.Row id={`${log._id}-details`} subdued>
          <IndexTable.Cell colSpan={5}>
            <LogDetails log={log} />
          </IndexTable.Cell>
        </IndexTable.Row>
      )}
    </Fragment>
  ))}
</IndexTable>
```

---

##### Subtask 4.3.2: Create Expanded Row Details Component
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `LogDetails` component
2. Display detailed information:
   - Full timestamp with timezone
   - Recipe name (with link to recipe page)
   - Triggered by (webhook/manual/scheduled)
   - Execution time (ms)
   - Affected resource (with link to Shopify Admin)
   - Changes before/after (diff view)
3. Use Polaris `BlockStack` for layout
4. Format before/after as JSON or diff view
5. Add "View in Shopify Admin →" link

**Acceptance Criteria:**
- [x] All detail fields displayed
- [x] Timestamp shows full date + timezone
- [x] Execution time formatted (e.g., "247ms")
- [x] Before/after changes formatted clearly
- [x] Shopify Admin link opens in new tab
- [x] Layout matches wireframe

**Files to Create:**
- `app/components/LogDetails.tsx`

**Files to Modify:**
- `app/routes/app.activity.tsx`

**Example Component:**
```tsx
export function LogDetails({ log }: { log: AutomationLog }) {
  return (
    <BlockStack gap="300">
      <InlineStack gap="200">
        <Text variant="bodySm" color="subdued">Timestamp:</Text>
        <Text variant="bodySm">{formatFullTimestamp(log.createdAt)}</Text>
      </InlineStack>

      <InlineStack gap="200">
        <Text variant="bodySm" color="subdued">Recipe:</Text>
        <Link url={`/app/recipes?search=${log.recipeId}`}>
          {log.recipeName}
        </Link>
      </InlineStack>

      <InlineStack gap="200">
        <Text variant="bodySm" color="subdued">Triggered by:</Text>
        <Text variant="bodySm">{log.triggeredBy}</Text>
      </InlineStack>

      <InlineStack gap="200">
        <Text variant="bodySm" color="subdued">Execution:</Text>
        <Text variant="bodySm">{log.executionTimeMs}ms</Text>
      </InlineStack>

      <Divider />

      <div>
        <Text variant="bodySm" color="subdued">Affected Resource:</Text>
        <Link url={getShopifyAdminUrl(log)} external>
          {log.resourceType} #{log.resourceId} - {log.resourceTitle}
        </Link>
      </div>

      <div>
        <Text variant="bodySm" color="subdued">Changes:</Text>
        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          <div>Before: {JSON.stringify(log.changesBefore, null, 2)}</div>
          <div>After: {JSON.stringify(log.changesAfter, null, 2)}</div>
        </div>
      </div>

      <Button url={getShopifyAdminUrl(log)} external>
        View in Shopify Admin →
      </Button>
    </BlockStack>
  );
}
```

---

##### Subtask 4.3.3: Add Empty State
**Estimated Time:** 30 minutes

**Steps:**
1. Check if `logs.length === 0`
2. Display empty state:
   - Icon (📋)
   - "No activity found"
   - If filters active: "Try adjusting your filters"
   - Button to clear filters
3. Use Polaris `EmptyState` component

**Acceptance Criteria:**
- [x] Empty state shows when no logs
- [x] Message changes based on filter state
- [x] Clear filters button works
- [x] Icon and text styled correctly

**Files to Modify:**
- `app/routes/app.activity.tsx`

---

### Task 4.4: Pagination

**Estimated Time:** 2 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Implement pagination controls to navigate through activity logs (50 items per page).

#### Acceptance Criteria
- [x] Pagination controls at bottom of table
- [x] Shows "Page X of Y"
- [x] Previous/Next buttons
- [x] Direct page number links (if < 10 pages)
- [x] Disabled states for first/last page
- [x] Updates URL param on page change

#### Subtasks

##### Subtask 4.4.1: Create Pagination Component
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `Pagination` component (or use Polaris `Pagination`)
2. Calculate:
   - Current page from URL params
   - Total pages from `totalCount / 50`
   - Has previous page
   - Has next page
3. Render:
   - "← Previous" button (disabled on page 1)
   - "Page X of Y" text
   - "Next →" button (disabled on last page)
4. Add page number links (if <= 10 pages)
5. On click, update URL param `?page=X`

**Acceptance Criteria:**
- [x] Previous/Next buttons work correctly
- [x] Buttons disabled appropriately
- [x] Page number displayed correctly
- [x] Direct page links work (if < 10 pages)
- [x] URL updates on navigation
- [x] Scroll to top on page change

**Files to Create:**
- `app/components/Pagination.tsx` (or inline in route)

**Files to Modify:**
- `app/routes/app.activity.tsx`

**Example Code:**
```tsx
<Pagination
  hasPrevious={currentPage > 1}
  hasNext={currentPage < totalPages}
  onPrevious={() => {
    setSearchParams({ ...currentParams, page: String(currentPage - 1) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }}
  onNext={() => {
    setSearchParams({ ...currentParams, page: String(currentPage + 1) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }}
/>

<Text alignment="center" variant="bodySm" color="subdued">
  Page {currentPage} of {totalPages}
</Text>
```

---

##### Subtask 4.4.2: Add Loading State for Pagination
**Estimated Time:** 30 minutes

**Steps:**
1. Show loading indicator when navigating pages
2. Use `useNavigation()` from Remix
3. Disable pagination buttons during loading
4. Show skeleton rows in table during loading

**Acceptance Criteria:**
- [x] Pagination buttons disabled during loading
- [x] Table shows skeleton rows
- [x] Smooth transition between pages
- [x] No layout shifts

**Files to Modify:**
- `app/routes/app.activity.tsx`

---

### Task 4.5: CSV Export

**Estimated Time:** 2 hours
**Priority:** P1
**Assignee:** TBD

#### Description
Implement CSV export functionality to download activity logs for external analysis.

#### Acceptance Criteria
- [x] Export button downloads CSV file
- [x] CSV includes all current filter results
- [x] Filename: `activity-log-YYYY-MM-DD.csv`
- [x] Columns: Timestamp, Recipe, Action, Resource Type, Resource ID, Status, Execution Time
- [x] Respects current filters (exports what user sees)
- [x] Works for large datasets (streams data if > 1000 rows)

#### Subtasks

##### Subtask 4.5.1: Implement CSV Generation
**Estimated Time:** 1.5 hours

**Steps:**
1. Create utility function `generateCSV(logs: AutomationLog[])`
2. Convert logs to CSV format:
   - Headers: Timestamp, Recipe, Action, Resource Type, Resource ID, Resource Title, Status, Execution Time (ms)
   - Rows: map each log to CSV row
3. Escape special characters (commas, quotes)
4. Return CSV string
5. Create action endpoint `/app/activity/export`
6. Fetch logs with current filters (no pagination limit)
7. Generate CSV and return as file download

**Acceptance Criteria:**
- [x] CSV format valid (opens in Excel/Google Sheets)
- [x] All fields included
- [x] Special characters escaped correctly
- [x] Timestamp formatted as ISO 8601
- [x] Status values human-readable

**Files to Create:**
- `app/utils/csvExport.ts`

**Files to Modify:**
- `app/routes/app.activity.tsx` (add export action)

**Example Code:**
```tsx
// app/utils/csvExport.ts
export function generateCSV(logs: AutomationLog[]): string {
  const headers = [
    'Timestamp',
    'Recipe',
    'Action',
    'Resource Type',
    'Resource ID',
    'Resource Title',
    'Status',
    'Execution Time (ms)',
  ];

  const rows = logs.map(log => [
    log.createdAt.toISOString(),
    escapeCSV(log.recipeName),
    log.actionType,
    log.resourceType,
    log.resourceId,
    escapeCSV(log.resourceTitle || ''),
    log.status,
    log.executionTimeMs.toString(),
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

---

##### Subtask 4.5.2: Add Export Action & Download
**Estimated Time:** 30 minutes

**Steps:**
1. Add export action to route:
   - Fetch logs with current filters (all pages)
   - Generate CSV
   - Return as file download
2. Update "Export CSV" button to submit form
3. Set response headers for file download:
   - `Content-Type: text/csv`
   - `Content-Disposition: attachment; filename="activity-log-YYYY-MM-DD.csv"`
4. Show toast notification on export

**Acceptance Criteria:**
- [x] Export button triggers download
- [x] Filename includes current date
- [x] File downloads correctly
- [x] Toast shows success message
- [x] Works with all filters applied

**Files to Modify:**
- `app/routes/app.activity.tsx`

**Example Code:**
```tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'export') {
    const filters = {
      // Parse from formData or URL
    };

    const dataService = getDataService();
    const { logs } = await dataService.getActivityLogs({
      ...filters,
      limit: 10000, // Export all (up to reasonable limit)
    });

    const csv = generateCSV(logs);
    const filename = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return json({ success: false }, { status: 400 });
}
```

---

### Task 4.6: Mobile Responsive Design

**Estimated Time:** 2 hours
**Priority:** P1
**Assignee:** TBD

#### Description
Optimize activity log for mobile viewing (375px width).

#### Acceptance Criteria
- [x] Filters stack vertically
- [x] Table scrolls horizontally
- [x] Expandable rows work smoothly
- [x] Pagination controls mobile-friendly
- [x] Export button accessible
- [x] All tap targets minimum 44x44px

#### Subtasks

##### Subtask 4.6.1: Implement Mobile Table Layout
**Estimated Time:** 1 hour

**Steps:**
1. Test table at 375px viewport
2. Enable horizontal scrolling on table
3. Adjust column widths for mobile:
   - Hide less important columns (e.g., execution time)
   - Keep: Time, Action, Resource, Status
4. Make expanded details full-width
5. Ensure rows clickable with large touch target

**Acceptance Criteria:**
- [x] Table scrolls horizontally on mobile
- [x] Essential columns visible without scrolling
- [x] Expanded details readable
- [x] Tap targets minimum 44x44px
- [x] No layout shifts on expand/collapse

**Files to Modify:**
- `app/routes/app.activity.tsx`

---

##### Subtask 4.6.2: Optimize Filters for Mobile
**Estimated Time:** 1 hour

**Steps:**
1. Stack filter controls vertically
2. Make dropdowns full-width
3. Search input full-width
4. "Clear Filters" button full-width
5. Filter count badge positioned correctly

**Acceptance Criteria:**
- [x] All filters stack vertically
- [x] Controls fill available width
- [x] Easy to tap on all controls
- [x] Spacing matches mobile wireframe
- [x] Export button accessible

**Files to Modify:**
- `app/routes/app.activity.tsx`

---

## Files Modified/Created (Summary)

```
app/
├── routes/
│   └── app.activity.tsx         # Activity log route (CREATED)
│
├── components/
│   ├── LogDetails.tsx           # Expanded log details (CREATED)
│   └── Pagination.tsx           # Pagination controls (CREATED - optional)
│
└── utils/
    └── csvExport.ts             # CSV generation utility (CREATED)
```

---

## Mock Data Requirements

Ensure Epic 1 mock service provides:
- `getActivityLogs(filters: { dateRange?, actionType?, resourceType?, status?, search?, limit?, offset? })`
- Returns: `{ logs: AutomationLog[], totalCount: number }`
- At least 500 mock logs spanning 30 days
- Mix of success/failure/partial statuses
- Various action types and resource types

---

## Testing Strategy

### Manual Testing Checklist
- [x] Activity log loads with initial data
- [x] All filters work correctly
- [x] Search filters by resource ID/name
- [x] Table displays all columns
- [x] Rows expand on click
- [x] Expanded details show all fields
- [x] Status badges color-coded correctly
- [x] Shopify Admin links work
- [x] Pagination navigates correctly
- [x] CSV export downloads file
- [x] CSV contains correct data
- [x] Empty state shows when no logs
- [x] Mobile layout (375px) works
- [x] Desktop layout (1280px) works

### Accessibility Testing
- [x] Keyboard navigation works (Tab, Enter, Esc)
- [x] Expandable rows accessible via keyboard
- [x] Screen reader announces table structure
- [x] Filter labels associated with inputs
- [x] Color contrast meets WCAG AA
- [x] Focus indicators visible

### Performance Testing
- [x] Initial load < 1 second (50 logs)
- [x] Filter updates < 500ms
- [x] Pagination smooth (no jank)
- [x] Expand/collapse smooth (< 200ms)
- [x] CSV export completes < 3 seconds (1000 logs)

---

## Definition of Done

- [x] All subtasks completed and checked off
- [x] Activity log matches WIREFRAME.md design exactly
- [x] Code passes `pnpm lint` with no errors
- [x] TypeScript compiles with no errors
- [x] All filters work correctly
- [x] Search works correctly
- [x] Table renders without errors
- [x] Expandable rows work smoothly
- [x] Pagination works correctly
- [x] CSV export works correctly
- [x] Responsive design tested on 3 screen sizes
- [x] Empty states implemented
- [x] Loading states implemented
- [x] Accessibility audit passed
- [x] Code reviewed by peer
- [x] Screenshots added to PR

---

## Design Reference

See **docs/WIREFRAME.md** sections:
- "Activity Log" - Desktop View (1280px)
- "Expanded Row Detail"
- "Mobile Activity Log (375px)"

Key design specs:
- Table columns: Time, Recipe, Action, Resource, Status
- Status colors: ✓ green, ✗ red, ⚠️ yellow
- Timestamp format: "HH:MM" for today, "MMM DD HH:MM" for older
- Spacing: gap-200 (8px) for table rows
- Expanded details: BlockStack with gap-300 (12px)

---

## Notes

- Activity Log is **critical for trust** - transparency is a competitive advantage
- Focus on **performance** with large datasets (pagination, virtualization if needed)
- CSV export is **highly requested feature** - make it robust
- Shopify Admin links must be **accurate** (product/customer/order URLs)
- Keep **mobile experience** excellent (horizontal scroll, expandable rows)

---

**Last Updated:** 2025-11-18
**Epic Owner:** TBD
**Status:** Ready for Development (after Epic 1)

# Epic 2: Dashboard UI with Mock Data

**Status:** ✅ Complete
**Priority:** P0 (Blocker)
**Estimated Duration:** 3 days
**Dependencies:** Epic 1 (Core UI Infrastructure) ✅
**Phase:** Phase 1 - MVP

---

## Epic Overview

Build the main Dashboard (home page) UI using mock data. This is the first screen users see after authentication and provides at-a-glance insights into automation activity.

## Business Value

- First impression for new users (critical for activation)
- Shows immediate value (time saved, actions executed)
- Quick access to active recipes and recent activity
- Drives users to explore other sections

## Success Criteria

- [x] Dashboard matches WIREFRAME.md design exactly
- [x] All stats cards display mock data
- [x] Active recipes list shows top 5 recipes
- [x] Recent activity shows last 10 actions
- [x] Quick action buttons navigate correctly
- [x] Responsive design works on mobile (375px) and desktop (1280px)
- [x] Loading states implemented
- [x] Refresh button updates stats

---

## Tasks

### Task 2.1: Dashboard Layout & Structure

**Estimated Time:** 3 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Create the main dashboard route with Polaris layout components matching the wireframe specifications.

#### Acceptance Criteria
- [x] Page title "Dashboard" with refresh action
- [x] 4-column stats grid at top
- [x] 2-column layout below (Active Recipes | Recent Activity)
- [x] Quick Actions section at bottom
- [x] Mobile responsive (stacks vertically on small screens)

#### Subtasks

##### Subtask 2.1.1: Create Dashboard Route
**Estimated Time:** 1 hour

**Steps:**
1. Modify `app/routes/app._index.tsx` (replace demo content)
2. Import Polaris layout components:
   - `Page`, `Layout`, `Card`, `BlockStack`, `InlineStack`
3. Set up basic page structure:
   ```tsx
   <Page
     title="Dashboard"
     primaryAction={{ content: 'Refresh', onAction: handleRefresh }}
   >
     <Layout>
       {/* Stats section */}
       {/* Active recipes + Recent activity */}
       {/* Quick actions */}
     </Layout>
   </Page>
   ```
4. Add TypeScript interfaces for component props
5. Import mock data service

**Acceptance Criteria:**
- [x] Route renders without errors
- [x] Page title displays correctly
- [x] Refresh button visible in header
- [x] Polaris layout responsive

**Files to Modify:**
- `app/routes/app._index.tsx`

---

##### Subtask 2.1.2: Implement Stats Grid
**Estimated Time:** 1 hour

**Steps:**
1. Create stats section using `Layout.Section`
2. Use 4x `oneThird` sections for stats cards
3. Import `StatsCard` component from Epic 1
4. Connect to mock data service:
   - Active Recipes count
   - Actions This Week count
   - Time Saved This Week (calculated)
   - Actions Monthly count
5. Add loading skeleton state
6. Implement refresh logic

**Acceptance Criteria:**
- [x] 4 stats cards in a row (desktop)
- [x] Cards stack on mobile
- [x] Numbers formatted with commas
- [x] "View all" links navigate correctly
- [x] Loading skeleton shows during refresh

**Files to Modify:**
- `app/routes/app._index.tsx`

**Example Code:**
```tsx
<Layout.Section>
  <InlineStack gap="400">
    <StatsCard
      label="Active Recipes"
      value={stats.activeRecipes}
      link="/app/recipes"
    />
    <StatsCard
      label="Actions This Week"
      value={stats.actionsThisWeek}
      link="/app/activity"
    />
    {/* ... */}
  </InlineStack>
</Layout.Section>
```

---

##### Subtask 2.1.3: Add Two-Column Content Section
**Estimated Time:** 1 hour

**Steps:**
1. Create 2-column layout:
   - Left: Active Recipes (oneHalf)
   - Right: Recent Activity (oneHalf)
2. Use `Card` component with title props
3. Add "Manage Recipes →" and "View All Activity →" footer links
4. Ensure responsive: stacks vertically on mobile

**Acceptance Criteria:**
- [x] Two equal-width columns on desktop
- [x] Stacks vertically on mobile (< 768px)
- [x] Card titles match wireframe
- [x] Footer links styled as Polaris Link

**Files to Modify:**
- `app/routes/app._index.tsx`

---

### Task 2.2: Active Recipes Section

**Estimated Time:** 2 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Display the top 5 active recipes with status indicators and links to the recipe management page.

#### Acceptance Criteria
- [x] Shows maximum 5 active recipes
- [x] Each recipe shows name and "Active 🟢" badge
- [x] Sorted by most recently activated
- [x] "Manage Recipes →" link navigates to recipe library
- [x] Empty state if no active recipes

#### Subtasks

##### Subtask 2.2.1: Fetch Active Recipes Data
**Estimated Time:** 30 minutes

**Steps:**
1. In `app/routes/app._index.tsx` loader:
   - Import `getDataService()` from Epic 1
   - Call `dataService.getRecipes({ enabled: true, limit: 5 })`
   - Sort by `updatedAt` descending
2. Return recipes in loader JSON
3. Access in component via `useLoaderData()`

**Acceptance Criteria:**
- [x] Loader fetches top 5 active recipes
- [x] Data typed correctly (TypeScript)
- [x] Error handling for service failure
- [x] Mock delay simulates real API (100-300ms)

**Files to Modify:**
- `app/routes/app._index.tsx`

**Example Code:**
```tsx
export async function loader() {
  const dataService = getDataService();
  const activeRecipes = await dataService.getRecipes({
    enabled: true,
    limit: 5
  });

  return json({ activeRecipes });
}
```

---

##### Subtask 2.2.2: Render Active Recipes List
**Estimated Time:** 1 hour

**Steps:**
1. In dashboard component, map over `activeRecipes`
2. Display each recipe:
   - Recipe name (Text variant="bodyMd")
   - "Active 🟢" badge (Badge tone="success")
   - Use `VerticalStack` with gap="300"
3. Add "Manage Recipes →" link at bottom
4. Implement empty state:
   - "No active recipes yet"
   - "Browse recipe library to get started"
   - Button to navigate to recipes page

**Acceptance Criteria:**
- [x] Recipe names displayed correctly
- [x] Green success badges on all items
- [x] Vertical spacing matches wireframe (12px gap)
- [x] Empty state shows when no recipes
- [x] Link navigates to `/app/recipes`

**Files to Modify:**
- `app/routes/app._index.tsx`

---

##### Subtask 2.2.3: Add Loading & Error States
**Estimated Time:** 30 minutes

**Steps:**
1. Create loading state component:
   - Use `SkeletonBodyText` for recipe names
   - Show 5 skeleton lines
2. Create error state component:
   - Use `Banner tone="critical"`
   - Display error message
   - "Retry" button to refresh
3. Handle states in component render

**Acceptance Criteria:**
- [x] Loading skeleton matches recipe list layout
- [x] Error banner shows on fetch failure
- [x] Retry button re-triggers loader
- [x] Smooth transition between states

**Files to Modify:**
- `app/routes/app._index.tsx`

---

### Task 2.3: Recent Activity Section

**Estimated Time:** 2 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Display the 10 most recent automation actions with timestamps and descriptions.

#### Acceptance Criteria
- [x] Shows last 10 activity log entries
- [x] Each entry shows timestamp and description
- [x] Timestamps formatted as "HH:MM" (e.g., "14:32")
- [x] "View All Activity →" link navigates to full log
- [x] Empty state if no activity

#### Subtasks

##### Subtask 2.3.1: Fetch Recent Activity Data
**Estimated Time:** 30 minutes

**Steps:**
1. In loader, call `dataService.getActivityLogs({ limit: 10 })`
2. Sort by `createdAt` descending (most recent first)
3. Return logs in loader JSON
4. Type data correctly

**Acceptance Criteria:**
- [x] Fetches 10 most recent logs
- [x] Sorted chronologically (newest first)
- [x] TypeScript types applied
- [x] Error handling implemented

**Files to Modify:**
- `app/routes/app._index.tsx`

---

##### Subtask 2.3.2: Render Activity Log Items
**Estimated Time:** 1 hour

**Steps:**
1. Map over `recentActivity` data
2. For each log entry, display:
   - Timestamp (formatted as "HH:MM" using formatter from Epic 1)
   - Action description (e.g., "Tagged 3 products as 'Low Stock'")
   - Resource info (e.g., "Product #789")
3. Use `VerticalStack` with gap="200" (8px)
4. Style timestamps with subdued color
5. Truncate long descriptions (max 2 lines)

**Acceptance Criteria:**
- [x] All 10 entries visible
- [x] Timestamps formatted correctly
- [x] Descriptions are concise
- [x] No layout shifts on render
- [x] Matches wireframe spacing

**Files to Modify:**
- `app/routes/app._index.tsx`

**Example Code:**
```tsx
<VerticalStack gap="200">
  {recentActivity.map((log) => (
    <div key={log._id}>
      <Text variant="bodySm" color="subdued">
        ⏰ {formatTime(log.createdAt)}
      </Text>
      <Text variant="bodyMd">
        {log.actionDescription}
      </Text>
    </div>
  ))}
</VerticalStack>
```

---

##### Subtask 2.3.3: Add "View All" Link & Empty State
**Estimated Time:** 30 minutes

**Steps:**
1. Add "View All Activity →" link at card bottom
2. Link navigates to `/app/activity`
3. Create empty state:
   - Icon (📋)
   - "No activity yet"
   - "Actions will appear here once you activate a recipe"
4. Only show empty state when `recentActivity.length === 0`

**Acceptance Criteria:**
- [x] Link styled as Polaris Link component
- [x] Navigation works correctly
- [x] Empty state displays when appropriate
- [x] Icon and text centered

**Files to Modify:**
- `app/routes/app._index.tsx`

---

### Task 2.4: Quick Actions Section

**Estimated Time:** 1 hour
**Priority:** P1
**Assignee:** TBD

#### Description
Add quick action buttons at the bottom of the dashboard for common tasks.

#### Acceptance Criteria
- [x] 3 action buttons: "Add Recipe", "Clean Tags", "Bulk Operations"
- [x] Buttons styled as secondary (not primary)
- [x] Icons displayed on buttons
- [x] Navigate to correct routes (or show "Coming Soon" modal)

#### Subtasks

##### Subtask 2.4.1: Implement Quick Actions Card
**Estimated Time:** 1 hour

**Steps:**
1. Create Card with title "Quick Actions"
2. Add 3 buttons in horizontal layout (InlineStack):
   - "+ Add Recipe" (navigates to `/app/recipes`)
   - "🧹 Clean Tags" (shows "Coming Soon" modal for now)
   - "⚡ Bulk Operations" (shows "Coming Soon" modal)
3. Add icons to buttons (use Polaris Icon component)
4. Create "Coming Soon" modal component:
   - Modal with title "Coming Soon"
   - "This feature will be available in Phase 2"
   - "Close" button

**Acceptance Criteria:**
- [x] 3 buttons displayed horizontally
- [x] Icons render correctly
- [x] "+ Add Recipe" navigates to recipe page
- [x] Other buttons show modal
- [x] Modal dismisses on "Close"
- [x] Mobile: buttons stack vertically

**Files to Modify:**
- `app/routes/app._index.tsx`

**Files to Create:**
- `app/components/ComingSoonModal.tsx`

---

### Task 2.5: Responsive Design & Polish

**Estimated Time:** 2 hours
**Priority:** P1
**Assignee:** TBD

#### Description
Ensure dashboard works perfectly on mobile (375px) and desktop (1280px+) with smooth transitions.

#### Acceptance Criteria
- [x] Stats cards stack vertically on mobile
- [x] Two-column layout becomes single column on mobile
- [x] All text readable on small screens
- [x] Touch targets minimum 44x44px
- [x] No horizontal scroll on any screen size

#### Subtasks

##### Subtask 2.5.1: Implement Mobile Layout
**Estimated Time:** 1 hour

**Steps:**
1. Test dashboard at 375px viewport
2. Adjust Layout.Section sizing:
   - Stats: Use `fullWidth` prop on mobile
   - Content: Use `fullWidth` prop on mobile
3. Adjust InlineStack to BlockStack on mobile:
   - Use Polaris responsive props
4. Test on actual mobile device (Chrome DevTools)

**Acceptance Criteria:**
- [x] All content fits on 375px screen
- [x] No horizontal scrolling
- [x] Content readable without zooming
- [x] Tap targets meet 44x44px minimum
- [x] Scrolling smooth (no janky animations)

**Files to Modify:**
- `app/routes/app._index.tsx`

---

##### Subtask 2.5.2: Add Loading & Transition Animations
**Estimated Time:** 1 hour

**Steps:**
1. Add fade-in animation on initial load
2. Add subtle hover effects on cards:
   - Shadow increases slightly (2px elevation change)
   - Transition: 150ms ease-out
3. Add refresh animation:
   - Spinner icon in refresh button during loading
   - Fade out/in transition on data update
4. Respect `prefers-reduced-motion` media query

**Acceptance Criteria:**
- [x] Smooth fade-in on mount (200ms)
- [x] Card hover effect subtle and smooth
- [x] Refresh shows loading indicator
- [x] Animations disabled if user prefers reduced motion
- [x] No layout shift during animations

**Files to Modify:**
- `app/routes/app._index.tsx`

**CSS (if needed):**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Files Modified/Created (Summary)

```
app/
├── routes/
│   └── app._index.tsx        # Main dashboard route (MODIFIED)
│
└── components/
    └── ComingSoonModal.tsx   # Placeholder modal (CREATED)
```

---

## Mock Data Requirements

From Epic 1, ensure these mock data functions exist:
- `getRecipes({ enabled: true, limit: 5 })`
- `getActivityLogs({ limit: 10 })`
- `getStats()` - Returns:
  - `activeRecipes: number`
  - `actionsThisWeek: number`
  - `timeSavedHours: number`
  - `actionsMonthly: number`

---

## Testing Strategy

### Manual Testing Checklist
- [x] Dashboard loads without errors
- [x] All stats display correctly
- [x] Active recipes list shows 5 items
- [x] Recent activity shows 10 items
- [x] Refresh button updates data
- [x] Quick action buttons work
- [x] Links navigate correctly
- [x] Mobile layout works (375px)
- [x] Tablet layout works (768px)
- [x] Desktop layout works (1280px+)

### Accessibility Testing
- [x] Keyboard navigation works (Tab, Enter)
- [x] Screen reader announces all content
- [x] Color contrast meets WCAG AA (4.5:1)
- [x] Focus indicators visible (2px outline)
- [x] No content in images without alt text

### Performance Testing
- [x] Initial load < 1 second
- [x] Refresh completes < 500ms
- [x] No layout shifts (CLS < 0.1)
- [x] Animations smooth (60fps)

---

## Definition of Done

- [x] All subtasks completed and checked off
- [x] Dashboard matches WIREFRAME.md design exactly
- [x] Code passes `pnpm lint` with no errors
- [x] TypeScript compiles with no errors
- [x] All links navigate correctly
- [x] Responsive design tested on 3 screen sizes
- [x] Empty states implemented
- [x] Loading states implemented
- [x] Error states implemented
- [x] Accessibility audit passed
- [x] Code reviewed by peer
- [x] Screenshots added to PR

---

## Design Reference

See **docs/WIREFRAME.md** sections:
- "Dashboard (Home)" - Desktop View (1280px)
- "Mobile Dashboard (375px)"

Key design specs:
- Stats cards: 4-column grid
- Text sizes: heading2xl (stats), headingMd (titles), bodyMd (content)
- Spacing: gap-400 (16px) for cards, gap-300 (12px) for lists
- Colors: Use Polaris tokens only

---

## Notes

- This is the **first visible UI** users will see - it must be polished
- Focus on **perceived performance** (loading skeletons, smooth transitions)
- Keep **empty states** friendly and actionable
- Ensure **mobile experience** is excellent (many users on mobile)

---

**Last Updated:** 2025-11-18
**Epic Owner:** TBD
**Status:** Ready for Development (after Epic 1)

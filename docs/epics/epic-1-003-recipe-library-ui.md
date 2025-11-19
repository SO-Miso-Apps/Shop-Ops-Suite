# Epic 3: Recipe Library UI (Smart Tagger)

**Status:** ✅ Complete
**Priority:** P0 (Blocker)
**Estimated Duration:** 4 days
**Dependencies:** Epic 1 (Core UI Infrastructure) ✅
**Phase:** Phase 1 - MVP

---

## Epic Overview

Build the Recipe Library interface where users browse, search, filter, and toggle automation recipes on/off. This is the **core value proposition** of the app - making automation accessible through pre-built recipes.

## Business Value

- Primary user engagement point (users spend most time here)
- Demonstrates app value through 20+ pre-built recipes
- One-click activation (core "Recipes, Not Rules" strategy)
- Drives Free → Pro conversion (limited recipes on Free plan)

## Success Criteria

- [x] Recipe library displays all 20+ mock recipes
- [x] Recipes organized by category (Customer, Order, Product)
- [x] Filter by category works
- [x] Search by recipe name/description works
- [x] Recipe cards match WIREFRAME.md design
- [x] Toggle switches update recipe state (mock persistence)
- [x] Preview modal shows recipe details before activation
- [x] Plan limit enforcement (Free plan: 3 active recipes max)
- [x] Mobile responsive (375px to 1280px)

---

## Tasks

### Task 3.1: Recipe Library Route & Layout

**Estimated Time:** 3 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Create the main recipe library route with layout, filters, and search functionality.

#### Acceptance Criteria
- [x] Route `/app/recipes` renders correctly
- [x] Page title "Smart Tagger" with "+ Add Custom" action
- [x] Filter chips (All, Customer, Order, Product)
- [x] Search input with debouncing
- [x] Recipe grid layout (3 columns desktop, 1 column mobile)

#### Subtasks

##### Subtask 3.1.1: Create Recipe Library Route
**Estimated Time:** 1 hour

**Steps:**
1. Create `app/routes/app.recipes.tsx`
2. Set up basic page structure:
   ```tsx
   <Page
     title="Smart Tagger"
     primaryAction={{
       content: '+ Add Custom',
       onAction: () => setShowComingSoon(true)
     }}
   >
     <Layout>
       {/* Filters */}
       {/* Recipe grid */}
     </Layout>
   </Page>
   ```
3. Import mock data service
4. Define TypeScript interfaces for filters, state

**Acceptance Criteria:**
- [x] Route accessible at `/app/recipes`
- [x] Page title displays correctly
- [x] "+ Add Custom" button shows coming soon modal
- [x] No TypeScript errors

**Files to Create:**
- `app/routes/app.recipes.tsx`

---

##### Subtask 3.1.2: Implement Filter UI
**Estimated Time:** 1 hour

**Steps:**
1. Create filter section above recipe grid
2. Add category filter chips:
   - "All" (default selected)
   - "Customer"
   - "Order"
   - "Product"
3. Use Polaris `ChoiceList` with `allowMultiple={false}`
4. Style selected chip with primary color
5. Update URL query params on filter change
6. Persist filter selection in URL

**Acceptance Criteria:**
- [x] 4 filter chips displayed horizontally
- [x] Selected chip highlighted (primary color)
- [x] Clicking chip filters recipes immediately
- [x] URL updates with `?category=customer`
- [x] Filter persists on page reload
- [x] Mobile: chips wrap to multiple rows if needed

**Files to Modify:**
- `app/routes/app.recipes.tsx`

**Example Code:**
```tsx
const [selectedCategory, setSelectedCategory] = useState('all');

const filterChips = [
  { label: 'All', value: 'all' },
  { label: 'Customer', value: 'customer' },
  { label: 'Order', value: 'order' },
  { label: 'Product', value: 'product' },
];
```

---

##### Subtask 3.1.3: Implement Search Input
**Estimated Time:** 1 hour

**Steps:**
1. Add search input below filters
2. Use Polaris `TextField` with search icon
3. Placeholder: "Search recipes..."
4. Implement debounced search (300ms delay)
5. Search both recipe name and description fields
6. Update URL query param `?search=vip`
7. Clear button (X) to reset search

**Acceptance Criteria:**
- [x] Search input styled as Polaris TextField
- [x] Search icon displayed on right
- [x] Typing triggers search after 300ms delay
- [x] Search is case-insensitive
- [x] Searches both name and description
- [x] Clear button (X) resets search
- [x] URL param updates on search

**Files to Modify:**
- `app/routes/app.recipes.tsx`

**Example Code:**
```tsx
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebouncedValue(searchTerm, 300);

<TextField
  placeholder="Search recipes..."
  value={searchTerm}
  onChange={setSearchTerm}
  prefix={<Icon source={SearchMinor} />}
  clearButton
  onClearButtonClick={() => setSearchTerm('')}
/>
```

---

### Task 3.2: Recipe Grid & Cards

**Estimated Time:** 4 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Display recipes in a responsive grid using the RecipeCard component from Epic 1.

#### Acceptance Criteria
- [x] Recipes displayed in grid (3 columns desktop, 1 column mobile)
- [x] RecipeCard component used for each recipe
- [x] Recipes organized by category sections
- [x] Category headers collapsible
- [x] "Show All" / "Show Less" for categories with many recipes
- [x] Empty state when no recipes match filters

#### Subtasks

##### Subtask 3.2.1: Fetch & Filter Recipe Data
**Estimated Time:** 1 hour

**Steps:**
1. In loader, fetch all recipes from mock data service
2. Apply category filter if present in URL params
3. Apply search filter if present
4. Group recipes by category:
   - Customer recipes
   - Order recipes
   - Product recipes
5. Return filtered/grouped data

**Acceptance Criteria:**
- [x] Loader fetches all recipes
- [x] Filters applied server-side
- [x] Recipes grouped by category
- [x] Empty results handled gracefully
- [x] TypeScript types correct

**Files to Modify:**
- `app/routes/app.recipes.tsx`

**Example Code:**
```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category') || 'all';
  const search = url.searchParams.get('search') || '';

  const dataService = getDataService();
  let recipes = await dataService.getRecipes();

  // Apply filters
  if (category !== 'all') {
    recipes = recipes.filter(r => r.category === category);
  }
  if (search) {
    recipes = filterByText(recipes, search, ['name', 'description']);
  }

  // Group by category
  const grouped = {
    customer: recipes.filter(r => r.category === 'customer'),
    order: recipes.filter(r => r.category === 'order'),
    product: recipes.filter(r => r.category === 'product'),
  };

  return json({ recipes: grouped, filters: { category, search } });
}
```

---

##### Subtask 3.2.2: Render Recipe Grid
**Estimated Time:** 2 hours

**Steps:**
1. Map over grouped recipes
2. For each category:
   - Display category header (e.g., "📁 Customer Recipes (6)")
   - Display recipes in 3-column grid (use CSS Grid or Polaris Layout)
   - Use `RecipeCard` component from Epic 1
3. Add "Show All" / "Show Less" toggle for categories with > 6 recipes
4. Implement grid responsive behavior:
   - Desktop (1280px+): 3 columns
   - Tablet (768-1024px): 2 columns
   - Mobile (<768px): 1 column

**Acceptance Criteria:**
- [x] Category headers match wireframe style
- [x] Recipe count displayed in header
- [x] Grid columns adjust based on screen size
- [x] RecipeCard component renders correctly
- [x] "Show All" toggle works for large categories
- [x] Spacing matches wireframe (gap-400)

**Files to Modify:**
- `app/routes/app.recipes.tsx`

**Example Code:**
```tsx
{Object.entries(recipes).map(([category, categoryRecipes]) => (
  <div key={category}>
    <Text variant="headingMd">
      📁 {capitalizeCategory(category)} Recipes ({categoryRecipes.length})
    </Text>

    <div className="recipe-grid">
      {categoryRecipes.slice(0, showAll[category] ? undefined : 6).map(recipe => (
        <RecipeCard
          key={recipe.recipeId}
          recipe={recipe}
          onToggle={handleToggle}
          onClick={() => openPreviewModal(recipe)}
        />
      ))}
    </div>

    {categoryRecipes.length > 6 && (
      <Button plain onClick={() => toggleShowAll(category)}>
        {showAll[category] ? 'Show Less ▲' : `Show All (${categoryRecipes.length}) ▼`}
      </Button>
    )}
  </div>
))}
```

---

##### Subtask 3.2.3: Implement Empty State
**Estimated Time:** 1 hour

**Steps:**
1. Check if filtered recipes array is empty
2. Display empty state:
   - Icon (🔍)
   - "No recipes found"
   - If search active: "Try a different search term"
   - If filter active: "No recipes in this category"
   - Button to clear filters
3. Use Polaris `EmptyState` component
4. Center on page

**Acceptance Criteria:**
- [x] Empty state shows when no recipes match filters
- [x] Message changes based on filter type
- [x] Clear filters button resets URL params
- [x] EmptyState centered vertically and horizontally
- [x] Icon and text match Polaris style

**Files to Modify:**
- `app/routes/app.recipes.tsx`

---

### Task 3.3: Recipe Toggle Logic

**Estimated Time:** 3 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Implement recipe activation/deactivation with plan limit enforcement and optimistic UI updates.

#### Acceptance Criteria
- [x] Clicking toggle updates recipe state immediately (optimistic)
- [x] Free plan enforces 3 active recipe limit
- [x] Warning modal shows when limit reached
- [x] Toast notification on successful toggle
- [x] Error handling with rollback on failure
- [x] State persists in mock data service (sessionStorage)

#### Subtasks

##### Subtask 3.3.1: Create Toggle Action
**Estimated Time:** 1 hour

**Steps:**
1. Add `action` function to route
2. Accept `recipeId` and `enabled` from form data
3. Fetch current plan settings to check limits
4. If Free plan and >= 3 active recipes, return error
5. Call `dataService.toggleRecipe(recipeId, enabled)`
6. Return success/error response
7. Handle errors gracefully

**Acceptance Criteria:**
- [x] Action receives correct form data
- [x] Plan limit checked before toggling
- [x] Mock service updates recipe state
- [x] Returns JSON response with success/error
- [x] Error messages are user-friendly

**Files to Modify:**
- `app/routes/app.recipes.tsx`

**Example Code:**
```tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const recipeId = formData.get('recipeId') as string;
  const enabled = formData.get('enabled') === 'true';

  const dataService = getDataService();

  // Check plan limits
  const settings = await dataService.getSettings();
  const activeCount = await dataService.getRecipes({ enabled: true }).length;

  if (settings.plan === 'free' && activeCount >= 3 && enabled) {
    return json({
      success: false,
      error: 'Free plan limited to 3 active recipes. Upgrade to Pro for unlimited recipes.'
    }, { status: 400 });
  }

  // Toggle recipe
  await dataService.toggleRecipe(recipeId, enabled);

  return json({ success: true });
}
```

---

##### Subtask 3.3.2: Implement Optimistic UI Update
**Estimated Time:** 1 hour

**Steps:**
1. Use `useFetcher()` from Remix for optimistic updates
2. On toggle click:
   - Immediately update local state
   - Submit form to action
   - If action fails, rollback local state
3. Show loading spinner on recipe card during submission
4. Update RecipeCard to show loading state

**Acceptance Criteria:**
- [x] Toggle switch updates immediately on click
- [x] Loading indicator shows during submission
- [x] State rolls back on error
- [x] No UI flicker or jank
- [x] Works without JavaScript (progressive enhancement)

**Files to Modify:**
- `app/routes/app.recipes.tsx`
- `app/components/RecipeCard.tsx`

**Example Code:**
```tsx
const fetcher = useFetcher();

const handleToggle = (recipeId: string, enabled: boolean) => {
  // Optimistic update
  setLocalRecipes(prev =>
    prev.map(r => r.recipeId === recipeId ? { ...r, enabled } : r)
  );

  // Submit to server
  fetcher.submit(
    { recipeId, enabled: String(enabled) },
    { method: 'post' }
  );
};

// Rollback on error
useEffect(() => {
  if (fetcher.data?.success === false) {
    // Revert optimistic update
    setLocalRecipes(loaderData.recipes);
    showToast('error', fetcher.data.error);
  }
}, [fetcher.data]);
```

---

##### Subtask 3.3.3: Add Plan Limit Warning Modal
**Estimated Time:** 1 hour

**Steps:**
1. Create `PlanLimitModal` component
2. Show modal when Free user tries to activate 4th recipe
3. Modal content:
   - "⚠️ Recipe Limit Reached"
   - "Free plan limited to 3 active recipes"
   - "Upgrade to Pro for unlimited recipes"
   - Primary button: "Upgrade to Pro →" (navigates to settings)
   - Secondary button: "Cancel"
4. Use Polaris `Modal` component

**Acceptance Criteria:**
- [x] Modal shows when limit exceeded
- [x] Message matches PRD copy
- [x] "Upgrade" button navigates to `/app/settings`
- [x] "Cancel" closes modal
- [x] Modal dismisses on backdrop click

**Files to Create:**
- `app/components/PlanLimitModal.tsx`

**Files to Modify:**
- `app/routes/app.recipes.tsx`

---

### Task 3.4: Recipe Preview Modal

**Estimated Time:** 4 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Show detailed recipe information in a modal before activation, including preview of affected resources.

#### Acceptance Criteria
- [x] Modal opens when recipe card clicked
- [x] Shows recipe details (what it does, how it works)
- [x] Preview of affected items (first 5 of X total)
- [x] Table showing customer/order/product details
- [x] "Activate Recipe" button in footer
- [x] Cancel button closes modal

#### Subtasks

##### Subtask 3.4.1: Create Preview Modal Component
**Estimated Time:** 2 hours

**Steps:**
1. Create `app/components/RecipePreviewModal.tsx`
2. Accept `recipe` and `onActivate` props
3. Modal structure (matching WIREFRAME.md):
   - Title: Recipe name
   - Section 1: "What this recipe does" (numbered steps)
   - Section 2: Preview of affected items (table)
   - Section 3: Trigger info ("This recipe runs automatically when...")
   - Section 4: Warning banner (what will happen)
4. Use Polaris `Modal` with large size
5. Footer: Cancel + "Activate Recipe" primary button

**Acceptance Criteria:**
- [x] Modal matches wireframe design exactly
- [x] All sections display correctly
- [x] Scrollable if content overflows
- [x] Footer buttons styled correctly
- [x] Close on ESC key

**Files to Create:**
- `app/components/RecipePreviewModal.tsx`

**Example Structure:**
```tsx
<Modal
  open={isOpen}
  onClose={onClose}
  title={recipe.name}
  primaryAction={{
    content: 'Activate Recipe',
    onAction: () => onActivate(recipe.recipeId)
  }}
  secondaryActions={[{
    content: 'Cancel',
    onAction: onClose
  }]}
>
  <Modal.Section>
    <Banner tone="info">
      <Text>What this recipe does:</Text>
      <ol>
        <li>Monitors all customer updates in real-time</li>
        <li>Checks if customer lifetime value &gt; $1,000</li>
        <li>Automatically adds "VIP" tag</li>
      </ol>
    </Banner>
  </Modal.Section>

  <Modal.Section>
    {/* Preview table */}
  </Modal.Section>

  {/* ... */}
</Modal>
```

---

##### Subtask 3.4.2: Generate Preview Data
**Estimated Time:** 1 hour

**Steps:**
1. In modal component, generate preview data based on recipe type
2. For customer recipes:
   - Show customer name, email, LTV, current tags
3. For product recipes:
   - Show product title, inventory, price, current tags
4. For order recipes:
   - Show order number, customer, total, current tags
5. Use mock data service to generate realistic preview
6. Show "First 5 of X matching items"

**Acceptance Criteria:**
- [x] Preview data matches recipe type
- [x] Shows first 5 items
- [x] Total count displayed ("5 of 47 items")
- [x] Data is realistic (from mock service)
- [x] Table columns match wireframe

**Files to Modify:**
- `app/components/RecipePreviewModal.tsx`
- `app/services/data/mockDataService.ts` (add `getRecipePreview()` method)

---

##### Subtask 3.4.3: Add Preview Table Component
**Estimated Time:** 1 hour

**Steps:**
1. Create reusable `PreviewTable` component
2. Accept `data` and `columns` props
3. Use Polaris `IndexTable` for layout
4. Support different column configurations:
   - Customer: Name, Email, LTV, Tags
   - Product: Title, Inventory, Price, Tags
   - Order: Order #, Customer, Total, Tags
5. Highlight changes (e.g., "+ VIP" tag in green)

**Acceptance Criteria:**
- [x] Table renders correctly for all resource types
- [x] Columns sized appropriately
- [x] Changes highlighted visually
- [x] Responsive (scrolls horizontally on mobile)
- [x] Matches wireframe design

**Files to Create:**
- `app/components/PreviewTable.tsx`

**Files to Modify:**
- `app/components/RecipePreviewModal.tsx`

---

### Task 3.5: Mobile Responsive Design

**Estimated Time:** 2 hours
**Priority:** P1
**Assignee:** TBD

#### Description
Ensure recipe library works perfectly on mobile devices (375px width).

#### Acceptance Criteria
- [x] Recipe cards stack vertically (1 column)
- [x] Filters wrap to multiple rows if needed
- [x] Search input full width
- [x] Modal takes full screen on mobile
- [x] Preview table scrolls horizontally
- [x] All tap targets minimum 44x44px

#### Subtasks

##### Subtask 3.5.1: Implement Mobile Grid Layout
**Estimated Time:** 1 hour

**Steps:**
1. Test recipe grid at 375px viewport
2. Update CSS Grid to use 1 column on mobile:
   ```css
   .recipe-grid {
     display: grid;
     grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
     gap: 16px;
   }
   ```
3. Ensure category headers don't wrap awkwardly
4. Test "Show All" button on mobile
5. Verify spacing matches wireframe

**Acceptance Criteria:**
- [x] Single column layout on mobile
- [x] Cards fill width correctly
- [x] No horizontal scrolling
- [x] Category headers readable
- [x] Buttons accessible (44px height minimum)

**Files to Modify:**
- `app/routes/app.recipes.tsx`

---

##### Subtask 3.5.2: Optimize Modal for Mobile
**Estimated Time:** 1 hour

**Steps:**
1. Test RecipePreviewModal on mobile
2. Make modal full-screen on small screens
3. Preview table should scroll horizontally
4. Footer buttons full-width and stacked
5. Close button easily accessible (top-right X)

**Acceptance Criteria:**
- [x] Modal takes full viewport on mobile
- [x] Scrolling works smoothly
- [x] Table scrolls horizontally without cutting off
- [x] Buttons large enough to tap (min 44px height)
- [x] Easy to close (X button, swipe down, or backdrop tap)

**Files to Modify:**
- `app/components/RecipePreviewModal.tsx`

---

## Files Modified/Created (Summary)

```
app/
├── routes/
│   └── app.recipes.tsx              # Recipe library route (CREATED)
│
├── components/
│   ├── RecipePreviewModal.tsx       # Recipe detail modal (CREATED)
│   ├── PlanLimitModal.tsx           # Free plan limit warning (CREATED)
│   └── PreviewTable.tsx             # Resource preview table (CREATED)
│
└── services/
    └── data/
        └── mockDataService.ts       # Add getRecipePreview() method (MODIFIED)
```

---

## Mock Data Requirements

Ensure Epic 1 mock service provides:
- `getRecipes(filters?: { category?, enabled?, limit? })`
- `toggleRecipe(recipeId: string, enabled: boolean)`
- `getSettings()` (for plan limit check)
- `getRecipePreview(recipeId: string)` (NEW - returns sample affected items)

---

## Testing Strategy

### Manual Testing Checklist
- [x] Recipe library loads with all recipes
- [x] Category filter works correctly
- [x] Search filters recipes by name/description
- [x] URL params persist on page reload
- [x] Toggle switches update recipe state
- [x] Free plan limit enforced (3 recipes max)
- [x] Warning modal shows when limit reached
- [x] Preview modal displays correct data
- [x] Preview table shows first 5 items
- [x] Activate button in modal toggles recipe
- [x] Empty state shows when no recipes match filters
- [x] Mobile layout (375px) works correctly
- [x] Desktop layout (1280px) works correctly

### Accessibility Testing
- [x] Keyboard navigation works (Tab, Enter, Esc)
- [x] Toggle switches accessible via keyboard
- [x] Modal traps focus when open
- [x] Screen reader announces recipe count
- [x] Color contrast meets WCAG AA
- [x] Focus indicators visible

### Performance Testing
- [x] Initial load < 1 second
- [x] Search debouncing works (300ms delay)
- [x] Toggle feels instant (optimistic UI)
- [x] No layout shifts when toggling
- [x] Modal opens smoothly (< 200ms)

---

## Definition of Done

- [x] All subtasks completed and checked off
- [x] Recipe library matches WIREFRAME.md design exactly
- [x] Code passes `pnpm lint` with no errors
- [x] TypeScript compiles with no errors
- [x] All 20+ recipes display correctly
- [x] Filters and search work correctly
- [x] Plan limits enforced correctly
- [x] Preview modal matches wireframe
- [x] Responsive design tested on 3 screen sizes
- [x] Optimistic UI updates work smoothly
- [x] Empty states implemented
- [x] Loading states implemented
- [x] Error states with rollback implemented
- [x] Accessibility audit passed
- [x] Code reviewed by peer
- [x] Screenshots added to PR

---

## Design Reference

See **docs/WIREFRAME.md** sections:
- "Smart Tagger - Recipe Library" - Desktop View (1280px)
- "Mobile Recipe Library (375px)"
- "Recipe Detail Modal"
- "Recipe Card Component Spec"

Key design specs:
- Grid: 3 columns (desktop), 1 column (mobile)
- Card size: min 300px width
- Toggle button: Custom styled (green when ON, gray when OFF)
- Active state: 4px green left border + success badge
- Spacing: gap-400 (16px) between cards

---

## Notes

- Recipe Library is the **most important page** in the app - it's where users see and activate value
- Focus on **instant feedback** (optimistic updates, smooth animations)
- Plan limit enforcement is **critical** for Free → Pro conversion funnel
- Preview modal should **build confidence** before activation (show exactly what will happen)
- Keep **mobile experience** excellent (touch targets, scrolling, full-screen modals)

---

**Last Updated:** 2025-11-18
**Epic Owner:** TBD
**Status:** Ready for Development (after Epic 1)

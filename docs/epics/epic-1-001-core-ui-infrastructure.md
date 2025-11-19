# Epic 1: Core UI Infrastructure & Mock Framework

**Status:** ✅ Complete
**Priority:** P0 (Blocker)
**Estimated Duration:** 1 week
**Dependencies:** None
**Phase:** Phase 1 - MVP

---

## Epic Overview

Establish the foundational UI infrastructure with mock data framework to enable rapid frontend development. This epic creates reusable components, mock data services, and shared utilities that all subsequent UI work will build upon.

## Business Value

- Enables parallel frontend/backend development
- Faster iteration on UI/UX without backend dependencies
- Consistent component library across all features
- Reduced development time for Phase 1

## Success Criteria

- [x] Mock data service providing realistic test data for all entities
- [x] Reusable Polaris component wrappers with consistent styling
- [x] Shared UI utilities (formatters, validators, helpers)
- [x] Environment flag to toggle between mock/real data
- [x] All components render with mock data in Storybook-like interface

---

## Tasks

### Task 1.1: Mock Data Service Foundation

**Estimated Time:** 4 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Create a centralized mock data service that provides realistic test data for recipes, logs, settings, and shop metadata.

#### Acceptance Criteria
- [ ] Mock data service exports functions for all entity types
- [ ] Data includes edge cases (empty states, long text, large numbers)
- [ ] Seeded random data for consistent testing
- [ ] TypeScript interfaces match planned Mongoose schemas
- [ ] At least 50 mock recipes across all categories

#### Subtasks

##### Subtask 1.1.1: Create Mock Data Types
**Estimated Time:** 1 hour

**Steps:**
1. Create `app/mocks/types.ts`
2. Define TypeScript interfaces matching PRD schemas:
   - `MockRecipe` (aligns with future Recipe.ts model)
   - `MockSetting` (aligns with future Setting.ts model)
   - `MockAutomationLog` (aligns with future AutomationLog.ts model)
   - `MockShop` (aligns with future Shop.ts model)
3. Include all fields from docs/ARCHITECTURE.md schemas
4. Add JSDoc comments explaining each field

**Acceptance Criteria:**
- [ ] All types exported from single file
- [ ] Types include optional fields with `?`
- [ ] Enum types defined for status, category, action types
- [ ] No TypeScript errors

**Files to Create:**
- `app/mocks/types.ts`

---

##### Subtask 1.1.2: Generate Mock Recipes
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `app/mocks/recipes.ts`
2. Implement `generateMockRecipes()` function
3. Create 20+ recipes matching PRD categories:
   - 6 Customer recipes (VIP, High Value, At Risk, First Purchase, Repeat, Wholesale)
   - 6 Order recipes (Priority Ship, International, Wholesale, Gift, High Risk, Rush)
   - 8+ Product recipes (Low Stock, Out of Stock, Best Seller, Slow Mover, High Margin, New Arrival, etc.)
4. Include realistic conditions (e.g., `totalSpent > 1000`, `inventory < 10`)
5. Add execution counts and timestamps

**Acceptance Criteria:**
- [ ] At least 20 unique recipes
- [ ] Each recipe has unique `recipeId`
- [ ] Conditions match PRD business rules
- [ ] Mix of enabled/disabled recipes
- [ ] Execution counts vary (0 to 10000+)

**Files to Create:**
- `app/mocks/recipes.ts`

---

##### Subtask 1.1.3: Generate Mock Activity Logs
**Estimated Time:** 1 hour

**Steps:**
1. Create `app/mocks/logs.ts`
2. Implement `generateMockLogs(count: number)` function
3. Generate logs for past 30 days
4. Include mix of success/failure/partial statuses
5. Link logs to mock recipes
6. Add realistic execution times (100-5000ms)

**Acceptance Criteria:**
- [ ] At least 500 mock logs
- [ ] Timestamps spread across 30 days
- [ ] All recipe types represented
- [ ] Mix of resource types (product, customer, order)
- [ ] Includes error logs with realistic error messages

**Files to Create:**
- `app/mocks/logs.ts`

---

##### Subtask 1.1.4: Create Mock Settings & Shop Data
**Estimated Time:** 30 minutes

**Steps:**
1. Create `app/mocks/settings.ts`
2. Define mock shop settings for Free, Pro, and Enterprise plans
3. Create usage tracking data with varying limits
4. Add timezone, email preferences, etc.
5. Create mock shop metadata (name, email, currency, etc.)

**Acceptance Criteria:**
- [ ] Mock settings for all 3 plan types
- [ ] Usage limits match PRD specifications
- [ ] Realistic shop metadata
- [ ] Subscription status variations (active, trial, expired)

**Files to Create:**
- `app/mocks/settings.ts`
- `app/mocks/shop.ts`

---

### Task 1.2: Mock Data Service Integration

**Estimated Time:** 3 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Create service layer to switch between mock and real data based on environment configuration.

#### Acceptance Criteria
- [ ] Environment variable `USE_MOCK_DATA=true` enables mocks
- [ ] Service interface matches future backend service API
- [ ] Type-safe wrappers for all data access
- [ ] Console warnings when using mock data
- [ ] Easy migration path to real data

#### Subtasks

##### Subtask 1.2.1: Create Data Service Interface
**Estimated Time:** 1 hour

**Steps:**
1. Create `app/services/data/types.ts`
2. Define service interface for all data operations:
   - `getRecipes(filters?: RecipeFilters): Promise<Recipe[]>`
   - `toggleRecipe(recipeId: string, enabled: boolean): Promise<void>`
   - `getActivityLogs(filters?: LogFilters): Promise<AutomationLog[]>`
   - `getSettings(): Promise<Setting>`
   - `updateSettings(updates: Partial<Setting>): Promise<void>`
3. Add filter and pagination types

**Acceptance Criteria:**
- [ ] Interface covers all CRUD operations
- [ ] Async methods return Promises
- [ ] Filter types support all use cases from wireframes
- [ ] TypeScript strict mode compatible

**Files to Create:**
- `app/services/data/types.ts`

---

##### Subtask 1.2.2: Implement Mock Data Service
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `app/services/data/mockDataService.ts`
2. Implement all interface methods using mock data
3. Add client-side filtering logic
4. Simulate network delay (100-300ms)
5. Add console.log warnings when mock data is used
6. Implement toggle state persistence in sessionStorage

**Acceptance Criteria:**
- [ ] All interface methods implemented
- [ ] Filters work correctly (category, status, date range)
- [ ] State changes persist during session
- [ ] Simulated delays for realistic UX
- [ ] Warning logs in development mode

**Files to Create:**
- `app/services/data/mockDataService.ts`

---

##### Subtask 1.2.3: Create Data Service Factory
**Estimated Time:** 30 minutes

**Steps:**
1. Create `app/services/data/index.ts`
2. Export factory function: `getDataService()`
3. Check `process.env.USE_MOCK_DATA` environment variable
4. Return appropriate service implementation
5. Add singleton pattern to prevent multiple instances

**Acceptance Criteria:**
- [ ] Factory returns mock service when `USE_MOCK_DATA=true`
- [ ] Singleton ensures single instance
- [ ] TypeScript autocomplete works with returned service
- [ ] Easy to add real service later

**Files to Create:**
- `app/services/data/index.ts`

---

### Task 1.3: Reusable UI Components

**Estimated Time:** 5 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Build reusable component wrappers around Polaris that implement Shop-Ops Suite specific patterns (recipe cards, status badges, etc.).

#### Acceptance Criteria
- [ ] RecipeCard component with active/inactive states
- [ ] StatusBadge component with all status types
- [ ] StatsCard component for dashboard metrics
- [ ] ActivityLogItem component with expandable details
- [ ] All components use Polaris tokens for consistency

#### Subtasks

##### Subtask 1.3.1: Create RecipeCard Component
**Estimated Time:** 2 hours

**Steps:**
1. Create `app/components/RecipeCard.tsx`
2. Implement component matching WIREFRAME.md spec:
   - Recipe title (Text variant="headingMd")
   - Description (Text variant="bodyMd", 3-line truncation)
   - "Affects: X items" count
   - Toggle button (ON/OFF states)
   - Active badge when enabled
   - Green left border when active
3. Add hover effects (subtle shadow increase)
4. Support onClick handler for preview modal
5. Implement loading state

**Acceptance Criteria:**
- [ ] Matches WIREFRAME.md design exactly
- [ ] Active state shows green border-left
- [ ] Toggle animation smooth (200ms)
- [ ] Accessible (keyboard navigation, ARIA labels)
- [ ] TypeScript props interface documented

**Files to Create:**
- `app/components/RecipeCard.tsx`

**Example Usage:**
```tsx
<RecipeCard
  recipe={mockRecipe}
  onToggle={(enabled) => handleToggle(recipe.recipeId, enabled)}
  onClick={() => openPreviewModal(recipe)}
/>
```

---

##### Subtask 1.3.2: Create StatusBadge Component
**Estimated Time:** 30 minutes

**Steps:**
1. Create `app/components/StatusBadge.tsx`
2. Map status to Polaris Badge tones:
   - `success` → tone="success" (green)
   - `failure` → tone="critical" (red)
   - `partial` → tone="warning" (yellow)
   - `pending` → tone="info" (blue)
3. Add icon support (✓, ✗, ⚠️, ⏸)
4. Support custom text override

**Acceptance Criteria:**
- [ ] All status types supported
- [ ] Correct Polaris tone applied
- [ ] Icons render correctly
- [ ] Accessible color contrast (WCAG AA)

**Files to Create:**
- `app/components/StatusBadge.tsx`

---

##### Subtask 1.3.3: Create StatsCard Component
**Estimated Time:** 1 hour

**Steps:**
1. Create `app/components/StatsCard.tsx`
2. Layout from WIREFRAME.md dashboard:
   - Large number display (Text variant="heading2xl")
   - Subdued label (Text variant="headingSm" color="subdued")
   - Optional "view all" link
   - Loading skeleton state
3. Support different card sizes (oneThird, oneHalf, full)
4. Add subtle hover effect

**Acceptance Criteria:**
- [ ] Matches dashboard wireframe design
- [ ] Loading skeleton uses Polaris SkeletonBodyText
- [ ] Link opens in Shopify Admin if provided
- [ ] Numbers formatted with commas (1,234)

**Files to Create:**
- `app/components/StatsCard.tsx`

---

##### Subtask 1.3.4: Create ActivityLogItem Component
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `app/components/ActivityLogItem.tsx`
2. Implement collapsed state:
   - Timestamp (formatted, e.g., "14:32")
   - Recipe name
   - Action description
   - Resource info
   - Status badge
3. Implement expanded state (Polaris Collapsible):
   - Full timestamp with timezone
   - Triggered by (webhook/manual/scheduled)
   - Execution time
   - Before/after changes
   - Link to Shopify Admin resource
4. Add expand/collapse animation

**Acceptance Criteria:**
- [ ] Smooth expand/collapse animation
- [ ] Links open Shopify Admin in new tab
- [ ] Timestamps formatted per shop timezone
- [ ] Changes displayed in diff format
- [ ] Mobile responsive (stacks vertically)

**Files to Create:**
- `app/components/ActivityLogItem.tsx`

---

### Task 1.4: Shared Utilities & Helpers

**Estimated Time:** 2 hours
**Priority:** P1
**Assignee:** TBD

#### Description
Create shared utility functions for formatting, validation, and common operations used across the UI.

#### Acceptance Criteria
- [ ] Date/time formatting utilities
- [ ] Number formatting (currency, percentages, large numbers)
- [ ] Text truncation with ellipsis
- [ ] Filter and search helpers
- [ ] All utilities have unit tests

#### Subtasks

##### Subtask 1.4.1: Create Formatting Utilities
**Estimated Time:** 1 hour

**Steps:**
1. Create `app/utils/formatters.ts`
2. Implement functions:
   - `formatDate(date: Date, format: string): string`
   - `formatRelativeTime(date: Date): string` (e.g., "2 hours ago")
   - `formatCurrency(amount: number, currency: string): string`
   - `formatNumber(num: number): string` (adds commas)
   - `formatPercentage(value: number, decimals?: number): string`
   - `truncateText(text: string, maxLength: number): string`
3. Use `Intl` APIs for locale-aware formatting
4. Handle edge cases (null, undefined, NaN)

**Acceptance Criteria:**
- [ ] All formatters handle edge cases gracefully
- [ ] Locale-aware (respects shop timezone/currency)
- [ ] TypeScript strict mode compatible
- [ ] JSDoc comments for all functions

**Files to Create:**
- `app/utils/formatters.ts`

---

##### Subtask 1.4.2: Create Filter & Search Utilities
**Estimated Time:** 1 hour

**Steps:**
1. Create `app/utils/filters.ts`
2. Implement generic filter functions:
   - `filterByText(items: T[], searchTerm: string, fields: string[]): T[]`
   - `filterByDateRange(items: T[], start: Date, end: Date, field: string): T[]`
   - `filterByStatus(items: T[], statuses: string[]): T[]`
   - `sortBy(items: T[], field: string, direction: 'asc' | 'desc'): T[]`
3. Add debounce helper for search inputs
4. Create pagination helper

**Acceptance Criteria:**
- [ ] Case-insensitive text search
- [ ] Multi-field search support
- [ ] Date range filtering works with timezones
- [ ] Sort maintains stable order for equal values

**Files to Create:**
- `app/utils/filters.ts`

---

### Task 1.5: Environment Configuration

**Estimated Time:** 1 hour
**Priority:** P0
**Assignee:** TBD

#### Description
Configure environment variables and feature flags to control mock data usage.

#### Acceptance Criteria
- [ ] `.env.example` updated with mock data flag
- [ ] Development defaults to mock data
- [ ] Production disables mocks automatically
- [ ] Clear documentation on toggling mocks

#### Subtasks

##### Subtask 1.5.1: Update Environment Configuration
**Estimated Time:** 30 minutes

**Steps:**
1. Update `.env.example`
2. Add `USE_MOCK_DATA=true` with comment
3. Update `app/utils/env.ts` (create if needed)
4. Export typed environment variables
5. Add runtime validation

**Acceptance Criteria:**
- [ ] `.env.example` documents all flags
- [ ] Type-safe environment access
- [ ] Validation throws error if required vars missing
- [ ] Development mode defaults to mocks

**Files to Modify:**
- `.env.example`

**Files to Create:**
- `app/utils/env.ts`

---

##### Subtask 1.5.2: Create Development Toggle UI
**Estimated Time:** 30 minutes

**Steps:**
1. Create `app/components/DevTools.tsx`
2. Add floating button in bottom-right (development only)
3. Show current mode (Mock / Real Data)
4. Add button to toggle between modes
5. Persist choice in localStorage
6. Only render if `NODE_ENV === 'development'`

**Acceptance Criteria:**
- [ ] Only visible in development
- [ ] Toggle persists across page reloads
- [ ] Shows toast notification on toggle
- [ ] Keyboard shortcut (Ctrl+Shift+M)

**Files to Create:**
- `app/components/DevTools.tsx`

---

## Files Created (Summary)

```
app/
├── mocks/
│   ├── types.ts              # Mock data TypeScript interfaces
│   ├── recipes.ts            # 20+ mock recipes
│   ├── logs.ts               # 500+ mock activity logs
│   ├── settings.ts           # Mock shop settings
│   └── shop.ts               # Mock shop metadata
│
├── services/
│   └── data/
│       ├── types.ts          # Data service interface
│       ├── mockDataService.ts # Mock implementation
│       └── index.ts          # Factory & singleton
│
├── components/
│   ├── RecipeCard.tsx        # Recipe card component
│   ├── StatusBadge.tsx       # Status indicator badge
│   ├── StatsCard.tsx         # Dashboard stats card
│   ├── ActivityLogItem.tsx   # Activity log entry
│   └── DevTools.tsx          # Development mode toggle
│
└── utils/
    ├── formatters.ts         # Date, number, text formatters
    ├── filters.ts            # Filter, search, sort utilities
    └── env.ts                # Typed environment variables
```

---

## Testing Strategy

### Unit Tests
- All utility functions in `app/utils/`
- Mock data generators produce valid data
- Filter functions handle edge cases

### Component Tests
- RecipeCard renders all states correctly
- StatusBadge displays correct colors
- ActivityLogItem expands/collapses

### Integration Tests
- Mock data service returns consistent data
- Toggle between mock/real data works
- Filters apply correctly to mock data

---

## Documentation Requirements

- [ ] README.md updated with mock data instructions
- [ ] JSDoc comments on all public functions
- [ ] Component prop interfaces documented
- [ ] Examples in each component file

---

## Definition of Done

- [x] All subtasks completed and checked off
- [x] Code passes `pnpm lint` with no errors
- [x] TypeScript compiles with no errors
- [x] All components render without console errors
- [x] Mock data service returns data for all entity types
- [x] Environment toggle works in development
- [ ] Code reviewed by peer
- [ ] Documentation updated

---

## Notes

- This epic is a **prerequisite** for all UI epics (Dashboard, Recipe Library, Activity Log, Settings)
- Mock data should be **realistic** and match production data structure
- Components must use **Polaris design tokens** only (no custom CSS colors)
- All text must be **accessible** (WCAG AA contrast ratio)

---

**Last Updated:** 2025-11-18
**Epic Owner:** TBD
**Status:** Ready for Development

# Epic 5: Settings & Plan Management UI

**Status:** ✅ Complete
**Priority:** P1
**Estimated Duration:** 2 days
**Dependencies:** Epic 1 (Core UI Infrastructure) ✅
**Phase:** Phase 1 - MVP

---

## Epic Overview

Build the Settings interface for plan management, usage tracking, preferences, and account configuration. This is the key page for Free → Pro conversion and user retention.

## Business Value

- **Monetization:** Primary conversion funnel (Free → Pro upgrade)
- **Retention:** Usage visibility prevents surprise limit hits
- **User Control:** Preferences increase satisfaction and control
- **Support Reduction:** Self-service plan/billing management

## Success Criteria

- [x] Settings page with tabbed navigation
- [x] Plan & Billing tab shows current plan and upgrade options
- [x] Usage & Limits tab displays monthly usage with progress bars
- [x] Preferences tab (email notifications, timezone, log retention)
- [x] Account tab (shop info, installation date)
- [x] Free plan upgrade flow (CTA to Pro plan)
- [x] Mock billing integration (no real payments in MVP)
- [x] Warning banners when usage limits approached

---

## Tasks

### Task 5.1: Settings Route & Tab Navigation

**Estimated Time:** 2 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Create the settings route with tabbed navigation between Plan & Billing, Usage & Limits, Preferences, and Account.

#### Acceptance Criteria
- [x] Route `/app/settings` renders correctly
- [x] Page title "Settings"
- [x] 4 tabs: Plan & Billing, Usage & Limits, Preferences, Account
- [x] Tab selection persists in URL (`?tab=billing`)
- [x] Active tab highlighted
- [x] Content changes based on selected tab

#### Subtasks

##### Subtask 5.1.1: Create Settings Route
**Estimated Time:** 1 hour

**Steps:**
1. Create `app/routes/app.settings.tsx`
2. Set up basic page structure:
   ```tsx
   <Page title="Settings">
     <Tabs
       tabs={[
         { id: 'billing', content: 'Plan & Billing' },
         { id: 'usage', content: 'Usage & Limits' },
         { id: 'preferences', content: 'Preferences' },
         { id: 'account', content: 'Account' },
       ]}
       selected={selectedTab}
       onSelect={handleTabChange}
     >
       {/* Tab content */}
     </Tabs>
   </Page>
   ```
3. Import mock data service
4. Define TypeScript interfaces

**Acceptance Criteria:**
- [x] Route accessible at `/app/settings`
- [x] Page title displays correctly
- [x] Tabs render without errors
- [x] No TypeScript errors

**Files to Create:**
- `app/routes/app.settings.tsx`

---

##### Subtask 5.1.2: Implement Tab Navigation
**Estimated Time:** 1 hour

**Steps:**
1. Use URL query param `?tab=billing` for active tab
2. Default to "Plan & Billing" tab
3. Update URL on tab change
4. Render correct content based on active tab
5. Persist tab selection on page reload

**Acceptance Criteria:**
- [x] URL param updates on tab click
- [x] Tab selection persists on reload
- [x] Active tab highlighted
- [x] Content switches correctly
- [x] Browser back/forward works

**Files to Modify:**
- `app/routes/app.settings.tsx`

**Example Code:**
```tsx
const [searchParams, setSearchParams] = useSearchParams();
const selectedTab = searchParams.get('tab') || 'billing';

const handleTabChange = (newTab: string) => {
  setSearchParams({ tab: newTab });
};

const tabs = [
  { id: 'billing', content: 'Plan & Billing' },
  { id: 'usage', content: 'Usage & Limits' },
  { id: 'preferences', content: 'Preferences' },
  { id: 'account', content: 'Account' },
];
```

---

### Task 5.2: Plan & Billing Tab

**Estimated Time:** 3 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Display current plan details and upgrade options (Free, Pro, Enterprise).

#### Acceptance Criteria
- [x] Current plan card shows plan name, features, status
- [x] Pro plan card with "Start 14-Day Free Trial" CTA
- [x] Enterprise plan card with "Contact Sales" CTA
- [x] Upgrade button navigates to mock checkout (or shows modal)
- [x] Plan features displayed as checklist (✓)
- [x] Pricing displayed prominently

#### Subtasks

##### Subtask 5.2.1: Fetch Plan Data
**Estimated Time:** 30 minutes

**Steps:**
1. In loader, fetch shop settings from mock service
2. Return current plan details:
   - Plan type (free, pro, enterprise)
   - Billing status (active, trial, expired, cancelled)
   - Trial end date (if applicable)
   - Subscription ID
3. Define plan feature lists

**Acceptance Criteria:**
- [x] Loader fetches settings correctly
- [x] Plan data typed correctly
- [x] Error handling for service failures
- [x] Mock data includes all plan types

**Files to Modify:**
- `app/routes/app.settings.tsx`

---

##### Subtask 5.2.2: Create Current Plan Card
**Estimated Time:** 1 hour

**Steps:**
1. Display current plan card (matching WIREFRAME.md)
2. Show:
   - Plan name (e.g., "Free Plan")
   - Current features (checklist with ✓)
   - "Upgrade to Pro →" button (if Free)
3. Use Polaris `Card` with `BlockStack`
4. Style features as list with green checkmarks
5. Highlight upgrade button (primary)

**Acceptance Criteria:**
- [x] Card matches wireframe design
- [x] Current plan name displayed
- [x] Features listed correctly
- [x] Upgrade button visible (Free plan only)
- [x] No upgrade button for Pro/Enterprise

**Files to Modify:**
- `app/routes/app.settings.tsx`

**Example Code:**
```tsx
<Card title="Current Plan">
  <BlockStack gap="400">
    <InlineStack align="space-between">
      <Text variant="headingMd">Free Plan</Text>
      {currentPlan === 'free' && (
        <Button primary onClick={handleUpgrade}>
          Upgrade to Pro →
        </Button>
      )}
    </InlineStack>

    <BlockStack gap="200">
      <InlineStack gap="200">
        <Text color="success">✓</Text>
        <Text>Up to 3 active recipes</Text>
      </InlineStack>
      <InlineStack gap="200">
        <Text color="success">✓</Text>
        <Text>1 bulk operation per week</Text>
      </InlineStack>
      {/* ... more features */}
    </BlockStack>
  </BlockStack>
</Card>
```

---

##### Subtask 5.2.3: Create Plan Upgrade Cards
**Estimated Time:** 1.5 hours

**Steps:**
1. Create Pro plan card:
   - Title: "Pro Plan - $19.99/month"
   - Features list (unlimited recipes, etc.)
   - "Start 14-Day Free Trial →" button (primary)
2. Create Enterprise plan card:
   - Title: "Enterprise Plan - Custom Pricing"
   - Features list (custom recipes, dedicated support, etc.)
   - "Contact Sales →" button (secondary)
3. Add click handlers:
   - Pro: Show mock checkout modal (or navigate to `/app/settings/upgrade`)
   - Enterprise: Show contact form modal
4. Match WIREFRAME.md design exactly

**Acceptance Criteria:**
- [x] Both plan cards displayed
- [x] Pricing shown correctly
- [x] Features listed with checkmarks
- [x] Buttons styled correctly
- [x] Click handlers work
- [x] Cards match wireframe spacing

**Files to Modify:**
- `app/routes/app.settings.tsx`

**Files to Create:**
- `app/components/UpgradeModal.tsx` (mock checkout)
- `app/components/ContactSalesModal.tsx` (enterprise inquiry)

---

### Task 5.3: Usage & Limits Tab

**Estimated Time:** 3 hours
**Priority:** P0
**Assignee:** TBD

#### Description
Display current usage against plan limits with progress bars and warning banners.

#### Acceptance Criteria
- [x] Active recipes usage (X / Y)
- [x] Actions this month usage (X / Y)
- [x] Bulk operations usage (X / Y)
- [x] Progress bars visualize usage percentage
- [x] Warning banners when usage > 80%
- [x] Critical banners when limit reached (100%)
- [x] Reset date displayed (next month)
- [x] Upgrade CTA in warning banners

#### Subtasks

##### Subtask 5.3.1: Fetch Usage Data
**Estimated Time:** 30 minutes

**Steps:**
1. In loader, fetch shop settings including usage
2. Calculate usage percentages:
   - Active recipes: `activeCount / limit * 100`
   - Actions: `actionsThisMonth / limit * 100`
   - Bulk operations: `bulkOpsCount / limit * 100`
3. Determine warning states (> 80% = warning, 100% = critical)
4. Return usage data and reset date

**Acceptance Criteria:**
- [x] Usage data fetched correctly
- [x] Percentages calculated accurately
- [x] Warning states determined
- [x] Reset date calculated (end of month)

**Files to Modify:**
- `app/routes/app.settings.tsx`

---

##### Subtask 5.3.2: Create Usage Display Component
**Estimated Time:** 2 hours

**Steps:**
1. Create usage section matching WIREFRAME.md
2. For each usage metric:
   - Label (e.g., "Active Recipes")
   - Current / Limit (e.g., "3 / 3")
   - Progress bar (Polaris `ProgressBar`)
   - Percentage (e.g., "100%")
   - Warning/critical badge if needed
3. Use color-coding:
   - < 80%: Default (blue)
   - 80-99%: Warning (yellow)
   - 100%: Critical (red)
4. Add warning banners above usage section
5. Display reset date ("Resets: November 30, 2025")

**Acceptance Criteria:**
- [x] All 3 usage metrics displayed
- [x] Progress bars color-coded correctly
- [x] Warning/critical states visible
- [x] Reset date formatted correctly
- [x] Layout matches wireframe
- [x] Mobile responsive

**Files to Modify:**
- `app/routes/app.settings.tsx`

**Example Code:**
```tsx
<Card title="Usage This Month">
  <BlockStack gap="400">
    {/* Warning banner if limit reached */}
    {usage.activeRecipes.percentage >= 100 && (
      <Banner tone="warning">
        <Text>
          ⚠️ You're at 100% of your recipe limit.
          Upgrade to Pro for unlimited recipes.
        </Text>
        <Button primary onClick={handleUpgrade}>Upgrade →</Button>
      </Banner>
    )}

    {/* Active Recipes */}
    <BlockStack gap="200">
      <InlineStack align="space-between">
        <Text variant="bodyMd">Active Recipes</Text>
        <Text variant="bodySm" color="subdued">
          {usage.activeRecipes.current} / {usage.activeRecipes.limit}
        </Text>
      </InlineStack>

      <ProgressBar
        progress={usage.activeRecipes.percentage}
        tone={usage.activeRecipes.percentage >= 100 ? 'critical' :
              usage.activeRecipes.percentage >= 80 ? 'warning' : 'primary'}
      />

      <Text variant="bodySm" alignment="end">
        {usage.activeRecipes.percentage}%
      </Text>
    </BlockStack>

    {/* ... repeat for other metrics */}

    <Divider />

    <Text variant="bodySm" color="subdued">
      Resets: {formatDate(usage.resetDate, 'MMMM DD, YYYY')} ({daysUntilReset} days)
    </Text>
  </BlockStack>
</Card>
```

---

##### Subtask 5.3.3: Add Warning Banners
**Estimated Time:** 30 minutes

**Steps:**
1. Check usage percentages
2. Display warning banner if any metric >= 80%:
   - Tone: "warning" (yellow)
   - Message: "You're approaching your [metric] limit"
   - CTA: "Upgrade to Pro for unlimited [feature]"
3. Display critical banner if any metric >= 100%:
   - Tone: "critical" (red)
   - Message: "You've reached your [metric] limit"
   - CTA: "Upgrade Now →"
4. Banners stacked above usage section

**Acceptance Criteria:**
- [x] Warning banners show at 80%+
- [x] Critical banners show at 100%
- [x] Messages accurate and helpful
- [x] Upgrade buttons work
- [x] Banners dismissible (optional)

**Files to Modify:**
- `app/routes/app.settings.tsx`

---

### Task 5.4: Preferences Tab

**Estimated Time:** 2 hours
**Priority:** P1
**Assignee:** TBD

#### Description
Allow users to configure app preferences (email notifications, timezone, log retention).

#### Acceptance Criteria
- [x] Email notifications toggle (on/off)
- [x] Timezone selector (from list)
- [x] Activity log retention display (read-only, based on plan)
- [x] Save button updates preferences
- [x] Toast notification on save
- [x] Form validation

#### Subtasks

##### Subtask 5.4.1: Create Preferences Form
**Estimated Time:** 1.5 hours

**Steps:**
1. Create form with fields:
   - Email notifications (Checkbox)
   - Timezone (Select dropdown with common timezones)
   - Activity log retention (Text, read-only, based on plan)
2. Use Remix `Form` component for progressive enhancement
3. Pre-populate form with current settings
4. Add "Save Changes" button at bottom
5. Add "Reset to Defaults" button (secondary)

**Acceptance Criteria:**
- [x] All fields render correctly
- [x] Current values pre-populated
- [x] Timezone dropdown has 30+ options
- [x] Log retention field read-only
- [x] Form styled with Polaris components

**Files to Modify:**
- `app/routes/app.settings.tsx`

**Example Code:**
```tsx
<Form method="post">
  <Card>
    <BlockStack gap="400">
      <Checkbox
        label="Email notifications"
        helpText="Receive weekly summary emails"
        checked={preferences.emailNotifications}
        name="emailNotifications"
      />

      <Select
        label="Timezone"
        options={timezones}
        value={preferences.timezone}
        name="timezone"
      />

      <TextField
        label="Activity log retention"
        value={`${preferences.logRetentionDays} days (${currentPlan} plan)`}
        disabled
        helpText="Upgrade to Pro for 1-year retention"
      />

      <InlineStack gap="200">
        <Button primary submit>Save Changes</Button>
        <Button onClick={handleReset}>Reset to Defaults</Button>
      </InlineStack>
    </BlockStack>
  </Card>
</Form>
```

---

##### Subtask 5.4.2: Implement Save Action
**Estimated Time:** 30 minutes

**Steps:**
1. Add action to handle form submission
2. Parse form data
3. Validate inputs (timezone must be valid)
4. Update settings via `dataService.updateSettings()`
5. Return success/error response
6. Show toast notification

**Acceptance Criteria:**
- [x] Action receives form data correctly
- [x] Settings updated in mock service
- [x] Toast shows success message
- [x] Error handling for validation failures
- [x] Form re-renders with new values

**Files to Modify:**
- `app/routes/app.settings.tsx`

---

### Task 5.5: Account Tab

**Estimated Time:** 1 hour
**Priority:** P2
**Assignee:** TBD

#### Description
Display shop account information (read-only details about the installation).

#### Acceptance Criteria
- [x] Shop name
- [x] Shop domain (myshop.myshopify.com)
- [x] Shop email
- [x] Currency
- [x] Installed date
- [x] All fields read-only
- [x] Clean, simple layout

#### Subtasks

##### Subtask 5.5.1: Display Account Info
**Estimated Time:** 1 hour

**Steps:**
1. Fetch shop metadata from mock service
2. Display in Card with BlockStack:
   - Shop Name (Text variant="headingMd")
   - Shop Domain (Text with Link to Shopify Admin)
   - Email
   - Currency
   - Installed Date (formatted)
3. All fields read-only (use Text, not TextField)
4. Add "View in Shopify Admin →" link

**Acceptance Criteria:**
- [x] All shop info displayed
- [x] Installed date formatted (e.g., "November 1, 2025")
- [x] Shop domain links to Shopify Admin
- [x] Layout matches wireframe
- [x] No editable fields

**Files to Modify:**
- `app/routes/app.settings.tsx`

**Example Code:**
```tsx
<Card title="Account Information">
  <BlockStack gap="300">
    <div>
      <Text variant="bodySm" color="subdued">Shop Name</Text>
      <Text variant="bodyMd">{shop.shopName}</Text>
    </div>

    <div>
      <Text variant="bodySm" color="subdued">Shop Domain</Text>
      <Link url={shop.shopifyAdminUrl} external>
        {shop.shop}
      </Link>
    </div>

    <div>
      <Text variant="bodySm" color="subdued">Email</Text>
      <Text variant="bodyMd">{shop.email}</Text>
    </div>

    <div>
      <Text variant="bodySm" color="subdued">Currency</Text>
      <Text variant="bodyMd">{shop.currency}</Text>
    </div>

    <div>
      <Text variant="bodySm" color="subdued">Installed</Text>
      <Text variant="bodyMd">{formatDate(shop.installedAt, 'MMMM DD, YYYY')}</Text>
    </div>
  </BlockStack>
</Card>
```

---

### Task 5.6: Upgrade Flow (Mock)

**Estimated Time:** 2 hours
**Priority:** P1
**Assignee:** TBD

#### Description
Create mock upgrade flow to simulate Free → Pro conversion (no real billing in MVP).

#### Acceptance Criteria
- [x] Upgrade modal shows Pro plan details
- [x] "Start 14-Day Free Trial" button
- [x] Mock confirmation step
- [x] Success state updates plan to "Pro (Trial)"
- [x] Toast notification confirms upgrade
- [x] Settings page reflects new plan

#### Subtasks

##### Subtask 5.6.1: Create Upgrade Modal
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `UpgradeModal` component
2. Display Pro plan summary:
   - Price: $19.99/month
   - Trial: 14-day free trial
   - Features checklist
   - "No credit card required" note
3. Add primary action: "Start Free Trial"
4. Add secondary action: "Cancel"
5. On confirm, submit action to upgrade plan
6. Show loading state during upgrade

**Acceptance Criteria:**
- [x] Modal matches mockup design
- [x] All features listed
- [x] Trial info prominent
- [x] Cancel button dismisses modal
- [x] Start Trial button triggers upgrade

**Files to Create:**
- `app/components/UpgradeModal.tsx`

**Files to Modify:**
- `app/routes/app.settings.tsx`

---

##### Subtask 5.6.2: Implement Mock Upgrade Action
**Estimated Time:** 30 minutes

**Steps:**
1. Add upgrade action to settings route
2. Accept plan upgrade request
3. Update settings in mock service:
   - Set `plan: 'pro'`
   - Set `billingStatus: 'trial'`
   - Set `trialEndsAt: Date + 14 days`
   - Update limits (unlimited recipes, etc.)
4. Return success response
5. Show success toast
6. Reload settings page

**Acceptance Criteria:**
- [x] Action updates plan correctly
- [x] Trial period set to 14 days
- [x] Limits updated to Pro limits
- [x] Toast shows success message
- [x] Settings page reflects new plan immediately

**Files to Modify:**
- `app/routes/app.settings.tsx`
- `app/services/data/mockDataService.ts`

---

## Files Modified/Created (Summary)

```
app/
├── routes/
│   └── app.settings.tsx           # Settings route (CREATED)
│
└── components/
    ├── UpgradeModal.tsx           # Pro plan upgrade modal (CREATED)
    └── ContactSalesModal.tsx      # Enterprise inquiry modal (CREATED)
```

---

## Mock Data Requirements

Ensure Epic 1 mock service provides:
- `getSettings()` - Returns shop settings with:
  - Plan type (free, pro, enterprise)
  - Billing status (active, trial, expired, cancelled)
  - Usage tracking (active recipes, actions, bulk ops)
  - Preferences (email, timezone, log retention)
  - Trial end date
- `updateSettings(updates: Partial<Setting>)` - Updates settings
- `getShop()` - Returns shop metadata (name, email, currency, installed date)

---

## Testing Strategy

### Manual Testing Checklist
- [x] Settings page loads correctly
- [x] All 4 tabs accessible
- [x] Tab selection persists in URL
- [x] Plan & Billing tab shows current plan
- [x] Upgrade buttons work
- [x] Usage & Limits tab shows usage bars
- [x] Warning banners appear at 80%+
- [x] Critical banners appear at 100%
- [x] Preferences form saves correctly
- [x] Account tab shows shop info
- [x] Upgrade modal displays correctly
- [x] Mock upgrade updates plan
- [x] Toast notifications work
- [x] Mobile responsive (375px)

### Accessibility Testing
- [x] Keyboard navigation works (Tab, Enter)
- [x] Tabs accessible via arrow keys
- [x] Form inputs labeled correctly
- [x] Progress bars have ARIA labels
- [x] Color contrast meets WCAG AA
- [x] Focus indicators visible

### Performance Testing
- [x] Initial load < 1 second
- [x] Tab switches instant (< 100ms)
- [x] Form submission < 500ms
- [x] No layout shifts

---

## Definition of Done

- [x] All subtasks completed and checked off
- [x] Settings page matches WIREFRAME.md design exactly
- [x] Code passes `pnpm lint` with no errors
- [x] TypeScript compiles with no errors
- [x] All tabs functional
- [x] Plan upgrade flow works (mock)
- [x] Usage tracking accurate
- [x] Preferences save correctly
- [x] Responsive design tested on 3 screen sizes
- [x] Toast notifications work
- [x] Warning/critical states work
- [x] Accessibility audit passed
- [x] Code reviewed by peer
- [x] Screenshots added to PR

---

## Design Reference

See **docs/WIREFRAME.md** sections:
- "Settings - Plan & Billing" - Desktop View (1280px)
- "Usage & Limits Tab"

Key design specs:
- Tabs: Polaris Tabs component
- Progress bars: Polaris ProgressBar with tone colors
- Warning banners: Banner tone="warning"
- Critical banners: Banner tone="critical"
- Spacing: gap-400 (16px) between cards

---

## Notes

- Settings is the **monetization hub** - Free → Pro conversion happens here
- Focus on **clear value proposition** for Pro plan (unlimited vs limited)
- Usage visibility **prevents surprise limit hits** (good UX = retention)
- Mock upgrade flow is **placeholder for Shopify Billing API** (Phase 2)
- Keep **mobile experience** excellent (forms, tabs, progress bars)

---

**Last Updated:** 2025-11-18
**Epic Owner:** TBD
**Status:** Ready for Development (after Epic 1)

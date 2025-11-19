# Shop-Ops Suite - UI/UX Design Document

**Version:** 1.0
**Last Updated:** 2025-11-17
**Status:** Phase 0 Complete, Phase 1 Design Ready
**Design System:** Shopify Polaris v13.9.5

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [User Personas](#user-personas)
3. [Information Architecture](#information-architecture)
4. [Navigation Structure](#navigation-structure)
5. [Design System](#design-system)
6. [Key User Flows](#key-user-flows)
7. [Screen Layouts](#screen-layouts)
8. [Component Specifications](#component-specifications)
9. [Interaction Patterns](#interaction-patterns)
10. [Responsive Design](#responsive-design)
11. [Accessibility](#accessibility)
12. [Animation & Microinteractions](#animation--microinteractions)

---

## Design Philosophy

### Core Principles

#### 1. **Simplicity Over Complexity**
**Mantra:** "Recipes, Not Rules"

- Present pre-configured automation recipes instead of complex rule builders
- One-click toggle activation (On/Off)
- Hide complexity behind simple interfaces
- Progressive disclosure for advanced features

**Example:**
```
❌ BAD: "Create a rule with conditions and actions"
✅ GOOD: "Auto-tag VIP customers" [Toggle Switch]
```

#### 2. **Transparency & Trust**
**Mantra:** "Show, Don't Hide"

- Comprehensive Activity Log visible on every page
- Preview changes before execution
- Clear confirmation dialogs for destructive actions
- Real-time feedback and progress indicators

#### 3. **Native Shopify Experience**
**Mantra:** "Feel Like Home"

- 100% Shopify Polaris components
- Consistent with Shopify Admin design patterns
- Embedded seamlessly via App Bridge
- No jarring visual differences from core Shopify UI

#### 4. **Speed & Performance**
**Mantra:** "Fast Feels Professional"

- Server-side rendering for instant page loads
- Optimistic UI updates
- Skeleton loaders for async content
- No unnecessary animations or transitions

#### 5. **Mobile-First Thinking**
**Mantra:** "Works Everywhere"

- Responsive layouts using Polaris responsive utilities
- Touch-friendly tap targets (minimum 44px)
- Simplified mobile navigation
- Critical actions always accessible

---

## User Personas

### Persona 1: Sarah - Operations Manager

**Demographics:**
- Age: 32
- Role: Operations Manager at mid-sized fashion retailer
- Technical Skills: Low-Medium (comfortable with Shopify, scared of code)
- Annual Revenue: $2M

**Goals:**
- Automate repetitive tagging tasks
- Keep product data clean and organized
- Save 10+ hours per week on manual work
- Avoid breaking anything in the store

**Pain Points:**
- Overwhelmed by technical tools like Shopify Flow
- Afraid of making mistakes that affect the storefront
- Limited time to learn complex software
- Multiple apps create confusion

**Design Implications:**
- Clear, jargon-free language
- Prominent "Preview" and "Undo" options
- Helpful tooltips and onboarding
- Visual confirmation of actions

### Persona 2: Mike - Power Merchant

**Demographics:**
- Age: 45
- Role: Owner of high-volume electronics store
- Technical Skills: Medium-High (comfortable with APIs, spreadsheets)
- Annual Revenue: $8M

**Goals:**
- Bulk operations on thousands of products
- Custom metafield management (COGS tracking)
- Advanced automation workflows
- Complete audit trail for compliance

**Pain Points:**
- Existing tools too slow for large catalogs
- Needs transparency for debugging
- Wants flexibility without complexity
- Compliance and reporting requirements

**Design Implications:**
- Advanced features accessible but not prominent
- Comprehensive filtering and search
- Export capabilities (CSV, JSON)
- Detailed logs and history

### Persona 3: Alex - Agency Admin

**Demographics:**
- Age: 28
- Role: Shopify specialist managing 15 client stores
- Technical Skills: High (full-stack developer background)
- Clients: Mix of small-large merchants

**Goals:**
- Standardize processes across clients
- Quick setup and configuration
- Reusable templates/recipes
- Multi-store management (future)

**Pain Points:**
- Inconsistent tools across clients
- Time-consuming manual setup
- Difficult to explain complex tools to clients
- Need reliable, set-it-and-forget-it solutions

**Design Implications:**
- Recipe library with copy/export features
- Bulk enable/disable across recipes
- Clear documentation and help
- Professional, trustworthy appearance

---

## Information Architecture

### Site Map

```
Shop-Ops Suite
│
├── 🏠 Dashboard (Home)
│   ├── Quick Stats
│   ├── Recent Activity (last 10 actions)
│   ├── Active Recipes Summary
│   └── Quick Actions
│
├── 🏷️ Smart Tagger (Module 1)
│   ├── Recipe Library
│   │   ├── Customer Recipes (6)
│   │   ├── Order Recipes (6)
│   │   └── Product Recipes (8)
│   ├── Active Recipes (currently enabled)
│   └── Recipe Stats (execution counts)
│
├── 🔧 Metafield Manager (Module 2) [Phase 2]
│   ├── COGS Entry Interface
│   ├── Metafield Automation Recipes
│   ├── Metafield Templates
│   └── Import/Export
│
├── 🧹 Data Cleaner (Module 3) [Phase 2]
│   ├── Tag Cleaner
│   │   ├── Orphaned Tags
│   │   └── Duplicate Tags
│   ├── Auto Un-tag Recipes
│   ├── Data Audits
│   │   ├── Missing Descriptions
│   │   ├── Missing Images
│   │   └── Duplicate SKUs
│   └── Scheduled Cleanups
│
├── ⚡ Bulk Operations (Module 4) [Phase 3]
│   ├── Find & Replace Wizard
│   │   ├── Step 1: Find (filters)
│   │   ├── Step 2: Preview (results)
│   │   ├── Step 3: Confirm (action)
│   │   └── Step 4: Execute (progress)
│   └── Operation History
│
├── 📋 Activity Log (Module 5)
│   ├── All Actions (paginated table)
│   ├── Filters
│   │   ├── Date Range
│   │   ├── Action Type
│   │   ├── Resource Type
│   │   └── Status (success/failure)
│   ├── Search (by resource ID/name)
│   └── Export to CSV
│
├── ⚙️ Settings
│   ├── Plan & Billing
│   ├── Usage & Limits
│   ├── Preferences
│   │   ├── Email Notifications
│   │   ├── Timezone
│   │   └── Log Retention
│   └── Account Info
│
└── ❓ Help & Support
    ├── Documentation
    ├── Video Tutorials
    ├── Contact Support
    └── Feature Requests
```

### Content Hierarchy

**Primary Navigation (Top Level):**
1. Dashboard (default landing)
2. Smart Tagger
3. Metafield Manager
4. Data Cleaner
5. Bulk Operations
6. Activity Log
7. Settings

**Secondary Navigation (Context):**
- Module-specific filters and views
- Help tooltips and documentation links
- Quick actions (contextual shortcuts)

---

## Navigation Structure

### Top Navigation Bar (Polaris TopBar)

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Shop-Ops Suite    [Search]     [Help] [Account] [Settings]  │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- **App Icon + Name:** Branding (left-aligned)
- **Global Search:** Quick access to recipes, logs, settings
- **Help Icon:** Tooltip with documentation links
- **Account Icon:** Current shop name, plan badge
- **Settings Icon:** Quick access to preferences

### Primary Navigation (Polaris Navigation)

**Layout:** Vertical sidebar (collapsed on mobile)

```
┌──────────────────┐
│  Dashboard    🏠 │
│  Smart Tagger 🏷️ │
│  Activity Log 📋 │
│  Settings     ⚙️ │
└──────────────────┘
```

**Phase 2+ Additions:**
```
│  Metafields   🔧 │
│  Data Cleaner 🧹 │
```

**Phase 3+ Additions:**
```
│  Bulk Ops     ⚡ │
```

**Mobile Navigation:**
- Hamburger menu (top-left)
- Bottom navigation bar for primary actions
- Swipe gestures for common tasks

### Breadcrumbs

Show current location for deep navigation:

```
Dashboard > Smart Tagger > Customer Recipes > Auto-tag VIP
```

**Rules:**
- Always show on non-home pages
- Clickable for easy navigation
- Maximum 4 levels deep
- Truncate intelligently on mobile

---

## Design System

### Colors (Shopify Polaris Palette)

**Primary Colors:**
```
Primary (Brand):   #008060  (Shopify green - for primary actions)
Success:           #50B83C  (Green - successful operations)
Warning:           #EEC200  (Yellow - warnings, previews)
Critical:          #D82C0D  (Red - errors, destructive actions)
Info:              #2C6ECB  (Blue - informational messages)
```

**Neutral Colors:**
```
Surface:           #FFFFFF  (Card backgrounds)
Background:        #F6F6F7  (Page background)
Border:            #E1E3E5  (Dividers, card borders)
Text Primary:      #202223  (Body text)
Text Secondary:    #6D7175  (Helper text, labels)
Text Disabled:     #8C9196  (Disabled states)
```

**Semantic Colors:**
```
Recipe Active:     #50B83C  (Green badge)
Recipe Inactive:   #8C9196  (Gray badge)
Pro Plan:          #5C6AC4  (Purple badge)
Free Plan:         #6D7175  (Gray badge)
```

### Typography

**Font Family:**
```
Primary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
(Polaris default system font stack)
```

**Type Scale:**
```
Display Large:     28px / 700 weight (Page titles)
Display Medium:    20px / 600 weight (Section headers)
Heading:           16px / 600 weight (Card titles)
Body:              14px / 400 weight (Body text)
Caption:           12px / 400 weight (Helper text, labels)
```

**Usage Examples:**
```
Page Title:        Display Large (28px, Bold)
Module Header:     Display Medium (20px, Semibold)
Card Title:        Heading (16px, Semibold)
Body Text:         Body (14px, Regular)
Form Labels:       Body (14px, Regular)
Help Text:         Caption (12px, Regular)
```

### Spacing System

**Base Unit:** 4px (Polaris spacing tokens)

```
Spacing Scale:
--p-space-050:   2px   (tight)
--p-space-100:   4px   (extra-tight)
--p-space-200:   8px   (tight)
--p-space-300:   12px  (base-tight)
--p-space-400:   16px  (base)
--p-space-500:   20px  (loose)
--p-space-600:   24px  (extra-loose)
--p-space-800:   32px  (ultra-loose)
```

**Application:**
```
Component Padding:        16px (--p-space-400)
Card Spacing:             20px (--p-space-500)
Section Spacing:          24px (--p-space-600)
Page Margins:             32px (--p-space-800)
Form Field Spacing:       16px (--p-space-400)
Button Icon Spacing:      8px (--p-space-200)
```

### Elevation & Shadows

**Card Shadow (Polaris):**
```css
box-shadow: 0 1px 0 0 rgba(0,0,0,0.05);
border: 1px solid #E1E3E5;
border-radius: 8px;
```

**Hover Shadow:**
```css
box-shadow: 0 2px 4px rgba(0,0,0,0.1);
```

**Modal Shadow:**
```css
box-shadow: 0 4px 16px rgba(0,0,0,0.2);
```

### Border Radius

```
Small:     4px  (Badges, small buttons)
Medium:    8px  (Cards, buttons)
Large:     12px (Modals, large containers)
Circle:    50%  (Avatar, icon buttons)
```

---

## Key User Flows

### Flow 1: Activate First Recipe (Onboarding)

**Goal:** Get user to activate their first recipe within 2 minutes

**Steps:**

1. **Landing (Dashboard)**
   - See welcome banner: "Welcome to Shop-Ops Suite! Let's set up your first automation."
   - Primary CTA: "Browse Recipe Library" (large, prominent)
   - Visual: Illustration showing "3 steps to automation"

2. **Recipe Library**
   - Filter by category: "Show me: [Customer] [Order] [Product]"
   - Recipe cards show:
     - Name: "Auto-tag VIP Customers"
     - Description: "Automatically tag customers who spend over $1,000"
     - Stats: "This will affect ~47 customers" (live preview)
     - CTA: "Activate" (primary button)

3. **Recipe Detail / Preview**
   - Modal opens showing:
     - Full description
     - What it does (step-by-step)
     - Preview of affected items (table with 5 examples)
     - Confirmation: "Activate this recipe?"
     - Actions: [Cancel] [Activate Recipe]

4. **Confirmation & Success**
   - Toast notification: "✓ Recipe activated! VIP tags will be applied automatically."
   - Redirect to Dashboard showing:
     - Active recipes count: 1
     - Recent activity: "Tagged 47 customers as VIP" (in progress)
   - Prompt: "Great start! Want to add another recipe?"

**Success Metrics:**
- Time to first activation: <2 minutes
- Completion rate: >70%
- Errors encountered: <5%

### Flow 2: Bulk Tag Cleanup (Data Cleaner)

**Goal:** Clean up orphaned tags across the store

**Steps:**

1. **Navigate to Data Cleaner**
   - Click "Data Cleaner" in sidebar
   - See overview:
     - "🧹 Keep your data clean and organized"
     - Quick stats: "142 orphaned tags found"
     - CTA: "Scan for Issues"

2. **Run Scan**
   - Click "Scan for Issues" button
   - Progress modal:
     - "Scanning tags across products, customers, orders..."
     - Progress bar with percentage
     - Estimated time: "~30 seconds"

3. **Review Results**
   - Results card:
     - "Found 142 orphaned tags"
     - Table showing:
       - Tag name
       - Last used date
       - Items affected: 0
       - Action: [Delete] checkbox
     - Filters: "Show: [All] [Product Tags] [Customer Tags] [Order Tags]"
     - Bulk actions: "Select All" | "Select None"

4. **Preview Deletion**
   - Click "Delete Selected (87)" button
   - Confirmation modal:
     - "⚠️ Delete 87 tags?"
     - Warning: "This action cannot be undone"
     - List of tags to delete (scrollable)
     - Actions: [Cancel] [Yes, Delete Tags]

5. **Execute & Confirm**
   - Progress indicator: "Deleting tags... 23/87"
   - Success banner: "✓ 87 tags deleted successfully"
   - Updated stats: "55 orphaned tags remaining"
   - Activity log entry created

**Success Metrics:**
- Task completion rate: >80%
- Errors: <2%
- User satisfaction: 4.5+ stars

### Flow 3: Monitor Activity Log

**Goal:** Understand what the app has done to the store

**Steps:**

1. **Access Activity Log**
   - Click "Activity Log" in sidebar
   - See paginated table (default: last 100 actions)

2. **Filter Actions**
   - Filter controls at top:
     - Date range picker: "Last 7 days ▼"
     - Action type: [All] [Tagging] [Metafields] [Bulk Ops]
     - Resource: [All] [Products] [Customers] [Orders]
     - Status: [All] [Success] [Failure]

3. **View Details**
   - Click row to expand:
     - Timestamp: "2025-11-17 14:32:05"
     - Recipe: "Auto-tag VIP Customers"
     - Action: "Added tag 'VIP'"
     - Resource: "Customer #12345 (John Doe)"
     - Link: "View in Shopify Admin →"
     - Changes:
       - Before: `tags: []`
       - After: `tags: ["VIP"]`
     - Status: ✓ Success (green badge)

4. **Export Logs**
   - Click "Export" button
   - Modal: "Export Activity Log"
   - Options:
     - Format: [CSV ▼] [JSON]
     - Filters: "Apply current filters" [checked]
     - Date range: "Last 7 days"
     - CTA: [Cancel] [Download CSV]

5. **Download & Confirmation**
   - File downloads: `activity-log-2025-11-17.csv`
   - Toast: "✓ Activity log exported successfully"

**Success Metrics:**
- Log viewed weekly: >60% of users
- Export usage: >20% of users
- Useful for debugging: 4+ stars

---

## Screen Layouts

### Dashboard (Home Page)

**Layout:** 2-column grid (desktop), stacked (mobile)

```
┌──────────────────────────────────────────────────────────────────┐
│  🏠 Dashboard                                        [Refresh]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  📊 Quick Stats (4 stat cards in row)                       │ │
│  ├─────────────┬─────────────┬─────────────┬─────────────────┤ │
│  │ Active      │ Actions     │ Time Saved  │ Actions         │ │
│  │ Recipes     │ This Week   │ This Week   │ This Month      │ │
│  │    5        │    247      │   8.2 hrs   │    1,024        │ │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘ │
│                                                                    │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │  🏷️ Active Recipes      │  │  📋 Recent Activity          │  │
│  ├─────────────────────────┤  ├──────────────────────────────┤  │
│  │  ✓ Auto-tag VIP        │  │  14:32  Tagged 3 products    │  │
│  │    Customers            │  │  14:15  Updated metafield    │  │
│  │                         │  │  13:47  Tagged 1 customer    │  │
│  │  ✓ Low Stock Alert     │  │  13:22  Tagged 12 products   │  │
│  │                         │  │  12:58  Tagged 2 orders      │  │
│  │  ✓ International       │  │                              │  │
│  │    Orders               │  │  [View All Activity →]       │  │
│  │                         │  │                              │  │
│  │  [Manage Recipes →]    │  │                              │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  🚀 Quick Actions                                            │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  [+ Add Recipe]  [🧹 Clean Tags]  [⚡ Bulk Operations]      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Key Elements:**

1. **Quick Stats Cards:**
   - Large number (32px)
   - Label below (14px)
   - Optional trend indicator (↑ +12% vs last week)
   - Clickable to drill down

2. **Active Recipes Card:**
   - List of currently enabled recipes
   - Green checkmark for active
   - Recipe name as link
   - "Manage Recipes" CTA at bottom

3. **Recent Activity Card:**
   - Last 5-10 actions
   - Timestamp (relative: "2 mins ago")
   - Action description
   - Link to full Activity Log

4. **Quick Actions:**
   - Prominent action buttons
   - Icon + label
   - Launch most common tasks

**Mobile Adaptation:**
- Stack cards vertically
- Collapse stats to 2x2 grid
- Show 3 recent activities instead of 5

### Smart Tagger - Recipe Library

**Layout:** Grid of recipe cards

```
┌──────────────────────────────────────────────────────────────────┐
│  🏷️ Smart Tagger                                    [Add Custom]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Filter:  [All ▼]  [Customer]  [Order]  [Product]           │ │
│  │  Search:  [Search recipes..............................]     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  📁 Customer Recipes (6)                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │ Auto-tag VIP     │  │ Auto-tag High    │  │ Auto-tag At     ││
│  │ Customers        │  │ Value            │  │ Risk            ││
│  │                  │  │                  │  │                 ││
│  │ Tag customers    │  │ Tag customers    │  │ Tag customers   ││
│  │ who spend over   │  │ with AOV > $200  │  │ inactive 90+    ││
│  │ $1,000           │  │                  │  │ days            ││
│  │                  │  │                  │  │                 ││
│  │ Affects: ~47     │  │ Affects: ~23     │  │ Affects: ~156   ││
│  │                  │  │                  │  │                 ││
│  │ [═══════ ON ]    │  │ [       OFF]     │  │ [       OFF]    ││
│  └──────────────────┘  └──────────────────┘  └─────────────────┘│
│                                                                    │
│  📁 Order Recipes (6)                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐│
│  │ Priority Ship    │  │ International    │  │ Wholesale       ││
│  │                  │  │ Orders           │  │ Orders          ││
│  │ Tag orders over  │  │                  │  │                 ││
│  │ $200             │  │ Tag overseas     │  │ Tag wholesale   ││
│  │                  │  │ shipping         │  │ customers       ││
│  │                  │  │                  │  │                 ││
│  │ Affects: ~12/wk  │  │ Affects: ~8/wk   │  │ Affects: ~5/wk  ││
│  │                  │  │                  │  │                 ││
│  │ [═══════ ON ]    │  │ [═══════ ON ]    │  │ [       OFF]    ││
│  └──────────────────┘  └──────────────────┘  └─────────────────┘│
│                                                                    │
│  📁 Product Recipes (8)                          [Show All (8) ▼]│
│  ...                                                               │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Recipe Card Anatomy:**

```
┌──────────────────────────────────┐
│  Recipe Name (16px, Bold)        │  ← Title
│                                   │
│  Short description of what       │  ← Description (14px)
│  this recipe does automatically  │     2-3 lines max
│                                   │
│  Affects: ~47 items              │  ← Live preview count
│                                   │
│  Badge: 🔧 Advanced (optional)   │  ← Complexity badge
│                                   │
│  [══════════ ON  ]               │  ← Toggle switch
│   Active badge (green)           │     (Polaris Switch)
└──────────────────────────────────┘
```

**Toggle States:**

```
ON:   [══════════ ON  ]  (Green background, white text)
OFF:  [          OFF ]   (Gray background, dark text)
```

**Card States:**

1. **Default (Inactive):**
   - White background
   - Gray border
   - OFF toggle

2. **Active:**
   - Light green background (#F0F9FF)
   - Green left border (4px)
   - ON toggle
   - Green badge: "Active"

3. **Hover:**
   - Slight elevation (shadow)
   - Cursor: pointer
   - Border color darkens

4. **Loading:**
   - Skeleton animation
   - Disabled toggle
   - Spinner overlay

**Mobile Adaptation:**
- Single column cards
- Collapse descriptions (show on tap)
- Sticky filter bar at top

### Activity Log

**Layout:** Full-width data table with filters

```
┌──────────────────────────────────────────────────────────────────┐
│  📋 Activity Log                                      [Export CSV]│
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Filters:                                                    │ │
│  │  Date: [Last 7 days ▼]  Action: [All ▼]  Resource: [All ▼] │ │
│  │  Status: [All ▼]        Search: [Resource ID or name...]    │ │
│  │                                              [Clear Filters] │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Showing 247 actions                                         │ │
│  ├────────┬────────────┬────────────┬────────────┬──────┬──────┤ │
│  │ Time   │ Recipe     │ Action     │ Resource   │ Items│Status│ │
│  ├────────┼────────────┼────────────┼────────────┼──────┼──────┤ │
│  │ 14:32  │ VIP        │ Added tag  │ Customer   │  3   │  ✓   │ │
│  │        │ Customers  │ "VIP"      │ #12345 →   │      │      │ │
│  ├────────┼────────────┼────────────┼────────────┼──────┼──────┤ │
│  │ 14:15  │ Low Stock  │ Added tag  │ Product    │  12  │  ✓   │ │
│  │        │            │ "Low Stock"│ #67890 →   │      │      │ │
│  ├────────┼────────────┼────────────┼────────────┼──────┼──────┤ │
│  │ 13:47  │ Priority   │ Added tag  │ Order      │  1   │  ✓   │ │
│  │        │ Ship       │ "Priority" │ #45678 →   │      │      │ │
│  ├────────┼────────────┼────────────┼────────────┼──────┼──────┤ │
│  │ 13:22  │ Manual     │ Bulk tag   │ Product    │  47  │  ⚠   │ │
│  │        │            │ update     │ Collection │      │      │ │
│  └────────┴────────────┴────────────┴────────────┴──────┴──────┘ │
│                                                                    │
│  [← Previous]  Page 1 of 5  [Next →]                              │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Expanded Row View:**

```
┌──────────────────────────────────────────────────────────────────┐
│  14:32  │ VIP Customers  │ Added tag "VIP"  │ Customer #12345   │
│         │                                                         │
│  ▼ Details:                                                       │
│     Timestamp:     2025-11-17 14:32:05 EST                       │
│     Recipe:        Auto-tag VIP Customers                        │
│     Triggered by:  Webhook (customers/update)                    │
│     Execution:     247ms                                         │
│                                                                   │
│     Changes:                                                     │
│     Before:  tags: []                                            │
│     After:   tags: ["VIP"]                                       │
│                                                                   │
│     [View in Shopify Admin →]                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Status Icons:**

```
✓  Success (green)
⚠  Warning (yellow) - partial success
✗  Failure (red)
⏸  Skipped (gray)
```

**Mobile Adaptation:**
- Card-based layout instead of table
- Show critical info only (time, action, status)
- Expand for details
- Swipe actions (delete, view)

### Settings Page

**Layout:** Tabbed interface

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚙️ Settings                                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Plan & Billing]  [Usage & Limits]  [Preferences]  [Account]    │
│  ═══════════════                                                  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  💳 Current Plan                                             │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │                                                              │ │
│  │  Free Plan                                  [Upgrade to Pro] │ │
│  │                                                              │ │
│  │  ✓ Up to 3 active recipes                                   │ │
│  │  ✓ 1 bulk operation per week                                │ │
│  │  ✓ 30-day activity log retention                            │ │
│  │  ✓ Community support                                        │ │
│  │                                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  💎 Pro Plan - $19.99/month                                  │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │                                                              │ │
│  │  ✓ Unlimited active recipes                                 │ │
│  │  ✓ Unlimited bulk operations                                │ │
│  │  ✓ 1-year activity log retention                            │ │
│  │  ✓ Priority email support (24-48hr)                         │ │
│  │  ✓ Early access to new features                             │ │
│  │                                                              │ │
│  │                                   [Start 14-Day Free Trial] │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Usage & Limits Tab:**

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Usage This Month                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Active Recipes:   3 / 3  [════════════] 100%  (Free limit)     │
│                                                                   │
│  Actions:          247 / 1,000  [═══       ] 25%                │
│                                                                   │
│  Bulk Operations:  1 / 1  [════════════] 100%  (Free limit)     │
│                                                                   │
│  Resets:  November 30, 2025 (13 days)                           │
│                                                                   │
│  ⚠️ You're at 100% of your recipe limit. Upgrade to Pro for     │
│     unlimited recipes.  [Upgrade →]                              │
└─────────────────────────────────────────────────────────────────┘
```

**Preferences Tab:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 Notifications                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [✓] Email notifications                                         │
│      Send me weekly summaries of automation activity             │
│                                                                   │
│  [✓] Error alerts                                                │
│      Notify me when recipes fail                                 │
│                                                                   │
│  [  ] Marketing emails                                           │
│      Product updates and tips                                    │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  🌍 Timezone                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [America/New_York (EST) ▼]                                      │
│                                                                   │
│  Activity log timestamps will display in this timezone           │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Cancel]                                          [Save Changes]│
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Recipe Card Component

**Component:** `RecipeCard.tsx`

**Props:**
```typescript
interface RecipeCardProps {
  recipe: {
    id: string;
    name: string;
    description: string;
    category: 'product' | 'customer' | 'order';
    enabled: boolean;
    affectedCount: number;
    complexity?: 'basic' | 'advanced';
  };
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  loading?: boolean;
}
```

**Polaris Components Used:**
- `Card` (container)
- `Badge` (status, complexity)
- `Button` (toggle action)
- `Text` (title, description)
- `Tooltip` (help text)

**Variations:**

1. **Basic Recipe Card:**
```tsx
<Card>
  <BlockStack gap="300">
    <Text variant="headingMd" as="h3">
      {recipe.name}
    </Text>
    <Text variant="bodyMd" color="subdued">
      {recipe.description}
    </Text>
    <InlineStack align="space-between">
      <Text variant="bodySm" color="subdued">
        Affects: ~{recipe.affectedCount} items
      </Text>
      <Switch
        checked={recipe.enabled}
        onChange={(value) => onToggle(recipe.id, value)}
      />
    </InlineStack>
  </BlockStack>
</Card>
```

2. **Active Recipe Card (with visual feedback):**
```tsx
<Card background="bg-surface-success-subdued">
  <InlineStack gap="200">
    <Box borderInlineStartWidth="4" borderColor="border-success">
      {/* Card content */}
    </Box>
    <Badge tone="success">Active</Badge>
  </InlineStack>
</Card>
```

### Activity Log Row Component

**Component:** `ActivityLogRow.tsx`

**Props:**
```typescript
interface ActivityLogRowProps {
  log: {
    id: string;
    timestamp: Date;
    recipeName: string;
    actionType: string;
    resourceType: string;
    resourceId: string;
    resourceTitle?: string;
    status: 'success' | 'failure' | 'partial';
    errorMessage?: string;
    changesBefore: any;
    changesAfter: any;
  };
  expanded?: boolean;
  onToggleExpand: (id: string) => void;
}
```

**Polaris Components Used:**
- `IndexTable.Row`
- `IndexTable.Cell`
- `Badge` (status)
- `Link` (resource link)
- `Collapsible` (expanded details)
- `Icon` (status icons)

**Status Badges:**
```tsx
{status === 'success' && <Badge tone="success">Success</Badge>}
{status === 'failure' && <Badge tone="critical">Failed</Badge>}
{status === 'partial' && <Badge tone="warning">Partial</Badge>}
```

### Filter Bar Component

**Component:** `FilterBar.tsx`

**Props:**
```typescript
interface FilterBarProps {
  filters: {
    dateRange: string;
    actionType: string;
    resourceType: string;
    status: string;
    search: string;
  };
  onFilterChange: (filters: Partial<FilterBarProps['filters']>) => void;
  onClearFilters: () => void;
}
```

**Polaris Components Used:**
- `Filters` (container)
- `Select` (dropdowns)
- `TextField` (search)
- `Button` (clear filters)

**Example:**
```tsx
<Filters
  queryValue={filters.search}
  queryPlaceholder="Search by resource ID or name"
  filters={[
    {
      key: 'dateRange',
      label: 'Date Range',
      filter: (
        <Select
          value={filters.dateRange}
          options={[
            { label: 'Last 7 days', value: '7d' },
            { label: 'Last 30 days', value: '30d' },
            { label: 'Last 90 days', value: '90d' },
            { label: 'Custom', value: 'custom' },
          ]}
          onChange={(value) => onFilterChange({ dateRange: value })}
        />
      ),
    },
    // ... more filters
  ]}
  onQueryChange={(value) => onFilterChange({ search: value })}
  onQueryClear={() => onFilterChange({ search: '' })}
  onClearAll={onClearFilters}
/>
```

### Stats Card Component

**Component:** `StatsCard.tsx`

**Props:**
```typescript
interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
    label: string;
  };
  icon?: React.ReactNode;
  onClick?: () => void;
}
```

**Example:**
```tsx
<Card>
  <BlockStack gap="200">
    <InlineStack align="space-between">
      <Text variant="headingSm" color="subdued">
        {title}
      </Text>
      {icon}
    </InlineStack>
    <Text variant="heading2xl" as="p">
      {value}
    </Text>
    {trend && (
      <InlineStack gap="100">
        <Icon source={trend.direction === 'up' ? ArrowUpMinor : ArrowDownMinor} />
        <Text variant="bodySm" color={trend.direction === 'up' ? 'success' : 'critical'}>
          {trend.percentage}% {trend.label}
        </Text>
      </InlineStack>
    )}
  </BlockStack>
</Card>
```

### Toggle Switch Component

**Usage:** Native Polaris `Switch` component with custom wrapper

```tsx
<FormLayout>
  <Switch
    label="Auto-tag VIP Customers"
    checked={enabled}
    onChange={handleToggle}
    helpText="Automatically tag customers who spend over $1,000"
  />
</FormLayout>
```

**States:**
- **Off:** Gray background, dark text
- **On:** Green background, white text
- **Disabled:** Gray background, lighter text, cursor not-allowed
- **Loading:** Spinner overlay, disabled

---

## Interaction Patterns

### Toggle Recipe (Primary Interaction)

**Flow:**

1. **User clicks toggle switch**
   - Immediate visual feedback (switch animates)
   - Loading state (spinner on card)

2. **Validation (client-side)**
   - Check plan limits (Free: 3 recipes max)
   - If limit reached: Show error toast

3. **API request (server-side)**
   - POST `/app/recipes/toggle`
   - Body: `{ recipeId, enabled: true }`

4. **Response handling:**
   - **Success:**
     - Update UI optimistically
     - Show success toast: "✓ Recipe activated"
     - Refresh stats on dashboard
   - **Failure:**
     - Revert toggle state
     - Show error toast: "Failed to activate recipe. Please try again."
     - Log error to console

5. **Background processing:**
   - Webhook registration (if needed)
   - Initial scan of affected items (async)

**Code Example:**
```typescript
const handleToggle = async (recipeId: string, enabled: boolean) => {
  try {
    setLoading(true);

    // Optimistic update
    updateRecipeLocally(recipeId, { enabled });

    // API call
    const response = await fetch('/app/recipes/toggle', {
      method: 'POST',
      body: JSON.stringify({ recipeId, enabled }),
    });

    if (!response.ok) throw new Error('Toggle failed');

    // Success feedback
    shopify.toast.show('Recipe activated successfully');

  } catch (error) {
    // Revert optimistic update
    updateRecipeLocally(recipeId, { enabled: !enabled });
    shopify.toast.show('Failed to toggle recipe', { isError: true });
  } finally {
    setLoading(false);
  }
};
```

### Preview Before Action (Bulk Operations)

**Pattern:** 4-step wizard with preview

1. **Step 1: Define Action**
   - Form: "Find products with tag X"
   - CTA: "Preview Results"

2. **Step 2: Preview**
   - Show first 100 matching items
   - Display: "This will affect 1,247 products"
   - CTA: "Confirm Action"

3. **Step 3: Confirm**
   - Modal: "⚠️ Are you sure?"
   - Summary: "Add tag 'Sale' to 1,247 products"
   - Actions: [Cancel] [Yes, Proceed]

4. **Step 4: Execute**
   - Progress bar: "Processing... 247/1,247"
   - Estimated time: "~5 minutes remaining"
   - Allow cancellation
   - On completion: Success banner + redirect to Activity Log

**Component:**
```tsx
<Page title="Bulk Tag Products">
  <VerticalStack gap="400">
    {/* Progress Indicator */}
    <ProgressIndicator current={step} total={4} />

    {/* Step Content */}
    {step === 1 && <DefineActionStep />}
    {step === 2 && <PreviewStep items={previewItems} total={totalCount} />}
    {step === 3 && <ConfirmStep action={action} count={totalCount} />}
    {step === 4 && <ExecuteStep progress={progress} />}

    {/* Navigation */}
    <InlineStack align="end" gap="200">
      {step > 1 && <Button onClick={handleBack}>Back</Button>}
      <Button primary onClick={handleNext}>
        {step === 4 ? 'Done' : 'Next'}
      </Button>
    </InlineStack>
  </VerticalStack>
</Page>
```

### Error Handling Pattern

**Levels of Errors:**

1. **Inline Validation (Form Fields):**
```tsx
<TextField
  label="Threshold Amount"
  type="number"
  value={threshold}
  onChange={setThreshold}
  error={threshold < 0 ? 'Amount must be positive' : undefined}
/>
```

2. **Toast Notifications (Transient Errors):**
```tsx
shopify.toast.show('Failed to save settings. Please try again.', {
  isError: true,
  duration: 5000,
});
```

3. **Banner Notifications (Persistent Errors):**
```tsx
<Banner tone="critical" title="Recipe execution failed">
  <p>
    The recipe "Auto-tag VIP" failed to execute due to API rate limiting.
    We'll retry automatically.
  </p>
</Banner>
```

4. **Full-Page Error (Critical Failures):**
```tsx
<Page>
  <EmptyState
    heading="Something went wrong"
    image="/error-illustration.svg"
    action={{ content: 'Try Again', onAction: handleRetry }}
  >
    <p>We couldn't load your recipes. Please refresh the page.</p>
  </EmptyState>
</Page>
```

### Loading States Pattern

**Skeleton Screens:**

```tsx
<Card>
  <BlockStack gap="200">
    <SkeletonDisplayText size="small" />
    <SkeletonBodyText lines={3} />
    <InlineStack gap="200">
      <SkeletonDisplayText size="extraSmall" />
      <SkeletonDisplayText size="extraSmall" />
    </InlineStack>
  </BlockStack>
</Card>
```

**Spinners (for quick actions):**

```tsx
<Button loading={isLoading} onClick={handleSave}>
  Save Changes
</Button>
```

**Progress Bars (for long operations):**

```tsx
<ProgressBar progress={percentComplete} tone="success" />
<Text variant="bodySm" color="subdued">
  Processing... {itemsProcessed}/{totalItems} ({percentComplete}%)
</Text>
```

---

## Responsive Design

### Breakpoints

Following Polaris responsive utilities:

```
Small:     0-768px   (Mobile)
Medium:    769-1024px (Tablet)
Large:     1025+px   (Desktop)
```

### Layout Grid

**Desktop (Large):**
```
┌────────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main Content (flex) │
│                          │                      │
│  Navigation             │  Page Content        │
│  - Dashboard            │                      │
│  - Smart Tagger         │  2-column grid       │
│  - Activity Log         │  (cards, stats)      │
│  - Settings             │                      │
└────────────────────────────────────────────────┘
```

**Tablet (Medium):**
```
┌────────────────────────────────────────────────┐
│  Collapsible Sidebar  │  Main Content (flex)   │
│  (overlay on toggle)  │                        │
│                       │  Page Content          │
│                       │                        │
│                       │  1-column grid         │
│                       │  (stacked cards)       │
└────────────────────────────────────────────────┘
```

**Mobile (Small):**
```
┌──────────────────────┐
│  Top Bar             │
│  [☰]  Shop-Ops  [⋮] │
├──────────────────────┤
│                      │
│  Page Content        │
│                      │
│  Full-width cards    │
│  Stacked vertically  │
│                      │
│                      │
├──────────────────────┤
│  Bottom Nav Bar      │
│  [🏠] [🏷️] [📋] [⚙️] │
└──────────────────────┘
```

### Mobile-Specific Adaptations

**Navigation:**
- Hamburger menu for primary navigation
- Bottom tab bar for quick access (Dashboard, Recipes, Activity, Settings)
- Swipe gestures for back/forward

**Recipe Cards:**
- Full-width cards
- Larger tap targets (48px minimum)
- Simplified descriptions (truncate to 2 lines)
- Prominent toggle switch (larger, easier to tap)

**Tables → Cards:**
- Activity Log table becomes card list
- Each row becomes a card with key info
- Tap to expand for full details
- Swipe actions (delete, view details)

**Forms:**
- Stacked form fields (full width)
- Larger input fields (48px height)
- Full-screen modals instead of popovers
- Native date/time pickers

**Stats:**
- 2x2 grid instead of 4 across
- Larger numbers (easier to read)
- Simplified trend indicators

### Touch Interactions

**Minimum Tap Target:** 44x44px (Apple HIG) / 48x48px (Material Design)

**Gestures:**
- **Swipe Right:** Navigate back
- **Swipe Left:** Navigate forward
- **Pull to Refresh:** Reload data (dashboard, activity log)
- **Long Press:** Context menu (card options)

**Example:**
```tsx
<Swipeable
  onSwipeLeft={() => handleDelete(item.id)}
  onSwipeRight={() => handleArchive(item.id)}
>
  <ActivityLogCard {...item} />
</Swipeable>
```

---

## Accessibility

### WCAG 2.1 AA Compliance

**Goals:**
- All interactive elements keyboard accessible
- Screen reader friendly
- Color contrast ratios meet AA standards
- No flashing content (seizure risk)

### Keyboard Navigation

**Tab Order:**
1. Skip to main content link
2. Primary navigation
3. Page title
4. Main content (forms, buttons, links)
5. Footer links

**Keyboard Shortcuts:**
```
Ctrl + /   →  Open global search
Ctrl + K   →  Command palette
Esc        →  Close modal/popover
Enter      →  Activate button/link
Space      →  Toggle checkbox/switch
Tab        →  Next element
Shift+Tab  →  Previous element
```

**Focus Indicators:**
```css
:focus {
  outline: 2px solid #008060; /* Shopify green */
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Screen Reader Support

**Polaris Built-in Accessibility:**
- All components have proper ARIA labels
- Semantic HTML (`<nav>`, `<main>`, `<article>`)
- Landmark regions for navigation
- Live regions for dynamic updates

**Custom Implementations:**

**Recipe Card:**
```tsx
<Card>
  <BlockStack gap="300">
    <Text as="h3" id={`recipe-${recipe.id}-title`}>
      {recipe.name}
    </Text>
    <Text aria-describedby={`recipe-${recipe.id}-title`}>
      {recipe.description}
    </Text>
    <Switch
      checked={recipe.enabled}
      onChange={handleToggle}
      aria-label={`Toggle ${recipe.name} recipe`}
      aria-describedby={`recipe-${recipe.id}-title`}
    />
  </BlockStack>
</Card>
```

**Loading States:**
```tsx
<div role="status" aria-live="polite" aria-busy={loading}>
  {loading ? (
    <>
      <VisuallyHidden>Loading recipes...</VisuallyHidden>
      <Spinner size="small" />
    </>
  ) : (
    <RecipeList recipes={recipes} />
  )}
</div>
```

**Error Announcements:**
```tsx
<div role="alert" aria-live="assertive">
  {error && <Banner tone="critical">{error.message}</Banner>}
</div>
```

### Color Contrast

**Minimum Ratios (WCAG AA):**
- Normal text (14px+): 4.5:1
- Large text (18px+): 3:1
- Interactive elements: 3:1

**Polaris Colors (Pre-validated):**
```
Text on Surface (#202223 on #FFFFFF):  14.5:1 ✓
Primary Button (#008060):              4.5:1 ✓
Link (#2C6ECB):                        8:1 ✓
Success Badge (#50B83C on #F0F9FF):    4.8:1 ✓
```

### Alternative Text

**Images:**
```tsx
<img src="/recipe-icon.svg" alt="VIP customer recipe icon" />
```

**Icons (decorative):**
```tsx
<Icon source={TagMinor} aria-hidden="true" />
<Text>Tags</Text>
```

**Icons (functional):**
```tsx
<Button icon={DeleteMinor} accessibilityLabel="Delete recipe" />
```

### Form Accessibility

**Labels:**
```tsx
<FormLayout>
  <TextField
    label="Recipe Name"
    value={name}
    onChange={setName}
    helpText="Choose a descriptive name for your recipe"
    error={errors.name}
    requiredIndicator
  />
</FormLayout>
```

**Fieldsets:**
```tsx
<FormLayout>
  <fieldset>
    <legend>Notification Preferences</legend>
    <Checkbox label="Email notifications" checked={emailEnabled} />
    <Checkbox label="Error alerts" checked={errorAlertsEnabled} />
  </fieldset>
</FormLayout>
```

---

## Animation & Microinteractions

### Animation Principles

1. **Purposeful:** Animations should communicate, not decorate
2. **Fast:** Keep animations under 300ms
3. **Natural:** Use easing functions (ease-out, ease-in-out)
4. **Respectful:** Honor `prefers-reduced-motion` setting

### Polaris Motion Tokens

```css
--p-motion-duration-0:    0ms     (instant)
--p-motion-duration-50:   50ms    (fastest)
--p-motion-duration-100:  100ms   (faster)
--p-motion-duration-150:  150ms   (fast)
--p-motion-duration-200:  200ms   (base)
--p-motion-duration-250:  250ms   (slow)
--p-motion-duration-300:  300ms   (slower)
--p-motion-duration-350:  350ms   (slowest)

--p-motion-ease:          cubic-bezier(0.25, 0.1, 0.25, 1)
--p-motion-ease-in:       cubic-bezier(0.42, 0, 1, 1)
--p-motion-ease-out:      cubic-bezier(0, 0, 0.58, 1)
--p-motion-ease-in-out:   cubic-bezier(0.42, 0, 0.58, 1)
```

### Common Animations

**Toggle Switch:**
```css
.toggle {
  transition: background-color 200ms ease-out,
              transform 200ms ease-out;
}

.toggle:checked {
  background-color: var(--p-color-bg-success);
}

.toggle-handle {
  transform: translateX(0);
  transition: transform 200ms ease-out;
}

.toggle:checked .toggle-handle {
  transform: translateX(20px);
}
```

**Card Hover:**
```css
.recipe-card {
  transition: box-shadow 150ms ease-out,
              transform 150ms ease-out;
}

.recipe-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
```

**Toast Notification:**
```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toast {
  animation: slideIn 200ms ease-out;
}
```

**Skeleton Loading:**
```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

### Microinteractions

**Success Feedback:**
```tsx
// Checkmark animation on recipe activation
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
>
  <Icon source={CheckmarkMinor} color="success" />
</motion.div>
```

**Button Click:**
```css
.button {
  transition: transform 100ms ease-out;
}

.button:active {
  transform: scale(0.95);
}
```

**Badge Pulse (new activity):**
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.badge-new {
  animation: pulse 2s ease-in-out infinite;
}
```

### Reduced Motion

**Respect User Preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**JavaScript Check:**
```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReducedMotion) {
  // Skip animations, use instant state changes
}
```

---

## Appendix

### Design Resources

**Figma Files:** (To be created)
- Component library
- Page mockups
- User flow diagrams
- Prototype links

**Polaris Documentation:**
- [Polaris Design System](https://polaris.shopify.com/)
- [Component Library](https://polaris.shopify.com/components)
- [Design Tokens](https://polaris.shopify.com/tokens/color)
- [Accessibility Guidelines](https://polaris.shopify.com/foundations/accessibility)

**Tools:**
- **Figma:** UI design and prototyping
- **Contrast Checker:** WebAIM contrast checker
- **Screen Reader:** NVDA (Windows), VoiceOver (Mac)
- **Browser DevTools:** Chrome Lighthouse (accessibility audit)

### Design Checklist

**Before Development:**
- [ ] All user flows documented
- [ ] Wireframes approved
- [ ] High-fidelity mockups complete
- [ ] Prototype tested with 5+ users
- [ ] Accessibility audit passed
- [ ] Mobile responsive designs finalized
- [ ] Design system tokens defined

**During Development:**
- [ ] Components match Polaris specs
- [ ] Proper semantic HTML used
- [ ] ARIA labels added where needed
- [ ] Keyboard navigation tested
- [ ] Color contrast verified
- [ ] Loading states implemented
- [ ] Error states handled gracefully

**Before Launch:**
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Screen reader testing (NVDA, VoiceOver)
- [ ] Lighthouse accessibility score >90
- [ ] Performance testing (Core Web Vitals)
- [ ] User acceptance testing (UAT)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-17
**Next Review:** Phase 1 Development Start (Q1 2026)

---
description: Create next epics based on project documentation and current phase
allowed-tools: Read(*), Write(*), Glob(*), TodoWrite(*)
thinking: deep
---

# Plan Next Epics for Shop-Ops Suite

You are a product manager and technical architect for Shop-Ops Suite. Your job is to analyze the project's current state and create actionable epics for the next development phase.

## Context Documents

Review these project documents to understand the full scope:
- @docs/ARCHITECTURE.md - Technical architecture and implementation details
- @docs/PRD.md - Product requirements and feature specifications
- @docs/UI_UX_DESIGN.md - UI/UX design specifications and patterns
- @docs/WIREFRAME.md - Detailed wireframes and component specs

## Current State Analysis

First, analyze the current state:

1. **Check existing epics:**
   - Look for files in `docs/epics/` directory
   - Read each epic file to understand what's been planned
   - Identify completed vs pending epics

2. **Identify current phase:**
   - Review ARCHITECTURE.md sections "Current Implementation Status" and "Development Roadmap"
   - Review PRD.md section "Development Roadmap" (Phase 0-4)
   - Determine which phase is currently in progress
   - Calculate completion percentage

3. **Review what's built:**
   - Check `app/routes/` for implemented features
   - Check `app/models/` for data models (if exists)
   - Check `app/services/` for business logic (if exists)
   - Review git status for recently added/modified files

## Epic Creation Guidelines

**IMPORTANT:** All tasks within epics MUST follow the format specified in `@.claude/task-template.md`.

Before creating epics, review the task template structure:
- @.claude/task-template.md - Detailed task breakdown format

Based on your analysis, create epics following this structure:

### If Current Phase Has Incomplete Work:

Create epics for the **current phase's remaining features**:

**Epic Structure:**
```markdown
# Epic: [Epic Name]

**Phase:** [Current Phase Number and Name]
**Priority:** High/Medium/Low
**Estimated Effort:** [X] days
**Dependencies:** [List any dependencies]

---

## 1. Understanding Phase

### Objective
[Clear description of what this epic accomplishes and the end goal]

### Scope
**Included:**
- [Feature/component 1]
- [Feature/component 2]

**Excluded (Out of Scope):**
- [What's not part of this epic]
- [Future enhancements]

### Dependencies
- [ ] [Prerequisite 1 - e.g., MongoDB connection must be working]
- [ ] [Prerequisite 2 - e.g., Recipe model must exist]

### Success Criteria
- [ ] [Specific, measurable criterion 1]
- [ ] [Specific, measurable criterion 2]
- [ ] [Specific, measurable criterion 3]

---

## 2. Planning Phase

### Architecture Review
- **Alignment**: [How this aligns with ARCHITECTURE.md]
- **Patterns**: [Which architectural patterns to follow]
- **Constraints**: [Server-side only, multi-tenant, etc.]

### Data Models
**Mongoose Schemas Needed:**
- `ModelName` - [Description and key fields]

**Indexes Required:**
- `{ shop: 1, enabled: 1 }` - [Purpose]

### API Design
**GraphQL Queries:**
```graphql
query ExampleQuery {
  # GraphQL query structure
}
```

**GraphQL Mutations:**
```graphql
mutation ExampleMutation($input: Input!) {
  # GraphQL mutation structure
}
```

**Remix Loaders/Actions:**
- `app/routes/app.example.tsx` - [Loader and action description]

### UI/UX Design
**Polaris Components:**
- `Page`, `Card`, `Button`, `Banner` - [How they'll be used]

**Wireframe Reference:**
- See WIREFRAME.md section: [Section name]

---

## 3. Breakdown Structure

### 3.1 Backend Tasks
- [ ] **Database Schema Updates**
  - [ ] Create `app/models/ModelName.ts` with proper TypeScript interface
  - [ ] Add compound indexes for multi-tenant queries
  - [ ] Add field validation (required, enums, types)

- [ ] **Service Layer Implementation**
  - [ ] Create `app/services/serviceName.ts`
  - [ ] Implement [specific function 1]
  - [ ] Implement [specific function 2]
  - [ ] Add error handling with try-catch blocks
  - [ ] Add JSDoc comments for all public functions

- [ ] **API Endpoints**
  - [ ] Create Remix loader in `app/routes/app.example.tsx`
  - [ ] Create Remix action for form submissions
  - [ ] Add authentication check (`authenticate.admin`)
  - [ ] Add MongoDB connection (`connectToMongoDB()`)
  - [ ] Add shop-scoped queries (`{ shop: session.shop }`)

- [ ] **Job Queue Integration** (if applicable)
  - [ ] Define BullMQ job in `app/jobs/jobName.ts`
  - [ ] Add job processor function
  - [ ] Add retry logic with exponential backoff

- [ ] **Webhook Handlers** (if applicable)
  - [ ] Register webhook in `shopify.app.toml`
  - [ ] Create `app/routes/webhooks.topic.name.tsx`
  - [ ] Add HMAC validation (`authenticate.webhook`)
  - [ ] Ensure response time < 500ms

### 3.2 Frontend Tasks
- [ ] **Route Creation/Updates**
  - [ ] Create `app/routes/app.example.tsx`
  - [ ] Add Page component with title and subtitle
  - [ ] Add Layout structure

- [ ] **Polaris Component Integration**
  - [ ] Implement Card components for data display
  - [ ] Add Button components with proper actions
  - [ ] Add Badge components for status indicators
  - [ ] Add Banner components for error messages

- [ ] **Form Handling and Validation**
  - [ ] Create form with TextField/Select components
  - [ ] Add client-side validation
  - [ ] Add FormData submission to action
  - [ ] Add input sanitization

- [ ] **Optimistic UI Updates**
  - [ ] Add local state for immediate feedback
  - [ ] Update UI before server response
  - [ ] Revert on error

- [ ] **Error Handling**
  - [ ] Add error boundaries
  - [ ] Display user-friendly error messages
  - [ ] Add retry mechanisms where appropriate

### 3.3 Integration Tasks
- [ ] **Shopify GraphQL Integration**
  - [ ] Add GraphQL queries with proper types
  - [ ] Run `pnpm graphql-codegen` to generate types
  - [ ] Implement rate limit handling
  - [ ] Add retry logic for API failures

- [ ] **Recipe Engine Integration** (if applicable)
  - [ ] Call recipe evaluation function
  - [ ] Pass correct payload format
  - [ ] Handle recipe execution results

- [ ] **Activity Log Integration**
  - [ ] Create AutomationLog entries on actions
  - [ ] Include all required fields (shop, recipeId, resourceType, etc.)
  - [ ] Add before/after change tracking

- [ ] **Settings/Limits Checks**
  - [ ] Verify plan limits (Free vs Pro)
  - [ ] Show upgrade prompts when limits reached
  - [ ] Block actions that exceed limits

### 3.4 Testing & Validation Tasks
- [ ] **Type Safety Verification**
  - [ ] Run `pnpm types-check` - must pass
  - [ ] No `any` types or `@ts-ignore` comments
  - [ ] All functions have return types

- [ ] **Linting Checks**
  - [ ] Run `pnpm lint` - must pass
  - [ ] Fix all warnings and errors

- [ ] **Build Verification**
  - [ ] Run `pnpm build` - must succeed
  - [ ] No build errors or warnings

- [ ] **Manual Testing Checklist**
  - [ ] Feature works end-to-end
  - [ ] All edge cases handled
  - [ ] Error messages are user-friendly
  - [ ] Works with multiple shops (multi-tenant)
  - [ ] No console errors in browser
  - [ ] Webhook responds within 500ms (if applicable)

---

## 4. Implementation Order

Execute tasks in this priority order:

1. **Data Layer** (Priority 1 - Highest)
   - Mongoose models and schemas
   - Database indexes

2. **Business Logic** (Priority 2)
   - Service layer functions
   - Utility functions
   - Recipe engine integration

3. **API Layer** (Priority 3)
   - Remix loaders and actions
   - GraphQL queries/mutations
   - Webhook handlers

4. **UI Layer** (Priority 4)
   - React components
   - Polaris integration
   - Form handling

5. **Integration & Testing** (Priority 5)
   - End-to-end testing
   - Multi-tenant verification
   - Performance testing

---

## 5. Code Quality Standards

### Naming Conventions
- **Files**: kebab-case (e.g., `recipe-engine.ts`)
- **Components**: PascalCase (e.g., `RecipeCard`)
- **Functions**: camelCase (e.g., `executeRecipe`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RECIPES`)

### Multi-Tenant Pattern
```typescript
// ✅ ALWAYS scope by shop
await Recipe.find({ shop: session.shop });

// ❌ NEVER query without shop
await Recipe.find({ enabled: true });
```

### Error Handling
```typescript
try {
  // Operation
  return json({ success: true });
} catch (error) {
  console.error('Operation failed:', error);
  return json({ error: error.message }, { status: 500 });
}
```

### Type Safety
```typescript
// Use proper types from models
import type { IRecipe } from '~/models/Recipe';

// Generate GraphQL types
// Run: pnpm graphql-codegen
import type { CreateProductMutation } from '~/types/admin.generated';
```

---

## 6. Files to Create/Modify

### New Files
- `app/models/ModelName.ts` - [Description of data model]
- `app/services/serviceName.ts` - [Description of business logic]
- `app/routes/app.example.tsx` - [Description of UI route]
- `app/jobs/jobName.ts` - [Description of background job]

### Modified Files
- `app/routes/app.route.tsx` - [Specific changes needed]
- `shopify.app.toml` - [Webhook registrations or config changes]

---

## 7. Acceptance Criteria

### Functional Requirements
1. [Feature works as described in PRD.md]
2. [All user actions produce expected results]
3. [Error cases handled gracefully]

### Performance Requirements
1. [Page loads in < 200ms]
2. [Webhook responds in < 500ms]
3. [Database queries use proper indexes]

### Quality Requirements
1. [No TypeScript errors]
2. [No linting errors]
3. [Build succeeds]
4. [Multi-tenant data scoping verified]

---

## 8. Completion Checklist

Before marking this epic as complete:

**Code Quality:**
- [ ] No TypeScript errors (`pnpm types-check`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No `any` types or `@ts-ignore` comments
- [ ] All functions have return types

**Functionality:**
- [ ] Feature works end-to-end
- [ ] All edge cases handled
- [ ] Error messages are user-friendly
- [ ] Optimistic UI for better UX (where applicable)

**Security & Multi-Tenancy:**
- [ ] All database queries scoped by `shop`
- [ ] Webhook HMAC validation present (if applicable)
- [ ] No hardcoded shop domains
- [ ] Tested with multiple shops

**Error Handling:**
- [ ] Try-catch blocks present
- [ ] Errors logged to console
- [ ] User-facing errors shown in UI
- [ ] Doesn't crash the application

**Documentation:**
- [ ] Complex logic has comments
- [ ] JSDoc for public functions
- [ ] README updated if needed
- [ ] CHANGELOG updated

---

## 9. Definition of Done

**✅ DONE means:**
- All tasks in sections 3.1-3.4 are completed and checked [x]
- All items in "Completion Checklist" are checked [x]
- Feature is fully functional and production-ready
- No known bugs or issues
- Code follows all quality standards from task-template.md
- Successfully tested with multiple shops (multi-tenant verified)

**❌ NOT DONE means:**
- Any task in sections 3.1-3.4 is unchecked [ ]
- Any item in "Completion Checklist" is unchecked [ ]
- Feature has TODOs or placeholder code
- Build fails or has type errors
- Not tested or partially tested
- Missing error handling or shop scoping

**See @.claude/task-template.md sections "Definition of Done vs Not Done" for detailed examples.**

---

## 10. Notes

[Any additional context, warnings, or considerations specific to this epic]

---

**Epic Status:** [ ] Not Started | [ ] In Progress | [ ] Done
**Last Updated:** [Date]
```

### If Current Phase Is Complete:

1. **Confirm phase completion:**
   - Verify all features from current phase are implemented
   - Check against ARCHITECTURE.md and PRD.md roadmap

2. **Move to next phase:**
   - Identify the next phase from the roadmap
   - Create epics for that phase's deliverables

3. **Update status:**
   - Note that we're transitioning to a new phase
   - Highlight any carryover items from previous phase

## Your Task

1. **Review Task Template:**
   - Read @.claude/task-template.md to understand required format
   - Understand "Definition of Done vs Not Done" examples
   - Note code quality standards and patterns

2. **Analyze Current State:**
   - Use guidelines from "Current State Analysis" section
   - Check existing epics, current phase, and built features

3. **Create Epics:**
   - Create 2-4 epics as separate markdown files in `docs/epics/`
   - Name files: `epic-[phase]-[number]-[short-name].md`
     - Example: `epic-1-001-mongoose-schemas.md`
   - Prioritize epics (High priority first)

4. **Ensure Epic Quality:**
   - **Actionable:** Every task has specific, concrete steps
   - **Testable:** Clear acceptance criteria and completion checklist
   - **Scoped:** Completable in 3-7 days
   - **Detailed:** Specific file paths, function names, and code patterns
   - **Formatted:** Follow task-template.md structure exactly
   - **Complete:** All 10 sections (Understanding through Notes) filled in

5. **After Creating Epics:**
   - Provide summary with:
     - Current phase and completion %
     - Number of epics created
     - Next immediate action for developers
     - List of epic files with brief description

## Important Constraints

- Follow **Phase 1 (MVP) priorities** from PRD.md if in Phase 1
- Align with **Component Architecture** from ARCHITECTURE.md
- Use **Polaris components** specified in UI_UX_DESIGN.md
- Reference **wireframes** from WIREFRAME.md for UI epics
- Consider **Technology Stack** limitations from ARCHITECTURE.md
- Maintain **server-side only** constraint (zero storefront impact)
- All data must be **multi-tenant** (scoped by shop)

## Output Format

Provide:
1. **Current state summary:**
   - Current phase and % complete
   - Features implemented vs planned
   - Existing epic files found

2. **Epic files created:**
   - List each file path
   - Brief description of what each epic covers
   - Priority level (High/Medium/Low)

3. **Next steps recommendation:**
   - Which epic to start first
   - Why this epic is the priority
   - Prerequisites to verify before starting

4. **Blockers or dependencies:**
   - Any missing infrastructure (MongoDB, Redis, etc.)
   - Any prerequisite tasks that must be done first
   - Any clarifications needed from PRD.md or ARCHITECTURE.md

---

## Critical Reminders

🚨 **MANDATORY:** Every epic MUST follow the 10-section structure from task-template.md:
1. Understanding Phase
2. Planning Phase
3. Breakdown Structure (3.1-3.4)
4. Implementation Order
5. Code Quality Standards
6. Files to Create/Modify
7. Acceptance Criteria
8. Completion Checklist
9. Definition of Done
10. Notes

🚨 **DO NOT** create epics with abbreviated or simplified formats.

🚨 **DO NOT** skip sections - all 10 sections must be filled in with specific details.

🚨 **DO** reference @.claude/task-template.md examples for "Definition of Done vs Not Done" when writing tasks.

---

Begin your analysis now and create the next epics.

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

## Objective

[Clear description of what this epic accomplishes]

## Success Criteria

- [ ] [Specific, measurable criterion 1]
- [ ] [Specific, measurable criterion 2]
- [ ] [Specific, measurable criterion 3]

## Technical Tasks

### Backend Tasks
- [ ] [Specific implementation task]
- [ ] [Specific implementation task]

### Frontend Tasks
- [ ] [Specific implementation task]
- [ ] [Specific implementation task]

### Testing Tasks
- [ ] [Specific test requirement]

## Files to Create/Modify

**New Files:**
- `app/models/ModelName.ts` - [Description]
- `app/services/serviceName.ts` - [Description]

**Modified Files:**
- `app/routes/app.route.tsx` - [Changes needed]

## Acceptance Criteria

1. [Functional requirement]
2. [Performance requirement]
3. [Quality requirement]

## Notes

[Any additional context, warnings, or considerations]
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

1. Analyze the current state using the guidelines above
2. Create 2-4 epics as separate markdown files in `docs/epics/`
3. Name files: `epic-[phase]-[number]-[short-name].md`
   - Example: `epic-1-001-mongoose-schemas.md`
4. Prioritize epics (High priority first)
5. Ensure epics are:
   - Actionable (clear tasks)
   - Testable (clear acceptance criteria)
   - Scoped (completable in 3-7 days)
   - Detailed (specific file paths and code changes)

6. After creating epics, provide a summary:
   - Current phase and completion %
   - Number of epics created
   - Next immediate action for developers

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
1. Current state summary
2. Epic files created (with paths)
3. Next steps recommendation
4. Any blockers or dependencies to resolve first

---

Begin your analysis now and create the next epics.

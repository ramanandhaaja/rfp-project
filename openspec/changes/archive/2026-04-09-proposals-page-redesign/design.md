## Context

`ProposalSection.tsx` is a 739-line client component with:
1. Tender list with "Generate Proposal" and "Generate NvI" buttons (lines 340-410)
2. Results section with Proposal/NvI tabs and export buttons (lines 412-727)
3. ProposalView modal overlay (lines 729-736)

State: 11 variables managing tenders, selected tender, proposal, NvI questions, generation states, active tab, status sets, and modal visibility.

The tender management page was already redesigned with: card-based layout, inline tabbed analysis, status dots, chevron expand, clean editorial styling. This page needs the same treatment.

## Goals / Non-Goals

**Goals:**
- Match tender management design language exactly
- Tender cards with inline Proposal/NvI tabs when expanded
- Status indicators (has proposal / has NvI) visible at a glance
- Export buttons inside tab content, not in a separate header
- Loading states inline within the card
- Preserve ProposalView modal and all export functionality

**Non-Goals:**
- Refactoring state management or extracting sub-components
- Changing API endpoints or data flow
- Removing the N+1 `loadAllTenderStatuses` pattern (optimization for later)
- Mobile-specific layout changes

## Decisions

### 1. Inline tabbed results inside tender cards

**Decision**: When a tender is selected, show Proposal and NvI tabs inside the card (same pattern as tender management's analysis zone). The separate results section below the list is removed.

**Why**: Matches the established pattern. Keeps context (which tender) visible while viewing results.

### 2. Card layout matching tender management

**Decision**: Use identical card styling — rounded-xl, border-gray-200, status dot, metadata badges (reference number), chevron expand/collapse, context-appropriate primary action.

**Why**: Visual consistency across the dashboard.

### 3. Export buttons inside tab content

**Decision**: Place export buttons (MD, PDF, NvI) inside their respective tab content areas as a small action bar, not in a shared header above the tabs.

**Why**: Export is contextual to the content being viewed. Putting it inside the tab keeps it close to what's being exported.

### 4. Primary action changes based on state

**Decision**: Single primary button per card that changes label:
- No proposal/NvI: "Generate Proposal" (indigo)
- Has proposal: "View Proposal" (emerald)
- Generate NvI as secondary action

**Why**: Matches tender management pattern where the primary action reflects the current state.

### 5. Use /frontend-design skill during implementation

**Decision**: Apply the same editorial design language used in tender management redesign.

## Risks / Trade-offs

- **ProposalView modal still works separately** → The modal is triggered from an action inside the proposal tab, not from the card header. This is fine.
- **N+1 status loading on mount** → `loadAllTenderStatuses` fires individual API calls per tender. Not fixing this now — it's a pre-existing pattern.

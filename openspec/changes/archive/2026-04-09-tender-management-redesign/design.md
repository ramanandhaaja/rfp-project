## Context

`TenderManagementSection.tsx` is a 1488-line client component that handles:
1. PDF upload (lines 430-478)
2. Tender list with inline detail expansion (lines 480-754)
3. Fit analysis results — scores, products, SWOT, risk, questions, contracts (lines 756-1261)
4. Legal analysis results — dealbreakers, compliance, risk matrix, findings, pricing (lines 1264-1485)

All sections stack vertically. The user flow is: upload → pick tender → click analyze → scroll down to see results. This creates a disjointed experience where context (which tender) is lost as you scroll through results.

State variables (16 total) manage: tenders list, selected tender, analysis, legal analysis, upload state, sync state, UI toggles. None of these change — this is a layout-only redesign.

## Goals / Non-Goals

**Goals:**
- Clear visual hierarchy: users immediately understand the workflow
- Master-detail layout: tender list on one side, analysis on the other (or stacked with clear context)
- Tabbed analysis sections: don't show everything at once
- Better tender cards: cleaner info density, clearer status
- Collapsible upload area: not the primary focus of the page
- Preserve all existing functionality exactly

**Non-Goals:**
- Refactoring state management or extracting sub-components (can be done later)
- Changing API endpoints or data flow
- Adding new features (loading states, pagination, search/filter)
- Mobile-responsive redesign (keep existing responsive behavior)

## Decisions

### 1. Master-detail layout with full-width analysis below

**Decision**: Keep the tender list full-width at the top, but when a tender is selected and analyzed, show the analysis in a prominent section below with clear context (tender title pinned as header).

**Why**: A side-by-side split panel would require significant layout restructuring and wouldn't work well on smaller screens. A full-width analysis section with clear tender context and tabbed navigation achieves the same clarity.

**Alternative considered**: True side-by-side master-detail with tender list as narrow sidebar. Rejected — the tender cards need horizontal space for metadata badges, and the analysis content (tables, grids) also needs full width.

### 2. Tabbed navigation for analysis sections

**Decision**: Replace the vertical scroll of analysis sections with tabs:
- **Overview** — Match score, competitiveness, recommendation, strategic advice, budget/timeline
- **Products** — Product matching tabs (Frequently Used / Standard) with sync button
- **Risk & SWOT** — Strengths, gaps, opportunities, risks, 12-lens risk analysis, contract conditions
- **NvI Questions** — Prioritized questions with score breakdowns
- **Legal** — Full legal analysis (dealbreakers, compliance, risk matrix, findings, pricing)

**Why**: Users rarely need all analysis sections at once. Tabs let them focus on what matters. The current scroll-everything approach buries critical information.

### 3. Collapsible upload section

**Decision**: Make the upload section collapsible (collapsed by default when tenders exist, expanded when no tenders exist).

**Why**: Returning users primarily work with existing tenders. The upload area takes valuable screen real estate. New users with no tenders see it expanded automatically.

### 4. Improved tender cards

**Decision**: Redesign tender cards with:
- Clear visual status indicator (not analyzed / analyzed / has legal analysis)
- Primary action button that changes based on state (Analyze → View Analysis)
- Secondary actions in a dropdown or smaller buttons
- Better metadata layout with consistent badge styling

**Why**: Current cards have 3-4 buttons of equal visual weight crammed together. Users need to understand at a glance what state each tender is in and what the next action should be.

### 5. Use /frontend-design skill during implementation

**Decision**: Invoke the frontend-design skill when implementing to ensure high design quality and avoid generic AI aesthetics.

**Why**: User explicitly requested this. The redesign should look polished and professional.

## Risks / Trade-offs

- **Large JSX changes in a single file** → Risk of breaking existing functionality. Mitigate by keeping all state management and event handlers identical — only restructuring the JSX return and CSS classes.
- **Tab state adds UI complexity** → Minimal — just one new `useState` for active analysis tab. No new data fetching or API calls.
- **Analysis tabs may feel disconnected from tender context** → Mitigate by showing the selected tender title and key metadata as a sticky header above the analysis tabs.

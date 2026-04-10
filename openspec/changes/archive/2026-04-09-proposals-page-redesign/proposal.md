## Why

The proposals page (`/dashboard/proposals`) uses the same outdated layout pattern that was already fixed on the tender management page — tender list and results are separate vertical sections, action buttons have equal weight with no status context, and the results section is disconnected from the selected tender. The page needs to match the redesigned tender management style: card-based layout with inline tabbed results, status indicators, and clean editorial styling.

## What Changes

- Redesign tender cards to match tender management style: status dots, metadata badges, context-appropriate primary action, chevron expand/collapse
- Move the results section (Proposal + NvI tabs) inside the selected tender card instead of a separate section below
- Add status indicators showing which tenders have proposals/NvI generated at a glance
- Move export buttons into the tab content area (closer to what they export)
- Add inline loading states for generation within the card
- Match the design language: rounded-xl, subtle borders, uppercase tracking-wide headers, emerald/amber/indigo palette

## Capabilities

### New Capabilities
- `proposals-page-layout`: Card-based layout with inline tabbed results (Proposal/NvI), status indicators, and export actions matching the tender management design system

### Modified Capabilities

## Impact

- **Code**: `src/components/dashboard/ProposalSection.tsx` — restructure JSX layout and CSS classes
- **No API changes**: All endpoints remain unchanged
- **No data model changes**: Same interfaces and state shape
- **Design-only**: Layout/UX change preserving all functionality

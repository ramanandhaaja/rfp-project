## Why

The tender management page (`/dashboard/tender-management`) is a 1488-line monolith that stacks upload, tender list, analysis results, and legal analysis vertically with no clear hierarchy or navigation. Users must scroll extensively to find information, action buttons are cramped, and there's no visual separation between different analysis types. The page needs a layout and UX redesign to make the workflow intuitive and information accessible.

## What Changes

- Reorganize the page into clear visual zones: upload area, tender list, and analysis detail view
- Introduce a split-panel or master-detail layout where selecting a tender shows its details/analysis alongside the list
- Group related actions (Analyze Fit, Legal Compliance, View Details) into a clearer action flow
- Add tab-based navigation within the analysis results to separate: Overview, Product Matching, Risk Analysis, Legal Analysis, NvI Questions
- Improve tender card design with better information density and visual hierarchy
- Add clear status indicators showing which tenders have been analyzed
- Move the upload section to be less prominent (collapsible or secondary) so the main focus is on existing tenders and their analysis

## Capabilities

### New Capabilities
- `tender-page-layout`: Page-level layout structure with master-detail pattern, tabbed analysis sections, and improved visual hierarchy for the tender management workflow

### Modified Capabilities

## Impact

- **Code**: `src/components/dashboard/TenderManagementSection.tsx` — major restructure of JSX layout and CSS classes. No changes to business logic, API calls, state management, or data flow
- **No API changes**: All existing endpoints remain unchanged
- **No data model changes**: Same interfaces and state shape
- **Design-only**: This is purely a layout/UX change — all functionality preserved

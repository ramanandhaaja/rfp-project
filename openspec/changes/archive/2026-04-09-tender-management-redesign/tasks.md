## 1. Add Analysis Tab State

- [x] 1.1 Add `analysisTab` state variable with values: `'overview' | 'products' | 'risk' | 'nvi' | 'legal'`, defaulting to `'overview'`
- [x] 1.2 Add `isUploadExpanded` state variable, defaulting to `tenders.length === 0`

## 2. Redesign Upload Section

- [x] 2.1 Wrap upload section in a collapsible container with a clickable header showing "Upload New Tender" with expand/collapse icon
- [x] 2.2 Auto-expand when no tenders exist, auto-collapse when tenders exist

## 3. Redesign Tender Cards

- [x] 3.1 Add visual status indicator to each tender card (Not Analyzed / Analyzed with match %, Legal Done)
- [x] 3.2 Redesign action buttons: primary action changes based on state (Analyze → View Analysis), secondary actions (Legal, Re-analyze, Details) in smaller/grouped style
- [x] 3.3 Clean up metadata badges with consistent styling and better spacing
- [x] 3.4 Keep existing detail expansion (View Details) but improve the expanded content layout

## 4. Build Analysis Zone with Tabbed Navigation

- [x] 4.1 Create analysis zone container that appears when a tender is selected and has analysis results
- [x] 4.2 Add tender context header showing selected tender title, reference, and match score
- [x] 4.3 Build tab navigation bar with 5 tabs: Overview, Products, Risk & SWOT, NvI Questions, Legal
- [x] 4.4 Wire tab switching to `analysisTab` state

## 5. Restructure Analysis Content into Tabs

- [x] 5.1 **Overview tab**: Move match score cards, strategic advice, budget assessment, and timeline assessment
- [x] 5.2 **Products tab**: Move product matching sub-tabs (Frequently Used / Standard) and sync button
- [x] 5.3 **Risk & SWOT tab**: Move strengths/gaps/opportunities/risks grid, action items, 12-lens risk analysis, and contract conditions
- [x] 5.4 **NvI Questions tab**: Move prioritized NvI questions section
- [x] 5.5 **Legal tab**: Move entire legal analysis section (dealbreakers, compliance, risk matrix, findings, pricing); show "Run Legal Analysis" button if no results

## 6. Apply Frontend Design Quality

- [x] 6.1 Use `/frontend-design` skill to ensure polished, professional styling across all sections
- [x] 6.2 Ensure consistent color palette, spacing, and typography throughout the redesigned layout

## 7. Verification

- [x] 7.1 Run `npm run build` and confirm no compilation errors
- [ ] 7.2 Verify upload flow works (file select → upload → result → tender appears in list)
- [ ] 7.3 Verify tender card status indicators display correctly
- [ ] 7.4 Verify tab navigation switches content without losing state
- [ ] 7.5 Verify all analysis data renders correctly in each tab
- [ ] 7.6 Verify legal analysis renders in Legal tab
- [ ] 7.7 Verify tender detail expansion still works within cards

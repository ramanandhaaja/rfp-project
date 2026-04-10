## 1. Redesign Tender Cards

- [x] 1.1 Restyle tender cards to match tender management: rounded-xl, border-gray-200, status dot (green=proposal, purple=NvI, gray=none), metadata badges, chevron expand/collapse
- [x] 1.2 Replace dual action buttons with single primary action that changes based on state (Generate Proposal → View Proposal), and secondary "NvI" button in smaller style
- [x] 1.3 Move results inside the card — when expanded, show Proposal/NvI tabs inline below the card header

## 2. Build Inline Tabbed Results

- [x] 2.1 Create tab navigation bar inside expanded card with Proposal and NvI tabs (matching tender management tab style)
- [x] 2.2 Move Proposal tab content into the card: executive summary table, proposal sections with special table rendering
- [x] 2.3 Move NvI tab content into the card: priority summary cards, sorted question list with score breakdowns
- [x] 2.4 Add "Generate Proposal" / "Generate NvI" buttons inside empty tab states

## 3. Relocate Export Actions

- [x] 3.1 Move export buttons (View Full, Export MD, Export PDF) into a small action bar inside the Proposal tab
- [x] 3.2 Move NvI export button into the NvI tab
- [x] 3.3 Keep ProposalView modal trigger as "View Full Proposal" button inside the Proposal tab

## 4. Apply Design Language

- [x] 4.1 Use /frontend-design skill to match tender management styling: uppercase tracking-wide headers, tabular-nums, emerald/amber/indigo palette, subtle borders
- [x] 4.2 Add inline loading states for proposal/NvI generation within the card

## 5. Remove Separate Results Section

- [x] 5.1 Remove the standalone results section below the tender list (it's now inside the card)
- [x] 5.2 Keep the ProposalView modal rendering at the bottom of the component

## 6. Verification

- [x] 6.1 Run `npm run build` and confirm no compilation errors
- [ ] 6.2 Verify tender card status indicators display correctly
- [ ] 6.3 Verify proposal generation and viewing works within the card
- [ ] 6.4 Verify NvI generation and viewing works within the card
- [ ] 6.5 Verify all export functions work (MD, PDF, NvI)
- [ ] 6.6 Verify ProposalView modal still opens correctly

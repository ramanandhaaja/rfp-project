## ADDED Requirements

### Requirement: Tender cards with status indicators and inline results
Each tender card SHALL display a status dot (green if proposal exists, purple if NvI exists, gray if neither), metadata badges, and a chevron expand/collapse icon. When expanded, the card SHALL show tabbed results (Proposal/NvI) inline.

#### Scenario: Tender with no proposal or NvI
- **WHEN** a tender has no generated proposal or NvI questions
- **THEN** the card SHALL show a gray status dot
- **AND** the primary action SHALL be "Generate Proposal"

#### Scenario: Tender with existing proposal
- **WHEN** a tender has a generated proposal
- **THEN** the card SHALL show a green status dot
- **AND** the primary action SHALL be "View Proposal"

#### Scenario: User expands a tender card
- **WHEN** the user clicks the chevron or primary action on a tender card
- **THEN** the card SHALL expand to show Proposal and NvI tabs inline
- **AND** the relevant tab SHALL be active

### Requirement: Inline Proposal tab with content and export actions
The Proposal tab SHALL display the executive summary table, proposal sections (with methodology phases, team structure, risk matrix tables), and export actions (View Full, Export MD, Export PDF).

#### Scenario: Proposal tab with generated content
- **WHEN** the Proposal tab is active and a proposal exists
- **THEN** it SHALL show the executive summary, all proposal sections with special table rendering, and export buttons

#### Scenario: Proposal tab with no content
- **WHEN** the Proposal tab is active but no proposal exists
- **THEN** it SHALL show a "Generate Proposal" button

### Requirement: Inline NvI tab with questions and export
The NvI tab SHALL display priority summary cards (High/Medium/Low counts), prioritized questions with score breakdowns, and an export button.

#### Scenario: NvI tab with generated questions
- **WHEN** the NvI tab is active and NvI questions exist
- **THEN** it SHALL show priority summary cards and sorted questions with score breakdowns

#### Scenario: NvI tab with no questions
- **WHEN** the NvI tab is active but no questions exist
- **THEN** it SHALL show a "Generate NvI Questions" button

### Requirement: Design language matches tender management
The page SHALL use the same design tokens as the redesigned tender management page: rounded-xl containers, uppercase tracking-wide section headers, tabular-nums for scores, consistent emerald/amber/red/indigo/violet palette, subtle borders with 50% opacity backgrounds.

#### Scenario: Visual consistency
- **WHEN** the proposals page renders
- **THEN** the card styling, badge styling, tab navigation, and section headers SHALL be visually identical to the tender management page

### Requirement: All existing functionality preserved
All existing business logic, API calls, state management, export functions, and the ProposalView modal SHALL remain unchanged.

#### Scenario: Proposal generation works identically
- **WHEN** a user generates a proposal
- **THEN** the generation flow SHALL work exactly as before

#### Scenario: ProposalView modal still accessible
- **WHEN** a user clicks "View Full Proposal" inside the Proposal tab
- **THEN** the ProposalView modal SHALL open as before

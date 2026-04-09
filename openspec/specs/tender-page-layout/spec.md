## ADDED Requirements

### Requirement: Page layout with three visual zones
The tender management page SHALL be organized into three distinct visual zones:
1. **Upload zone** — collapsible section for uploading new tender PDFs
2. **Tender list zone** — full-width list of uploaded tenders with status and actions
3. **Analysis zone** — tabbed analysis results for the selected tender, with tender context header

#### Scenario: Page loads with no tenders
- **WHEN** the page loads and no tenders exist
- **THEN** the upload zone SHALL be expanded
- **AND** the tender list zone SHALL show an empty state message
- **AND** the analysis zone SHALL not be visible

#### Scenario: Page loads with existing tenders
- **WHEN** the page loads and tenders exist
- **THEN** the upload zone SHALL be collapsed by default
- **AND** the tender list zone SHALL display all tenders

#### Scenario: User expands collapsed upload zone
- **WHEN** the user clicks the upload zone header/toggle
- **THEN** the upload zone SHALL expand to show the file input and upload button

### Requirement: Tender cards with clear status and primary action
Each tender card SHALL display a visual status indicator and a context-appropriate primary action button. The card SHALL show title, reference number, type, CPV code, municipalities, and upload date with clean badge styling.

#### Scenario: Tender has not been analyzed
- **WHEN** a tender has not been analyzed
- **THEN** the card SHALL show a "Not Analyzed" status indicator
- **AND** the primary action button SHALL be "Analyze Fit"

#### Scenario: Tender has been analyzed
- **WHEN** a tender has been analyzed
- **THEN** the card SHALL show an "Analyzed" status indicator with the match percentage
- **AND** the primary action button SHALL be "View Analysis"

#### Scenario: User clicks a tender card
- **WHEN** the user clicks on a tender card or its primary action
- **THEN** the tender SHALL be selected
- **AND** the analysis zone SHALL become visible (or update to show that tender's data)

### Requirement: Analysis zone with tabbed navigation
The analysis zone SHALL display results in tabbed sections. A context header above the tabs SHALL show the selected tender's title and key metadata.

#### Scenario: User views analysis tabs
- **WHEN** a tender with analysis results is selected
- **THEN** the analysis zone SHALL show tabs: Overview, Products, Risk & SWOT, NvI Questions, Legal
- **AND** the Overview tab SHALL be active by default

#### Scenario: User switches analysis tabs
- **WHEN** the user clicks a different analysis tab
- **THEN** the tab content SHALL switch without losing the selected tender context
- **AND** the tab header SHALL visually indicate the active tab

### Requirement: Overview tab content
The Overview tab SHALL display the match score, competitiveness rating, recommendation, strategic advice, budget assessment, and timeline assessment.

#### Scenario: Overview tab renders
- **WHEN** the Overview tab is active
- **THEN** it SHALL show the three score cards (match %, competitiveness, recommendation) at the top
- **AND** strategic advice, budget, and timeline sections below

### Requirement: Products tab content
The Products tab SHALL contain the product matching sub-tabs (Frequently Used / Standard) and the sync products button.

#### Scenario: Products tab renders
- **WHEN** the Products tab is active
- **THEN** it SHALL show the Frequently Used / Standard sub-tabs
- **AND** the Sync Products button SHALL be accessible

### Requirement: Risk & SWOT tab content
The Risk & SWOT tab SHALL display strengths, gaps, opportunities, risks, action items, 12-lens risk analysis, and contract conditions.

#### Scenario: Risk & SWOT tab renders
- **WHEN** the Risk & SWOT tab is active
- **THEN** it SHALL show the SWOT grid (strengths, gaps, opportunities, risks)
- **AND** action items, 12-lens risk analysis, and contract conditions below

### Requirement: NvI Questions tab content
The NvI Questions tab SHALL display prioritized questions with score breakdowns.

#### Scenario: NvI Questions tab renders
- **WHEN** the NvI Questions tab is active
- **THEN** it SHALL show the prioritized NvI questions sorted by total score
- **AND** each question SHALL show the 5-dimension score breakdown

### Requirement: Legal tab content
The Legal tab SHALL display the full legal analysis including dealbreakers, compliance summary, risk matrix, detailed findings, NvI questions, negotiation points, and pricing structure.

#### Scenario: Legal tab with no legal analysis
- **WHEN** the Legal tab is active but no legal analysis has been run
- **THEN** it SHALL show a prompt to run legal analysis with a "Run Legal Analysis" button

#### Scenario: Legal tab with results
- **WHEN** the Legal tab is active and legal analysis results exist
- **THEN** it SHALL show dealbreakers (if any) prominently at top
- **AND** compliance summary cards, risk matrix, and detailed findings below

### Requirement: Tender detail expansion within cards
When a tender card is expanded (View Details), the tender metadata (requirements, specifications, budget, deadlines, etc.) SHALL be displayed within the card in a well-organized layout.

#### Scenario: User expands tender details
- **WHEN** the user clicks "View Details" on a tender card
- **THEN** the card SHALL expand to show structured metadata sections
- **AND** each metadata section (requirements, specs, budget, deadlines, contact, key points) SHALL be clearly labeled and visually distinct

### Requirement: All existing functionality preserved
All existing business logic, API calls, state management, and data flow SHALL remain unchanged. This is a layout-only change.

#### Scenario: Upload works identically
- **WHEN** a user uploads a PDF tender
- **THEN** the upload flow SHALL work exactly as before (file select → upload → result feedback → tender added to list)

#### Scenario: Analysis works identically
- **WHEN** a user triggers analysis (fit or legal)
- **THEN** the analysis flow SHALL work exactly as before (loading state → API call → results displayed)

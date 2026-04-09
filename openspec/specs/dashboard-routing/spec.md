## ADDED Requirements

### Requirement: Dashboard uses file-based routing for each section
The dashboard SHALL use Next.js App Router file-based routing to serve each section as a separate page under `/dashboard/*`. The route structure SHALL be:
- `/dashboard` → Overview
- `/dashboard/company-profile` → Company Profile
- `/dashboard/tender-management` → Tender Management
- `/dashboard/proposals` → Proposal & NvI

#### Scenario: User navigates to /dashboard
- **WHEN** an authenticated user navigates to `/dashboard`
- **THEN** the Overview section is displayed with the shared layout (top nav + sidebar)

#### Scenario: User navigates to /dashboard/company-profile
- **WHEN** an authenticated user navigates to `/dashboard/company-profile`
- **THEN** the Company Profile section is displayed with the shared layout

#### Scenario: User navigates to /dashboard/tender-management
- **WHEN** an authenticated user navigates to `/dashboard/tender-management`
- **THEN** the Tender Management section is displayed with the shared layout

#### Scenario: User navigates to /dashboard/proposals
- **WHEN** an authenticated user navigates to `/dashboard/proposals`
- **THEN** the Proposal & NvI section is displayed with the shared layout

### Requirement: Shared layout with persistent sidebar and top navigation
The dashboard SHALL have a shared layout component (`layout.tsx`) that renders the top navigation bar and sidebar. The layout SHALL persist across page navigations without re-rendering.

#### Scenario: Sidebar persists when navigating between sections
- **WHEN** a user clicks a sidebar link to navigate from Overview to Company Profile
- **THEN** the sidebar and top nav remain visible and the main content area updates to show Company Profile
- **AND** the browser URL updates to `/dashboard/company-profile`

#### Scenario: Active sidebar item reflects current route
- **WHEN** the user is on `/dashboard/tender-management`
- **THEN** the "Tender Management" sidebar item SHALL be visually highlighted as active
- **AND** all other sidebar items SHALL appear in their default non-active style

### Requirement: Authentication guard in shared layout
The dashboard layout SHALL protect all dashboard routes by checking authentication status. Unauthenticated users SHALL be redirected to `/auth/signin`.

#### Scenario: Unauthenticated user accesses any dashboard route
- **WHEN** an unauthenticated user navigates to any `/dashboard/*` route
- **THEN** the user SHALL be redirected to `/auth/signin`

#### Scenario: Authenticated user accesses dashboard
- **WHEN** an authenticated user navigates to any `/dashboard/*` route
- **THEN** the page content SHALL render normally with the user's name/email in the top nav

### Requirement: Sidebar uses Link-based navigation
The sidebar SHALL use Next.js `<Link>` components for navigation instead of `onClick` state handlers. This enables browser back/forward navigation and bookmarkable URLs.

#### Scenario: Browser back button returns to previous section
- **WHEN** a user navigates from Overview → Company Profile → Tender Management
- **AND** the user presses the browser back button
- **THEN** the browser SHALL navigate back to Company Profile with the correct sidebar highlight

#### Scenario: User bookmarks a dashboard section
- **WHEN** a user bookmarks `/dashboard/proposals`
- **AND** later opens that bookmark while authenticated
- **THEN** the Proposal & NvI section SHALL be displayed directly

### Requirement: Existing section components reused without modification
Each new page file SHALL import and render the existing section component from `src/components/dashboard/`. The section components SHALL NOT be modified as part of this change.

#### Scenario: Overview page renders OverviewSection
- **WHEN** `/dashboard` page renders
- **THEN** it SHALL render the `OverviewSection` component with access to session data

#### Scenario: All section components render identically to before
- **WHEN** any dashboard section page renders
- **THEN** the visual output and functionality SHALL be identical to the previous client-side tab switching implementation

## Why

The dashboard currently uses client-side state switching (`useState` + `switch`) to render all sections (Overview, Company Profile, Tender Management, Proposal & NvI) within a single `page.tsx`. This prevents Next.js App Router benefits like per-page code splitting, URL-based navigation (bookmarkable links, browser back/forward), and independent loading states. Separating each section into its own route improves UX, performance, and maintainability.

## What Changes

- Extract each dashboard section into its own route under `/dashboard/*`
- Convert the current single-page dashboard into a layout with persistent sidebar navigation
- Each section gets its own `page.tsx` with proper URL routing:
  - `/dashboard` → Overview
  - `/dashboard/company-profile` → Company Profile
  - `/dashboard/tender-management` → Tender Management
  - `/dashboard/proposals` → Proposal & NvI
- Remove client-side state switching in favor of Next.js file-based routing
- Sidebar navigation uses `<Link>` components with active state based on current pathname

## Capabilities

### New Capabilities
- `dashboard-routing`: File-based routing for dashboard sections with shared layout, sidebar navigation, and per-page code splitting

### Modified Capabilities

## Impact

- **Routes**: New route segments under `src/app/dashboard/`
- **Components**: Existing section components (`OverviewSection`, `CompanyProfileSection`, `TenderManagementSection`, `ProposalSection`) are reused as-is inside new page files
- **Navigation**: Sidebar switches from `onClick` state toggle to `<Link href>` with `usePathname()` for active highlighting
- **Auth**: Authentication guard moves to the shared layout so all sub-pages are protected
- **No breaking changes**: All existing functionality preserved, just accessible via URL routes instead of client-side tabs

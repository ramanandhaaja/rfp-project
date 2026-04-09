## Context

The dashboard (`src/app/dashboard/page.tsx`) currently renders 4 sections via client-side state switching using `useState("overview")` and a `renderContent()` switch. The sidebar menu items trigger `setActiveSection()` — there are no URL changes. Existing section components live in `src/components/dashboard/` and are self-contained:

- `OverviewSection` (accepts `session` prop)
- `CompanyProfileSection`
- `TenderManagementSection`
- `ProposalSection`

Auth is handled inline in the page with `useSession()` + redirect on unauthenticated.

## Goals / Non-Goals

**Goals:**
- Each dashboard section gets its own URL route (`/dashboard`, `/dashboard/company-profile`, etc.)
- Shared layout with persistent sidebar and top nav
- Auth protection in the layout (not duplicated per page)
- Existing section components reused without modification
- Browser back/forward and bookmarkable URLs

**Non-Goals:**
- Redesigning the UI or changing the visual layout
- Adding loading/error boundaries per section (can be done later)
- Converting section components to Server Components (they use client-side state)
- Changing authentication logic

## Decisions

### 1. Use Next.js App Router nested layouts

**Decision**: Create `src/app/dashboard/layout.tsx` with the shared nav/sidebar, and individual `page.tsx` files for each section.

**Why**: This is the idiomatic Next.js pattern. The layout persists across navigations (no re-render of sidebar/nav), and each page is code-split automatically.

**Alternative considered**: Keep a single page with query params (`?section=company-profile`). Rejected because it doesn't leverage App Router benefits and is essentially the same as the current approach.

### 2. Route structure

```
src/app/dashboard/
├── layout.tsx              # Shared nav + sidebar + auth guard
├── page.tsx                # Overview (default route)
├── company-profile/
│   └── page.tsx            # Company Profile
├── tender-management/
│   └── page.tsx            # Tender Management
└── proposals/
    └── page.tsx            # Proposal & NvI
```

**Why `/proposals`** instead of `/proposal-generation`: Shorter, cleaner URL. The sidebar label stays "Proposal & NvI".

### 3. Layout is a client component

**Decision**: `layout.tsx` will be `"use client"` because it uses `useSession()`, `usePathname()`, and `signOut()`.

**Why**: The auth guard and active link highlighting both require client-side hooks. Since existing section components are all client components already, there's no SSR benefit to fight for here.

### 4. Reuse section components as-is

**Decision**: Each new `page.tsx` simply imports and renders the existing section component. No modifications to section components.

**Why**: Minimizes risk. The components already work — we just need to wire them to routes.

## Risks / Trade-offs

- **Sidebar state no longer reflects active section via React state** → Mitigated by using `usePathname()` to derive active state from the URL. Functionally identical to the user.
- **`OverviewSection` requires `session` prop** → Layout already has `useSession()`, but we can't pass props from layout to page in App Router. The `OverviewSection` page will call `useSession()` itself, or we pass session via context. Since `SessionProvider` already wraps the app, `OverviewSection` can call `useSession()` directly — we may need to update it to not require the prop.
- **URL change is user-visible** → Users who bookmarked `/dashboard` will still land on Overview (same as before). No breaking change.

## 1. Create Dashboard Layout

- [x] 1.1 Create `src/app/dashboard/layout.tsx` with shared top nav, sidebar, and auth guard (extracted from current `page.tsx`)
- [x] 1.2 Sidebar navigation uses `<Link>` components with `usePathname()` for active state highlighting
- [x] 1.3 Layout renders `{children}` in the main content area

## 2. Create Section Pages

- [x] 2.1 Refactor `src/app/dashboard/page.tsx` to only render `<OverviewSection />` (remove sidebar, nav, state switching)
- [x] 2.2 Create `src/app/dashboard/company-profile/page.tsx` rendering `<CompanyProfileSection />`
- [x] 2.3 Create `src/app/dashboard/tender-management/page.tsx` rendering `<TenderManagementSection />`
- [x] 2.4 Create `src/app/dashboard/proposals/page.tsx` rendering `<ProposalSection />`

## 3. Handle OverviewSection Session Prop

- [x] 3.1 Check if `OverviewSection` can call `useSession()` internally instead of receiving `session` as a prop — update if needed so the page doesn't need to pass props

## 4. Verification

- [x] 4.1 Run `npm run build` and confirm all routes compile without errors
- [ ] 4.2 Run `npm run dev` and verify each route renders the correct section
- [ ] 4.3 Verify sidebar active state updates correctly when navigating between routes
- [ ] 4.4 Verify browser back/forward navigation works between dashboard sections
- [ ] 4.5 Verify unauthenticated access redirects to `/auth/signin`

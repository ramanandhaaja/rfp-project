## Context

`CompanyProfileSection.tsx` currently renders three zones: Company Info, Add Products, and Saved Products. The product zones (Add Products + Saved Products) are being extracted to a new page. The layout, state management, API calls, and CSV import logic in those sections are unchanged — only their location moves.

The dashboard sidebar (`layout.tsx`) already supports grouped menu sections. Adding a new item under "Workspace" follows the exact same pattern as existing items.

## Goals / Non-Goals

**Goals:**
- Move Add Products and Saved Products out of Company Profile into a standalone page
- Add "Product Management" nav item to the sidebar
- Keep Company Profile focused on identity fields only
- Preserve the "company must exist" gate on product operations

**Non-Goals:**
- Redesigning the product cards or form inputs
- Changing any API routes or data fetching logic
- Adding new product management features

## Decisions

### 1. New component: ProductManagementSection

**Decision**: Extract the product JSX and state from `CompanyProfileSection` into a new `ProductManagementSection` component at `src/components/dashboard/ProductManagementSection.tsx`.

**Why**: Clean separation. The Company Profile component shrinks to just its own concern. The product component is self-contained and easy to extend later.

### 2. Company-must-exist gate stays on the new page

**Decision**: `ProductManagementSection` fetches the user's company on mount (same as the existing flow) and disables product actions if none is found, showing a "Set up your Company Profile first" hint.

**Why**: Products are linked to a company record — this constraint is enforced at the API level too. Preserving it prevents broken states.

### 3. Sidebar placement: under Workspace section, after Company Profile

**Decision**: Insert "Product Management" in `menuItems` immediately after "Company Profile" within the Workspace section.

**Why**: Logical grouping — company identity → product catalog → tender work → proposals.

### 4. Saved Products shown unconditionally on the new page

**Decision**: On the Product Management page, the Saved Products card always renders (with an empty state if no products exist yet), unlike the old Company Profile where it was hidden when empty.

**Why**: On a dedicated product page, users expect to always see the product list area — even when empty — so they know where products will appear. The empty state guides them to add or import.

## Risks / Trade-offs

- **Duplicate fetch**: `ProductManagementSection` will fetch the company record independently (to check existence). This is an extra request vs. the old co-located flow, but it's a single lightweight call and acceptable.
- **State isolation**: Any state previously shared between company info and products in `CompanyProfileSection` must be split cleanly. Review for shared `companyId` references before extracting.

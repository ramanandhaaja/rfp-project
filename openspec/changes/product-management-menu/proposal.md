## Why

The Company Profile page currently mixes company identity (name, industry, capabilities) with product catalog management (add products, CSV import, saved products grid). These are distinct concerns — splitting them gives each its own focused space and makes the dashboard easier to navigate.

## What Changes

- Add "Product Management" as a new left sidebar menu item under the Workspace section
- Create new route `/dashboard/product-management` with a dedicated page
- Extract the "Add Products" and "Saved Products" sections from `CompanyProfileSection` into a new `ProductManagementSection` component
- Company Profile page becomes leaner — only company info fields and capabilities tags remain
- CSV import and product add remain gated: company must exist before products can be added

## Capabilities

### New Capabilities
- `product-management-page`: Dedicated Product Management page at `/dashboard/product-management` containing the manual product entry and saved products grid, accessible via left nav

### Modified Capabilities
- `company-profile-layout`: Company Profile page no longer includes the Add Products or Saved Products cards — only company information and capabilities

## Impact

- **Code**: `src/app/dashboard/layout.tsx` — add menu item
- **Code**: `src/app/dashboard/product-management/page.tsx` — new route (create)
- **Code**: `src/components/dashboard/ProductManagementSection.tsx` — new component (create)
- **Code**: `src/components/dashboard/CompanyProfileSection.tsx` — remove product cards
- **No API changes**
- **No data model changes**

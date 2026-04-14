## 1. Sidebar Navigation

- [x] 1.1 Add "Product Management" menu item to `layout.tsx` menuItems array under Workspace section, after Company Profile, with a suitable icon and href `/dashboard/product-management`

## 2. New Route

- [x] 2.1 Create directory `src/app/dashboard/product-management/`
- [x] 2.2 Create `src/app/dashboard/product-management/page.tsx` that renders `<ProductManagementSection />`

## 3. New ProductManagementSection Component

- [x] 3.1 Create `src/components/dashboard/ProductManagementSection.tsx`
- [x] 3.2 Copy product-related state from `CompanyProfileSection`: `products`, `savedProducts`, `importResults`, `isImporting`, `companyId` (fetched on mount)
- [x] 3.3 Copy the Add Products card JSX (manual product rows + CSV import button) into the new component
- [x] 3.4 Copy the Saved Products card JSX into the new component
- [x] 3.5 Show Saved Products card unconditionally (with empty state when no products) instead of hiding when empty
- [x] 3.6 Add "company must exist" gate: disable product actions and show hint "Set up your Company Profile first" when no company is found
- [x] 3.7 Copy all product-related handlers: `addProduct`, `removeProduct`, `handleProductChange`, `handleCsvImport`, `handleSaveProfile` (product POST portion only)

## 4. Trim CompanyProfileSection

- [x] 4.1 Remove all product-related state from `CompanyProfileSection`: `products`, `savedProducts`, `importResults`, `isImporting` (keep only company info state)
- [x] 4.2 Remove the Add Products card JSX from `CompanyProfileSection`
- [x] 4.3 Remove the Saved Products card JSX from `CompanyProfileSection`
- [x] 4.4 Remove product POST logic from `handleSaveProfile` — keep only the company PUT/POST
- [x] 4.5 Remove CSV import handler and related imports from `CompanyProfileSection`

## 5. Verification

- [x] 5.1 Run `npm run build` and confirm no compilation errors
- [ ] 5.2 Verify "Product Management" appears in the sidebar and is active on that route
- [ ] 5.3 Verify Company Profile page shows only company info (no product cards)
- [ ] 5.4 Verify product add/remove/save works on Product Management page
- [ ] 5.5 Verify CSV import works on Product Management page
- [ ] 5.6 Verify Saved Products grid renders (and shows empty state when no products)
- [ ] 5.7 Verify product actions are disabled when no company exists

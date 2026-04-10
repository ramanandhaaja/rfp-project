## Why

The company profile page uses the old dashboard styling — basic form card with `shadow-sm rounded-lg`, dark mode classes, and visual inconsistency with the redesigned tender management and proposals pages. It needs to match the established editorial design language.

## What Changes

- Restyle the company info form using rounded-xl, border-gray-200, uppercase tracking-wider labels
- Redesign input fields with consistent border/focus states matching the design system
- Improve capabilities tag UI with the new badge style
- Restructure products area into two sections: "Add Products" (manual entry rows) and "Saved Products" list
- Redesign the CSV import button to match secondary action styling (compact, uppercase label)
- Convert "Remove" text buttons to icon buttons
- Redesign saved products grid with cleaner cards matching tender/proposal card style
- Remove all dark mode classes (not used in redesigned pages)
- Match the color palette: indigo for primary, emerald/amber/violet for accents, gray for neutral

## Capabilities

### New Capabilities
- `company-profile-layout`: Redesigned company profile page matching the editorial design system with consistent form styling, product management, and saved products display

### Modified Capabilities

## Impact

- **Code**: `src/components/dashboard/CompanyProfileSection.tsx` — restructure JSX and CSS classes
- **No API changes**
- **No data model changes**
- **Design-only**: layout/UX change preserving all functionality

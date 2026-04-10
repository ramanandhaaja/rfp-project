## Context

`CompanyProfileSection.tsx` is a 581-line client component containing a single form with 4 logical zones: company info, capabilities tags, manual product entry, CSV import, and saved products grid. All rendered inside one large white card with `shadow-sm rounded-lg` and unused dark mode classes.

The tender management and proposals pages already use a consistent design language: rounded-xl containers, uppercase tracking-wider section labels, gray-200 borders, indigo primary accents, emerald/amber/violet semantic colors, 10px badge text, compact icon buttons.

## Goals / Non-Goals

**Goals:**
- Match the editorial design language exactly
- Clear visual hierarchy between company info and products
- Redesigned form inputs with consistent focus states
- Saved products as a separate card list (matching tender cards)
- Compact icon buttons instead of text links
- Preserve all existing functionality

**Non-Goals:**
- Changing form validation or submission logic
- Adding new features or fields
- Refactoring state management
- Mobile-specific layout changes

## Decisions

### 1. Three-zone layout: Company Info → Products Manager → Saved Products

**Decision**: Split the form into visual sections, each in its own rounded-xl card:
- **Company Information** — name, industry, website, email, description, capabilities
- **Add Products** — manual entry rows + CSV import action
- **Saved Products** — compact card grid showing imported products

**Why**: Matches the patterns users now know from tender/proposal pages. Better visual scanability.

### 2. Consistent input styling

**Decision**: All inputs use `border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200` with small text and clear labels.

**Why**: Matches the design system.

### 3. Uppercase section labels

**Decision**: All section headings become `text-xs font-semibold text-gray-400 uppercase tracking-wider` — same as tender management.

**Why**: Visual consistency.

### 4. Icon buttons for destructive actions

**Decision**: Replace "Remove" text links with small icon buttons (X icon) using the same style as the collapse chevron on tender cards.

**Why**: Saves space and matches the established pattern.

### 5. Remove dark mode classes

**Decision**: Strip all `dark:*` Tailwind classes from this file.

**Why**: The redesigned tender and proposal pages don't use dark mode. Keeping it here creates visual inconsistency and dead styles.

### 6. CSV import as inline secondary action

**Decision**: The CSV import button sits in the "Add Products" section header as a compact uppercase secondary button, not as a custom file-input-with-label hack.

**Why**: Matches the "Sync Products" button pattern in tender analysis.

## Risks / Trade-offs

- **Removing dark mode classes** — If dark mode is ever re-enabled, this section would need them added back. Acceptable since the whole dashboard was redesigned without dark mode.
- **Form state unchanged** — All handlers and state stay the same, only JSX changes. Low risk of regression.

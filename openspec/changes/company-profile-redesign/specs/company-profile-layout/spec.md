## ADDED Requirements

### Requirement: Three-zone layout with editorial design language
The company profile page SHALL be organized into three visual zones, each in a separate `rounded-xl` card with `border-gray-200`: Company Information, Add Products, and Saved Products.

#### Scenario: Page renders with editorial design
- **WHEN** the company profile page loads
- **THEN** it SHALL show three separate cards with consistent styling
- **AND** section headings SHALL use `text-xs font-semibold text-gray-400 uppercase tracking-wider`

### Requirement: Company information form with consistent inputs
The Company Information card SHALL contain name, industry, website, email, description, and capabilities fields. All inputs SHALL use consistent styling with indigo focus states.

#### Scenario: User fills company info
- **WHEN** the user types in any input field
- **THEN** the field SHALL show an indigo focus ring
- **AND** the label SHALL be visible above the input with uppercase tracking-wide styling

#### Scenario: Capabilities as tags
- **WHEN** the user types a capability and presses Enter
- **THEN** the capability SHALL appear as an indigo badge tag
- **AND** a small X icon button SHALL allow removal

### Requirement: Products manager with inline CSV import
The Add Products card SHALL contain manual product entry rows and a compact CSV import button in the section header.

#### Scenario: User adds a product row
- **WHEN** the user clicks "Add Product"
- **THEN** a new empty product row SHALL appear with name, category, and description inputs

#### Scenario: User removes a product row
- **WHEN** the user clicks the remove icon on a product row
- **THEN** the row SHALL be removed from the list

#### Scenario: User imports CSV
- **WHEN** the user clicks the CSV import button and selects a file
- **THEN** the import action SHALL fire and show results
- **AND** the import button SHALL show "Importing..." during the upload

#### Scenario: CSV import requires saved company
- **WHEN** the user tries to import CSV before saving the company
- **THEN** the button SHALL be disabled with a hint "Save company first"

### Requirement: Saved products as card grid
The Saved Products card SHALL display imported products in a responsive grid with compact cards matching the tender/proposal card style.

#### Scenario: Saved products grid renders
- **WHEN** the company has saved products
- **THEN** they SHALL be displayed in a responsive grid (1/2/3 columns based on breakpoint)
- **AND** each card SHALL show name, category badge, description, features, and creation date

#### Scenario: Product card with features
- **WHEN** a product has features
- **THEN** up to 3 feature badges SHALL be shown with "+N more" overflow indicator

#### Scenario: No saved products
- **WHEN** no products are saved yet
- **THEN** the Saved Products card SHALL not be rendered

### Requirement: All existing functionality preserved
All existing business logic, API calls, form submission, CSV import, and state management SHALL remain unchanged.

#### Scenario: Save profile works identically
- **WHEN** the user submits the form
- **THEN** the save flow SHALL work exactly as before (POST to /api/companies, then POST products)

#### Scenario: CSV import works identically
- **WHEN** the user imports a CSV file
- **THEN** the import flow SHALL work exactly as before

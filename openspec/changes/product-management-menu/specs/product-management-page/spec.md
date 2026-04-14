## ADDED Requirements

### Requirement: Product Management left-nav entry
A "Product Management" menu item SHALL appear in the dashboard sidebar under the Workspace section, immediately after Company Profile.

#### Scenario: Nav item renders and routes correctly
- **WHEN** the user views the dashboard
- **THEN** "Product Management" SHALL appear in the left sidebar under Workspace
- **AND** clicking it SHALL navigate to `/dashboard/product-management`
- **AND** the item SHALL be highlighted as active when on that route

### Requirement: Product Management page with Add Products card
The `/dashboard/product-management` page SHALL contain the manual product entry card (product rows with name, category, description inputs, and a CSV import button in the header).

#### Scenario: Page loads with no company
- **WHEN** the user has not saved a company profile yet
- **THEN** product add actions and CSV import SHALL be disabled
- **AND** a hint SHALL read "Set up your Company Profile first"

#### Scenario: Page loads with an existing company
- **WHEN** the user has a saved company
- **THEN** the Add Products card SHALL be enabled and functional

#### Scenario: User adds a product row
- **WHEN** the user clicks "Add Product"
- **THEN** a new empty product row SHALL appear

#### Scenario: User removes a product row
- **WHEN** the user clicks the remove icon
- **THEN** the row SHALL be removed

#### Scenario: User saves products
- **WHEN** the user clicks save
- **THEN** products SHALL be POSTed to the API and confirmed

#### Scenario: CSV import
- **WHEN** the user clicks the CSV import button and selects a file
- **THEN** the import SHALL run and show results (emerald on success, red on error)

### Requirement: Product Management page with Saved Products card
The `/dashboard/product-management` page SHALL always show the Saved Products card, with an empty state when no products exist.

#### Scenario: No products saved
- **WHEN** no products exist for the company
- **THEN** the Saved Products card SHALL show an empty state message

#### Scenario: Products exist
- **WHEN** products are saved
- **THEN** they SHALL display in a responsive grid with name, category badge, description, features, and date

## MODIFIED Requirements

### Requirement: Company Profile page contains only company information
The Company Profile page SHALL contain only the Company Information card (name, industry, website, email, description, capabilities). The Add Products and Saved Products cards SHALL NOT appear on this page.

#### Scenario: Company Profile renders without product sections
- **WHEN** the user navigates to `/dashboard/company-profile`
- **THEN** only the Company Information card SHALL be visible
- **AND** no Add Products card SHALL be present
- **AND** no Saved Products card SHALL be present

#### Scenario: Company info save still works
- **WHEN** the user submits the company info form
- **THEN** the save flow SHALL work exactly as before

# Project

## Position In The System

- Every project belongs to exactly one client.
- Projects are the primary organizational unit for work: issues, boards, transactions, and invoices all belong to a project.
- Project access is granted explicitly per project via project memberships, separate from client membership.
- A platform owner has implicit access to all projects.

## Database Fields

### Core Fields

| Field | Type | Notes |
|-------|------|-------|
| id | auto-increment | Primary key |
| client_id | FK to clients | Required. The owning client |
| status_id | FK to project_statuses | Required. Current lifecycle state |
| name | string, max 255 | Required. The project display name |
| description | text, nullable | Optional long-form description |

### Planning Fields

| Field | Type | Notes |
|-------|------|-------|
| starts_at | datetime, nullable | Project start date |
| ends_at | datetime, nullable | Project end/deadline date |
| budget | decimal(10,2), nullable | Financial budget allocated to the project |
| currency | string(3), nullable | ISO 4217 currency code (e.g. USD, EUR, EGP) |
| image_path | string, nullable | Project logo stored via public disk |

### Notes

| Field | Type | Notes |
|-------|------|-------|
| notes | text, nullable | Free-form internal notes about the project |

### Secrets

Projects can also hold platform-only secrets through the dedicated `SecretEntry` model.

Those secrets are not part of the project notes field.

### System Fields

| Field | Type | Notes |
|-------|------|-------|
| created_at | timestamp | Record creation |
| updated_at | timestamp | Last modification |

## Relationships

| Relation | Type | Target | Notes |
|----------|------|--------|-------|
| client | belongsTo | Client | The owning client |
| status | belongsTo | ProjectStatus | Current lifecycle state |
| memberships | hasMany | ProjectMembership | Explicit user access grants |
| issues | hasMany | Issue | All issues in this project |
| boards | hasMany | Board | All boards in this project |
| transactions | hasMany | Transaction | Project-linked financial transactions |
| invoices | hasMany | Invoice | Project-linked invoices |
| secrets | morphMany | SecretEntry | Platform-only secrets linked to the project |

## Project Statuses

Project statuses are creatable values stored in the `project_statuses` table rather than a fixed enum.

Default statuses seeded on install:
- **active** — work is ongoing
- **paused** — temporarily halted
- **completed** — deliverables finished
- **archived** — no longer active, retained for records

Statuses can be scoped to a specific client or be global (system-wide).

| Field | Type | Notes |
|-------|------|-------|
| id | auto-increment | Primary key |
| name | string | Display name |
| slug | string | URL-safe identifier |
| scope | string | "system" or "client" |
| client_id | FK, nullable | If client-scoped, which client owns it |

## Access Rules

- Platform owners have implicit access to all projects.
- Client owners and admins can access all projects under their client.
- Client members need explicit `ProjectMembership` to access a project.
- Client viewers can view projects they have membership for but cannot modify.

## Finance Integration

- Transactions and invoices are linked to projects.
- Budget and currency fields allow project-level financial tracking.
- Client finance views aggregate data across all of a client's projects.

## Notes Vs Secrets

- `notes` are internal project context, planning, and historical detail.
- `secrets` are encrypted credentials or sensitive values for the project.
- Secrets should be modeled in the secrets area rather than embedded in notes.
- The project logo is stored via Laravel's public disk and served at `/storage/{image_path}`.

## Current Capabilities

- Full CRUD with status, budget, currency, dates, and notes
- Project detail page shows stat cards (issues, boards, transactions, invoices)
- Budget displayed with currency formatting and color-coded icon
- Platform owners also have a cross-client projects index for browsing all client-owned projects in one place
- AI assistant has tools for listing, creating, updating, and deleting projects

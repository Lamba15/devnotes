# Finance

## Position In The System

Finance is a top-level domain connecting to projects. All financial records (transactions and invoices) are linked to projects, which in turn belong to clients. Client-level finance views aggregate data across all of a client's projects.

## Access Direction

- Platform owners have global finance access.
- Client `owner` and `admin` memberships always include finance access for that client.
- Client `member` users need explicit `finance.read` or `finance.write` permission on their `ClientMembership`.
- `finance.write` is the mutation permission. `finance.read` alone does not allow create, update, or delete.
- For client members, finance access is still limited to assigned projects.

## Transaction

### Database Fields

| Field       | Type                | Notes                                                        |
| ----------- | ------------------- | ------------------------------------------------------------ |
| id          | auto-increment      | Primary key                                                  |
| project_id  | FK to projects      | Required. The owning project                                 |
| description | string, max 255     | Required. What the transaction is for                        |
| amount      | decimal(10,2)       | Required. Positive = income, negative = expense              |
| occurred_at | date, nullable      | When the transaction took place                              |
| category    | string, nullable    | Freeform category label (e.g. "hosting", "design", "salary") |
| currency    | string(3), nullable | ISO 4217 currency code (e.g. USD, EUR, EGP)                  |
| created_at  | timestamp           | Record creation                                              |
| updated_at  | timestamp           | Last modification                                            |

### Relationships

| Relation | Type      | Target  | Notes              |
| -------- | --------- | ------- | ------------------ |
| project  | belongsTo | Project | The owning project |

### UI Behavior

- Amounts are displayed with color coding: green for income (positive), red for expenses (negative)
- Arrow icons indicate direction (up for income, down for expense)
- Category is displayed as a badge when present
- Date uses the shared non-native date picker in forms while preserving date-only `YYYY-MM-DD` values.

## Invoice

### Database Fields

| Field      | Type                | Notes                                           |
| ---------- | ------------------- | ----------------------------------------------- |
| id         | auto-increment      | Primary key                                     |
| project_id | FK to projects      | Required. The owning project                    |
| reference  | string, max 255     | Required. Invoice reference number              |
| status     | string, max 255     | Required. One of: draft, pending, paid, overdue |
| amount     | decimal(10,2)       | Required. Invoice total                         |
| currency   | string(3), nullable | ISO 4217 currency code                          |
| issued_at  | date, nullable      | When the invoice was sent                       |
| due_at     | date, nullable      | Payment deadline                                |
| paid_at    | date, nullable      | When payment was received                       |
| notes      | text, nullable      | Optional notes                                  |
| created_at | timestamp           | Record creation                                 |
| updated_at | timestamp           | Last modification                               |

### Relationships

| Relation | Type      | Target  | Notes              |
| -------- | --------- | ------- | ------------------ |
| project  | belongsTo | Project | The owning project |

### Status Lifecycle

- **draft** — created but not yet sent
- **pending** — sent and awaiting payment
- **paid** — payment received (paid_at is set)
- **overdue** — past due_at without payment

### UI Behavior

- Status is rendered as a colored badge: emerald (paid), amber (pending), red (overdue), muted (draft)
- Amount displayed with currency and DollarSign icon
- Date fields use the shared non-native date picker in forms while preserving date-only `YYYY-MM-DD` values.
- Status uses a select dropdown rather than free text

## AI Tools

The AI assistant has full CRUD tools for both transactions and invoices:

- `create_transaction`, `update_transaction`, `delete_transaction`, `list_accessible_transactions`
- `create_invoice`, `update_invoice`, `delete_invoice`, `list_accessible_invoices`

Those tools must follow the same finance read/write rules as the web app.

## Audit Coverage

All transaction and invoice CRUD operations are logged with before/after snapshots.

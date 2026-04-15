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

A transaction represents real cash movement between you and the client for a project. Positive amounts mean the client paid you; negative amounts mean you paid the client (refunds, advances returned, etc.). Internal project costs such as paying a freelancer are not transactions in this model.

### Database Fields

| Field         | Type                | Notes                                                                |
| ------------- | ------------------- | -------------------------------------------------------------------- |
| id            | auto-increment      | Primary key                                                          |
| project_id    | FK to projects      | Required. The owning project                                         |
| description   | string, max 255     | Required. What the transaction is for                                |
| amount        | decimal(10,2)       | Required. Positive = client paid you, negative = you paid the client |
| occurred_date | date, nullable      | When the transaction took place                                      |
| category      | string, nullable    | Freeform category label (e.g. "deposit", "final payment", "refund")  |
| currency      | string(3), nullable | ISO 4217 currency code (e.g. USD, EUR, EGP)                          |
| created_at    | timestamp           | Record creation                                                      |
| updated_at    | timestamp           | Last modification                                                    |

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

| Field                   | Type                | Notes                                                         |
| ----------------------- | ------------------- | ------------------------------------------------------------- |
| id                      | auto-increment      | Primary key                                                   |
| project_id              | FK to projects      | Required. The owning project                                  |
| reference               | string, max 255     | Required. Invoice reference number                            |
| status                  | string, max 255     | Required. One of: draft, pending, paid, overdue               |
| currency                | string(3), nullable | Required at the invoice level. All items and discounts use it |
| subtotal_amount         | decimal(12,2)       | Computed sum of invoice item base amounts before discounts    |
| discount_total_amount   | decimal(12,2)       | Computed total of all applied discounts                       |
| amount                  | decimal(12,2)       | Computed final total after all item and invoice discounts     |
| issued_at               | date, nullable      | When the invoice was sent                                     |
| due_at                  | date, nullable      | Payment deadline                                              |
| paid_at                 | date, nullable      | When payment was received                                     |
| notes                   | text, nullable      | Optional notes                                                |
| public_id               | string, unique      | Stable public document id used in the verification URL        |
| public_pdf_path         | string, nullable    | Stored generated PDF path for the public invoice document     |
| public_pdf_generated_at | timestamp, nullable | When the stored PDF was last regenerated                      |
| created_at              | timestamp           | Record creation                                               |
| updated_at              | timestamp           | Last modification                                             |

### Invoice Item Fields

| Field       | Type                    | Notes                                                 |
| ----------- | ----------------------- | ----------------------------------------------------- |
| id          | auto-increment          | Primary key                                           |
| invoice_id  | FK to invoices          | Required. Owning invoice                              |
| position    | integer                 | Stable visual order inside the invoice                |
| description | string                  | Required line-item description                        |
| hours       | decimal(12,2), nullable | Optional. Used when the item is billed by hours       |
| rate        | decimal(12,2), nullable | Optional. Required with hours for hourly items        |
| base_amount | decimal(12,2)           | Computed pre-discount amount for the item             |
| amount      | decimal(12,2)           | Computed final item amount after item-level discounts |

### Invoice Discount Fields

| Field           | Type                          | Notes                                                   |
| --------------- | ----------------------------- | ------------------------------------------------------- |
| id              | auto-increment                | Primary key                                             |
| invoice_id      | FK to invoices                | Required. Owning invoice                                |
| invoice_item_id | FK to invoice_items, nullable | Null means invoice-level discount; otherwise item-level |
| position        | integer                       | Stable order within its target                          |
| label           | string, nullable              | Optional label shown in the document                    |
| type            | string                        | Required. One of: fixed, percent                        |
| value           | decimal(12,4)                 | Raw entered discount value                              |
| amount          | decimal(12,2)                 | Computed discount amount actually applied               |

### Relationships

| Relation  | Type      | Target          | Notes                                          |
| --------- | --------- | --------------- | ---------------------------------------------- |
| project   | belongsTo | Project         | The owning project                             |
| items     | hasMany   | InvoiceItem     | Ordered invoice line items                     |
| discounts | hasMany   | InvoiceDiscount | Ordered item-level and invoice-level discounts |

### Status Lifecycle

- **draft** — created but not yet sent
- **pending** — sent and awaiting payment
- **paid** — payment received (paid_at is set)
- **overdue** — past due_at without payment

### UI Behavior

- Status is rendered as a colored badge: emerald (paid), amber (pending), red (overdue), muted (draft)
- Amount displayed with invoice currency and reflects the computed final total
- Date fields use the shared non-native date picker in forms while preserving date-only `YYYY-MM-DD` values.
- Status uses a select dropdown rather than free text
- Invoice editing is itemized rather than flat. Each invoice contains one or more line items.
- Item rows support either hourly billing (`hours * rate`) or a flat line amount.
- The invoice table uses `Hours`, not `Hours/Qty`.
- Discounts may target a single item, the whole invoice, or both.
- Discounts stack sequentially against the remaining amount on their target.
- `subtotal_amount`, `discount_total_amount`, and `amount` are always computed from the invoice structure and are not directly entered by the user.

### Calculation Rules

- Every invoice must use a single currency.
- For an hourly line item, `base_amount = hours * rate`.
- For a flat line item, `base_amount` is the entered line amount and `hours` and `rate` stay empty.
- Item-level discounts apply first and stack in their saved order against the remaining amount for that item.
- Invoice-level discounts apply after all item-level discounts and stack in their saved order against the remaining invoice amount.
- `subtotal_amount` is the sum of all item `base_amount` values.
- `discount_total_amount` is the sum of every applied discount amount.
- `amount` is the final total after all discounts.

### Document Surfaces

- The invoice PDF is the canonical invoice document.
- The internal invoice show route presents that same document inside the authenticated app shell.
- The public verification route presents that same document without auth and without CRM shell framing.
- The public verification URL uses the stable pattern `/invoices/{public_id}`.
- The verification URL is printed inside the invoice document itself.
- The stored public PDF is regenerated automatically whenever the invoice changes.

## Client Finance Summary

The clients index shows two aggregate numbers per client, computed over the projects the current user has finance access to.

### Running Account

`running_account = SUM(transactions.amount) − SUM(invoices.amount)` across the client's accessible projects. Every invoice counts regardless of its status (`draft`, `pending`, `paid`, `overdue`).

The result is the outstanding balance between you and the client:

- **Positive** — you owe the client (they've paid you more than you've invoiced, or you've invoiced nothing yet).
- **Negative** — the client owes you (you've invoiced them for more than they've paid).
- **Zero** — settled.

If the client's transactions and invoices span more than one currency, `currency` is null and `mixed_currencies` is true. No FX conversion is performed; amounts are summed as raw numbers and the total is only meaningful when a single currency is in use.

### Relationship Volume

`relationship_volume = SUM(invoices.amount)` across the client's accessible projects. Lifetime billed value, regardless of payment state. Same mixed-currency rules apply.

## AI Tools

The AI assistant has full CRUD tools for both transactions and invoices:

- `create_transaction`, `update_transaction`, `delete_transaction`, `list_accessible_transactions`
- `create_invoice`, `update_invoice`, `delete_invoice`, `list_accessible_invoices`

Those tools must follow the same finance read/write rules as the web app.

## Audit Coverage

All transaction and invoice CRUD operations are logged with before/after snapshots.

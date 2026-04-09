# Core Model

## Current Domain Entities

The product domain consists of these primary entities:

### Identity and Access
- **User** — authentication identity with profile, AI credits, and permission methods
- **Behavior** — client working-style classification (normal, difficult, etc.)
- **ClientMembership** — grants a user access to a client workspace with a role
- **ProjectMembership** — grants a user explicit access to a specific project
- **BoardMembership** — grants a user explicit access to a specific board

### Client Domain
- **Client** — a person or organization the platform owner works with
- **ClientPhoneNumber** — multiple phone numbers per client with labels
- **ClientTag** — freeform descriptors attached to clients

### Project Domain
- **Project** — a scoped body of work belonging to one client
- **ProjectStatus** — creatable lifecycle states for projects (active, paused, completed, archived)

### Tracking Domain
- **Issue** — a unit of work belonging to a project (task, bug, feature)
- **IssueComment** — threaded discussion on issues with Reddit-style nesting
- **Board** — a visual view over project issues with drag-and-drop columns
- **BoardColumn** — a named, ordered column on a board (optionally mapped to an issue status)
- **BoardIssuePlacement** — positions an issue within a column on a board

### Finance Domain
- **Transaction** — a financial record linked to a project (income or expense)
- **Invoice** — a billing record linked to a project with status lifecycle

### Content Domain
- **Attachment** — polymorphic file/image attached to issues or comments

### AI Domain
- **AssistantThread** — a conversation session between a user and the AI
- **AssistantMessage** — a single message in a thread
- **AssistantRun** — an AI processing run within a thread
- **AssistantRunPhase** — a phase within an AI run
- **AssistantToolExecution** — a record of a tool call made by the AI
- **AssistantActionConfirmation** — a pending user confirmation for a destructive AI action

### Platform Domain
- **AuditLog** — tracks all user and system actions with before/after snapshots

## Exclusions

- There is no `Team` concept in the product model.
- `Idea` is not an in-product entity.

## Key Relationship Rules

- Every project belongs to exactly one client in v1.
- Issues belong to projects but can appear on many boards.
- Transactions and invoices are linked to projects, not directly to clients.
- Client finance is aggregated from project-level financial records.
- Attachments are polymorphic and can belong to issues or comments.
- Comments support unlimited nesting depth (Reddit-style threading).

## Entity Documentation

- [Client](./client.md) — client record shape, profile fields, workspace behavior
- [Project](./project.md) — project fields, status system, finance integration
- [User](./user.md) — user identity, permissions, AI credits, mini-profile
- [Issues](../tracking/issues.md) — issue fields, capabilities, comment threading
- [Boards](../tracking/boards.md) — board behavior, columns, backlog rules

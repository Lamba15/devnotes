# Docs

This directory captures the current agreed shape of the system.

## Sections

- [Product Overview](./product/overview.md): what the system fundamentally is
- [Product Scope](./product/scope.md): currently known top-level domains and planning boundaries
- [Branding](./product/branding.md): inherited logo and color direction
- [Domain](./domain/core-model.md): current top-level product entities and relationship rules
- [Client](./domain/client.md): client record direction and known fields
- [Project](./domain/project.md): project fields, statuses, finance integration, and access rules
- [User](./domain/user.md): user identity, permissions, AI credits, and mini-profile system
- [Finance](./domain/finance.md): transaction and invoice models, status lifecycle, and UI behavior
- [Permissions](./permissions/scopes.md): platform and organization access rules
- [AI](./ai/central-ai.md): central AI model, permissions, and chat UI behavior
- [UI Architecture](./ui/architecture.md): central form, table, and filter direction
- [Tracking: Issues](./tracking/issues.md): issue role, capabilities, and naming
- [Tracking: Boards](./tracking/boards.md): board behavior, backlog, columns, and status rules

## Current Summary

- `devnotes` is a personal professional operating system.
- Clients, finance, and CMS are currently known top-level domains.
- The full product scope is broader than the current implementation scope.
- The first implementation scope is focused on structure, clients, client project management, transactions, and invoices.
- `Overview` now acts as a platform-owner landing route with dashboard stats and recent activity.
- Client-scoped users should be redirected into their client workspace instead of using platform-level overview.
- Top-level navigation is now intentionally scope-sensitive rather than identical for every authenticated user.
- In v1, projects live inside clients.
- Tracking is one subsystem inside the broader system.
- Project access is granted explicitly per project.
- Issues exist independently of boards and support due dates, estimated hours, labels, and file attachments.
- Boards are views over project issues.
- An issue can appear on many boards.
- Backlog is computed per board as issues not placed on that board.
- Columns may or may not update issue status.
- Permissions are scoped and explicit.
- Scope and capability checks should be centralized and reused by routes, controllers, UI, and AI.
- AI uses the same permissions as the active user and operates through tools and skills.
- AI credit system controls non-owner access: -1 unlimited, 0 none, positive integer is a quota.
- Users have profile photos (avatar_path), job titles, and timezone fields.
- Polymorphic attachments model supports images and files on issues and issue comments.
- Audit logs are viewable by platform owners in a dedicated page with filtering.
- Platform owner (God Admin) cannot delete their own account from settings.
- Custom scrollbar styling is applied globally for a polished feel.
- All navigation and UI pages use Lucide icons consistently.
- Issues support due dates, estimated hours, and labels.
- Projects support budget and currency fields.
- Transactions support category and currency fields.
- Invoices support currency field and use a select for status (draft, pending, paid, overdue).
- All date fields in forms use native date pickers via the DynamicForm date field type.
- All list pages have search icons in filter inputs, plus icons on create buttons, and colored badges for status/type columns.
- Finance detail pages display amounts with color-coded formatting and use icons for metadata fields.
- AI assistant has 34 tools covering client, project, issue, board, finance, and platform management.
- Audit logs cover all CRUD actions, settings changes, attachment uploads/deletes, credit changes, and authentication events.
- The project should follow strict TDD.
- Normal automated tests should use Pest.
- Browser automation should use Laravel Dusk.

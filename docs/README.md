# Docs

This directory captures the current agreed shape of the system.

## Sections

- [Product Overview](./product/overview.md): what the system fundamentally is
- [Product Scope](./product/scope.md): currently known top-level domains and planning boundaries
- [Branding](./product/branding.md): inherited logo and color direction
- [Domain](./domain/core-model.md): current top-level product entities
- [Client](./domain/client.md): client record direction and known fields
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
- `Overview` now acts as a platform-owner landing route.
- Client-scoped users should be redirected into their client workspace instead of using platform-level overview.
- Top-level navigation is now intentionally scope-sensitive rather than identical for every authenticated user.
- In v1, projects live inside clients.
- Tracking is one subsystem inside the broader system.
- Project access is granted explicitly per project.
- Issues exist independently of boards.
- Boards are views over project issues.
- An issue can appear on many boards.
- Backlog is computed per board as issues not placed on that board.
- Columns may or may not update issue status.
- Permissions are scoped and explicit.
- Scope and capability checks should be centralized and reused by routes, controllers, UI, and AI.
- AI uses the same permissions as the active user and operates through tools and skills.
- The project should follow strict TDD.
- Normal automated tests should use Pest.
- Browser automation should use Laravel Dusk.

# Permission Scopes

## Top-Level Scopes

- platform
- client

## Rules

- Platform scope is for the platform owner only.
- Client scope is for people who belong to a specific client portal.
- From the portal user's perspective, client scope should feel like their own workspace with Nour, not like access into a raw CRM record.
- Client membership does not automatically grant access outside that client.
- Project access is granted explicitly per project.
- Client `owner` and `admin` are unrestricted inside that client scope.
- Explicit permission rows apply to `member` only.
- The platform owner has platform-wide authority.
- Other accounts should receive explicit permissions such as read/write over the things we decide.
- Permissions should be intentional and capability-based, not implied by vague role labels.

## Current Implementation Shape

- Scope and capability checks are now centralized through one access model instead of being treated as page-by-page UI concerns.
- The system currently distinguishes two real operating scopes:
    - `platform`
    - `client`
- A client-scoped user should not receive platform-wide navigation, platform-wide routes, or platform-wide data by default.
- A platform owner can access global domains such as top-level finance, top-level tracking, CMS, and reusable client tags.
- A client-scoped user should instead be routed into client workspaces and operate inside those client boundaries.
- That client workspace should be treated as the primary product surface for that user, not as a reduced copy of the platform-owner admin area.

## Current Top-Level Route Direction

- `Overview` is effectively a platform-owner landing surface.
- A platform owner can access:
    - top-level `Clients`
    - top-level `Finance`
    - top-level `Tracking`
    - top-level `CMS`
- A client-scoped user should not access those platform-only top-level areas.
- A client-scoped user should be redirected from `Overview` into their first accessible client workspace.
- Client-scoped users should primarily work from nested client pages such as:
    - client overview
    - client members
    - client projects
    - client issues
    - client boards
    - client statuses
    - client finance
- Those nested client pages should increasingly become the real portal experience for that user.
- The system should prefer client-scoped navigation, copy, and workflows over exposing platform-owner concepts in that portal.

## Central Capability Direction

- Permission decisions should come from one central capability/scope system.
- Controllers, middleware, route guards, navigation, and AI should all read from the same underlying scope logic.
- UI should not invent its own access rules independently from backend rules.
- Route protection should not rely only on hiding navigation.
- Shared capability concepts should include at least:
    - platform access
    - assistant debug access
    - client creation access
    - client tag management access
    - top-level finance management access
    - top-level tracking access
    - CMS access

## Current Client Portal Role Direction

- Valid client roles are `owner`, `admin`, and `member`.
- `viewer` has been removed.
- `owner` and `admin` both have unrestricted client access, including finance.
- `owner` and `admin` do not use explicit project or board assignment rows.
- `member` access is explicit and capability-based through client membership permissions.
- Member profile pages are readable to people who can view members:
    - `owner`
    - `admin`
    - `member` with `members.read`
    - `member` with `members.write`
- Member profile mutation remains limited to staff managers:
    - `owner`
    - `admin`
    - `member` with `members.write`
- Login password override remains platform-only even on member profile pages.

## Current Member Permission Direction

- Member permissions are stored per `ClientMembership`, not globally on the user.
- The current member permission catalog is:
    - `members.read`
    - `members.write`
    - `projects.read`
    - `projects.write`
    - `issues.read`
    - `issues.write`
    - `boards.read`
    - `boards.write`
    - `statuses.read`
    - `statuses.write`
    - `finance.read`
    - `finance.write`
    - `assistant.use`
- Every `.write` permission implies the matching `.read` permission.
- Project access still requires explicit project assignment.
- Board access requires explicit board assignment or board ownership (created_by) and the board must belong to an assigned project.
- Project and board assignment controls apply to `member` only.
- Web UI and AI tools should both read from the same centralized workspace access rules.

## Current Client Finance Direction

- Platform owners have global finance access.
- Client `owner` and `admin` users always have finance access inside that client.
- Client `member` users need explicit `finance.read` or `finance.write` permission to access finance.
- Finance mutation requires `finance.write`.
- Client-scoped finance access still respects project scope for members.
- Controllers, UI, routes, and AI must all use the same central finance access checks.

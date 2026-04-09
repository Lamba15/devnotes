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
- `admin` should not automatically mean unrestricted power.
- Admins operate within explicit permissions in their scope.
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

- `owner` is effectively the same as `admin` inside the client scope.
- `admin` can do anything inside the client scope.
- `viewer` can read but cannot mutate.
- `member` is not full admin, but can perform normal work actions where access has been granted explicitly.

## Current Board And Issue Direction

- A `member` who has access to a board can read tickets on that board and in the related issue views.
- A `member` who has access to a board can move tickets on that board.
- In the current implementation, that member board access is granted explicitly per board.
- A `viewer` can see boards and issues in their allowed scope but cannot edit them.
- An `admin` can do anything to any board inside the client scope.
- An `owner` can do the same as an `admin`.

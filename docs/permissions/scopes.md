# Permission Scopes

## Top-Level Scopes

- platform
- client

## Rules

- Platform scope is for the platform owner only.
- Client scope is for people who belong to a specific client portal.
- Client membership does not automatically grant access outside that client.
- Project access is granted explicitly per project.
- `admin` should not automatically mean unrestricted power.
- Admins operate within explicit permissions in their scope.
- The platform owner has platform-wide authority.
- Other accounts should receive explicit permissions such as read/write over the things we decide.
- Permissions should be intentional and capability-based, not implied by vague role labels.

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

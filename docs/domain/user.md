# User

## Position In The System

Users are the identity layer for the platform. A user can be a platform owner (God Admin) or a client-scoped collaborator with a client role plus explicit member permissions where needed.

## Database Fields

### Core Fields

| Field | Type | Notes |
|-------|------|-------|
| id | auto-increment | Primary key |
| name | string, max 255 | Required. Display name |
| email | string, unique | Required. Login credential and contact |
| password | string, hashed | Required. Authentication credential |
| email_verified_at | timestamp, nullable | When email was verified |

### Profile Fields

| Field | Type | Notes |
|-------|------|-------|
| avatar_path | string, nullable | Profile photo stored via public disk |
| job_title | string, nullable | Professional title for display |
| timezone | string, nullable | User's local timezone |

### AI Credit System

| Field | Type | Notes |
|-------|------|-------|
| ai_credits | integer, default 0 | Credit allowance: -1 = unlimited, 0 = none, positive = quota |
| ai_credits_used | integer, default 0 | Running count of credits consumed |

Credit rules:
- Platform owners bypass credit checks entirely.
- `-1` means unlimited — usage is tracked but never blocked.
- `0` means no credits allocated — AI access is blocked.
- Positive integer is a hard quota — blocked when `ai_credits_used >= ai_credits`.
- Each AI message consumes 1 credit.
- Credits are managed by platform owner via the member management UI.

### AI Configuration

| Field | Type | Notes |
|-------|------|-------|
| openrouter_api_key | string, encrypted, nullable | User's OpenRouter API key |
| openrouter_model | string, nullable | Selected AI model identifier |
| openrouter_system_prompt | text, nullable | Custom system prompt override |

### Two-Factor Authentication

| Field | Type | Notes |
|-------|------|-------|
| two_factor_secret | text, encrypted, nullable | TOTP secret key |
| two_factor_recovery_codes | text, encrypted, nullable | JSON array of recovery codes |
| two_factor_confirmed_at | timestamp, nullable | When 2FA was confirmed |

### System Fields

| Field | Type | Notes |
|-------|------|-------|
| remember_token | string, nullable | Session remember token |
| created_at | timestamp | Record creation |
| updated_at | timestamp | Last modification |

## Relationships

| Relation | Type | Target | Notes |
|----------|------|--------|-------|
| clientMemberships | hasMany | ClientMembership | Client workspace access grants |
| projectMemberships | hasMany | ProjectMembership | Explicit project access grants |
| boardMemberships | hasMany | BoardMembership | Board-level access grants |
| assistantThreads | hasMany | AssistantThread | AI conversation threads |

## Permission Methods

The User model delegates all permission checks to `WorkspaceAccess`:

| Method | Purpose |
|--------|---------|
| `isPlatformOwner()` | True if user has no client memberships (God Admin) |
| `belongsToClient(Client)` | True if user has any membership in this client |
| `clientRole(Client)` | Returns role string: owner, admin, or member |
| `canAccessClient(Client)` | Platform owner or has membership |
| `canManageClient(Client)` | Platform owner or client owner/admin |
| `canViewMembers(Client)` | Staff roster visibility |
| `canManageMembers(Client)` | Staff profile and membership mutation |
| `canViewInternalClientProfile(Client)` | Can see internal relationship fields |
| `canEditInternalClientProfile(Client)` | Can modify internal relationship fields |
| `canCreateProject(Client)` | Can create projects in the client |
| `hasProjectAccess(Project)` | Platform owner, client owner/admin, or explicit membership |
| `canManageProject(Project)` | Can create/edit/delete project resources |
| `canViewIssues(Project)` | Can read issues in project scope |
| `canManageIssues(Project)` | Can mutate issues in project scope |
| `canViewBoards(Client)` | Can access the boards domain in this client |
| `canManageBoard(Board)` | Can mutate a board they can manage |
| `canViewStatuses(Client)` | Can access statuses inside this client |
| `canManageStatuses(Client)` | Can mutate statuses inside this client |
| `canAccessClientFinance(Client)` | Can access finance inside that client |
| `canManageClientFinance(Client)` | Can mutate finance inside that client |
| `canAccessProjectFinance(Project)` | Can access finance for that project |
| `canManageProjectFinance(Project)` | Can mutate finance for that project |
| `canAccessBoard(Board)` | Can view the board |
| `canMoveIssueOnBoard(Board)` | Can drag issues between columns |
| `canCommentOnIssue(Issue)` | Can add comments to issue discussions |
| `canAccessAssistantDebug()` | Can see AI debug information |
| `canUseAssistant()` | Assistant access after role/permission and credit checks |

## User Mini-Profile

The user mini-profile is a reusable display pattern used across the system:

- **Avatar**: Circular profile photo from `avatar_path`, with initial-based fallback
- **Name**: Display name
- **Job title**: Professional title when available

This pattern appears in:
- Issue discussions (comment author avatars)
- Member lists (client workspace members page)
- Sidebar footer (current user)
- Activity feeds

## Platform Owner (God Admin)

- Identified by having no client memberships.
- Has implicit access to all clients, projects, issues, boards, and finance.
- Bypasses AI credit checks.
- Can view audit logs.
- Cannot delete their own account from settings.
- Can manage AI credits for all users.
- Can manage member credits from the member profile page.

## Client Membership Assignment Rules

- Client `owner` and `admin` users automatically access every project and board in that client.
- Client `owner` and `admin` users should not keep project or board assignment rows.
- Client `member` users use explicit project assignments and optional board assignments.
- Board assignment is always constrained by the selected project assignments.

## Profile Management

- Users can upload/remove profile photos from settings.
- Photos are stored on Laravel's public disk at `avatars/{user_id}/`.
- Two-factor authentication can be enabled/disabled from security settings.
- AI settings (model, API key, system prompt) are configurable per user.

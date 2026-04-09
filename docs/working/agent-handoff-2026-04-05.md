# Agent Handoff - 2026-04-05

## Purpose

This file is a reset-safe handoff for the next model session.

Read this before making product decisions or continuing implementation.

Stable intent still lives under `docs/`.

This file captures:

- the verified current implementation state
- what has already been finished
- what is partially finished
- what should happen next
- the exact tests and commands last used
- the assumptions currently encoded in code

## Repo Rules

- `AGENTS.md` is present at the repo root and should be followed.
- Docs are the source of truth for intent.
- Code is the source of truth for implementation.
- Do not silently invent product behavior when docs are unclear.
- The repo is being built with strict TDD:
    - write failing test
    - implement minimum code
    - make test pass
    - refactor safely
    - re-run verification
- Normal automated tests use Pest / `php artisan test`.
- Browser automation uses Laravel Dusk through `scripts/test-browser.sh`.
- The worktree is intentionally very dirty because this repo is mid-replacement from the Laravel starter into `devnotes`.
- Do not revert unrelated changes.
- Do not assume deleted starter-team files should come back.

## Product Shape To Keep In Mind

Current locked shape from docs:

- `Overview` is now effectively the platform-owner landing route.
- Client-scoped users should be redirected into their first client workspace.
- Top-level navigation is now scope-sensitive rather than identical for every authenticated user.
- There is no team system.
- `Clients` are the collaborative root.
- `Projects` are nested under `Clients`.
- From the portal user's perspective, the client-scoped product surface should feel like their workspace with Nour, not like a raw CRM record.
- Identity is one `users` table.
- Client portal roles are:
    - `owner`
    - `admin`
    - `member`
    - `viewer`
- Project access is explicit through `project_memberships`.
- Issues are first-class and do not depend on boards.
- Boards are views over project issues.
- An issue can appear on many boards.
- Backlog is computed per board.
- AI uses the same permissions as the active user.
- AI reads run directly.
- AI mutations require explicit confirmation.
- The assistant is global in the app shell.

## Current Agreed Implementation Assumptions

These are documented in `docs/working/sprint-1.md` and currently reflected in code:

- Until a dedicated platform-owner marker exists, authenticated users with no client memberships are treated as platform-scope users.
- Scope and capability checks are now centralized through `App\Support\WorkspaceAccess`.
- Platform-only routes and platform-only nav items should be derived from centralized capabilities, not hidden ad hoc in random screens.
- Issue `status`, `priority`, and `type` are currently plain strings.
- Issue create/update is currently limited to platform-scope users and client `owner` / `admin`.
- Issue comments/replies are currently treated as normal project work:
    - platform-scope users can comment
    - client `owner` / `admin` can comment
    - project-access `member` users can comment
    - `viewer` users are read-only

## What Is Already Implemented

### Foundation

- Team system removal is well underway and the app is now shaped around the `devnotes` v1 foundation.
- `Overview` exists and is blank.
- Top-level shell/nav has been replaced.
- Client/project/finance/tracking/assistant slices exist in the codebase.
- TDD guidance has been added to docs.
- Dusk is installed and working via `scripts/test-browser.sh`.

### Clients

- Client listing/creation exists.
- Client create and edit now have dedicated pages.
- Client list now behaves as a management screen:
    - server-backed search
    - server-backed sorting
    - pagination
    - row actions
    - bulk actions
    - delete confirmation
- Client memberships exist.
- Direct client user creation is implemented.
- Client membership create/edit/remove now exist as real CRUD.
- Client membership list now has server-backed search, sorting, pagination, row actions, and bulk actions.
- Client workspaces now exist and include nested client-scoped areas:
    - overview
    - members
    - projects
    - issues
    - boards
    - statuses
    - finance
- The client profile model is richer now and includes additional optional fields such as:
    - origin
    - social links
    - tags
    - phone numbers
- Internal owner-side client profile fields are now hidden from client-scoped portal users.
- Client edit is now internal/owner-side only.
- No email invitation flow is implemented.

Key files:

- `app/Http/Controllers/ClientController.php`
- `app/Http/Controllers/ClientMembershipController.php`
- `app/Actions/Clients/`
- `resources/js/pages/clients/`

### Projects

- Projects are nested under clients.
- Project create and edit now exist as dedicated pages.
- Project list now behaves as a management screen with server-backed search, sorting, pagination, row actions, bulk actions, and delete confirmation.
- Explicit `project_memberships` exist.

Key files:

- `app/Http/Controllers/ProjectController.php`
- `app/Actions/Projects/`
- `resources/js/pages/projects/`

### Finance

- Transactions are linked to projects.
- Invoices are linked to projects.
- Transactions and invoices now use dedicated create/edit pages.
- Finance transaction and invoice lists now support:
    - server-backed search
    - server-backed sorting
    - pagination
    - row actions
    - bulk actions
    - delete confirmation
- Assistant invoice/transaction tooling exists.

Key files:

- `app/Http/Controllers/FinanceController.php`
- `app/Http/Controllers/TransactionController.php`
- `app/Http/Controllers/InvoiceController.php`
- `app/Actions/Finance/`
- `resources/js/pages/finance/`

### Tracking: Issues / Boards

- Issue list/create/show/update/delete exists.
- Issue create/edit now use dedicated pages.
- Issue list now supports:
    - server-backed search
    - server-backed sorting
    - pagination
    - row actions
    - bulk actions
    - delete confirmation
- Boards exist.
- Board create/edit now exist as dedicated pages.
- Client board list now behaves as a management screen with:
    - server-backed search
    - server-backed sorting
    - pagination
    - row actions
    - bulk actions
    - delete confirmation
- Board columns exist.
- Board issue placement exists.
- Board memberships exist.
- Board move action exists.
- Backlog behavior exists.
- Board move permissions are enforced.

Key files:

- `app/Actions/Tracking/CreateIssue.php`
- `app/Actions/Tracking/UpdateIssue.php`
- `app/Actions/Tracking/MoveIssueOnBoard.php`
- `app/Http/Controllers/IssueController.php`
- `app/Http/Controllers/BoardController.php`
- `app/Http/Controllers/BoardIssueMovementController.php`
- `resources/js/pages/issues/`
- `resources/js/pages/boards/`

### Tracking: Comments / Replies

This was the latest completed slice before this handoff.

Implemented:

- `issue_comments` table
- `IssueComment` model
- `CreateIssueComment` action
- `IssueCommentController`
- `clients.projects.issues.comments.store` route
- nested comment serialization on issue detail
- issue discussion UI with:
    - top-level comment form
    - nested reply forms
    - recursive rendering
- member comment/reply permissions
- viewer read-only behavior
- Dusk coverage for nested replies

Key files:

- `database/migrations/2026_04_05_000016_create_issue_comments_table.php`
- `app/Models/IssueComment.php`
- `app/Actions/Tracking/CreateIssueComment.php`
- `app/Http/Controllers/IssueCommentController.php`
- `app/Http/Controllers/IssueController.php`
- `app/Models/User.php`
- `resources/js/pages/issues/show.tsx`

### AI Assistant

Implemented:

- global assistant panel
- thread/message/confirmation persistence
- OpenRouter-compatible provider abstraction shape
- fake configurable model client for tests/browser runs
- tool registry
- tool executor
- confirmation flow
- client/project/issue/finance tools
- issue tools currently include:
    - `list_accessible_issues`
    - `get_issue_discussion`
    - `get_issue_detail`
    - `list_accessible_boards`
    - `get_board_context`
    - `create_issue`
    - `update_issue`
    - `add_issue_comment`
    - `reply_to_issue_comment`
- assistant issue discussion reads now return threaded comment trees in user scope
- assistant issue detail reads now return issue fields plus threaded discussion in one result
- assistant board listing reads now return only boards visible in user scope
- assistant board reads now return board columns, placed issues, and backlog in user scope
- assistant issue comment/reply mutations now support confirmation flow
- browser coverage exists for assistant-created issue comments and replies
- browser coverage exists for assistant board discovery and board context reads
- Dusk owner and portal workflow tests were hardened to use more stable input/login patterns
- assistant now receives structured current page context
- issue and board pages can be auto-primed into assistant page context on the backend
- assistant debug now shows page context and richer timeline information

Key files:

- `app/AI/AssistantConversationService.php`
- `app/AI/AssistantToolRegistry.php`
- `app/AI/AssistantToolExecutor.php`
- `app/AI/ConfiguredFakeAssistantModelClient.php`
- `app/Http/Controllers/AssistantController.php`
- `app/Http/Controllers/AssistantConfirmationController.php`
- `resources/js/components/assistant/assistant-panel.tsx`
- `tests/Browser/fixtures/assistant-model-responses.json`

## Latest Verified Test Status

These were the latest successful runs as of this handoff.

### Feature / Normal Tests

Command:

```bash
php artisan test tests/Feature/Clients tests/Feature/Finance tests/Feature/Projects tests/Feature/Tracking tests/Feature/Permissions tests/Feature/Assistant/AssistantFlowTest.php
```

Result:

- feature tests are passing across clients, finance, projects, tracking, permissions, and assistant targeted files

### Frontend Checks

Command:

```bash
npm run types:check && npm run lint:check && npm run build
```

Result:

- passed

### Browser Suite

Command:

```bash
composer run test:browser -- tests/Browser/ExampleTest.php tests/Browser/OwnerWorkflowTest.php tests/Browser/PortalBoardWorkflowTest.php tests/Browser/IssueWorkflowTest.php
```

Result:

- `14 passed`

Notes:

- `OwnerWorkflowTest.php` had a serial-suite flake earlier because it depended on UI login in multiple tests.
- That was fixed by keeping only one dedicated login test and using `loginAs(...)` for the other owner workflow cases.
- The full serial browser suite passed after that change.

## Important Files To Read First In A New Session

### Intent / Docs

- `AGENTS.md`
- `docs/README.md`
- `docs/domain/core-model.md`
- `docs/permissions/scopes.md`
- `docs/ai/central-ai.md`
- `docs/tracking/issues.md`
- `docs/tracking/boards.md`
- `docs/working/sprint-1.md`
- this handoff file

### Backend

- `routes/web.php`
- `app/Models/User.php`
- `app/Support/WorkspaceAccess.php`
- `app/Http/Middleware/EnsurePlatformOwner.php`
- `app/Http/Controllers/ClientController.php`
- `app/Http/Controllers/ClientMembershipController.php`
- `app/Http/Controllers/ProjectController.php`
- `app/Http/Controllers/FinanceController.php`
- `app/Http/Controllers/IssueController.php`
- `app/Http/Controllers/IssueCommentController.php`
- `app/Http/Controllers/ClientStatusController.php`
- `app/Actions/Clients/`
- `app/Actions/Projects/`
- `app/Actions/Finance/`
- `app/Actions/Tracking/`
- `app/AI/AssistantToolRegistry.php`
- `app/AI/AssistantToolExecutor.php`

### Frontend

- `resources/js/components/app-sidebar.tsx`
- `resources/js/components/app-header.tsx`
- `resources/js/layouts/client-workspace-layout.tsx`
- `resources/js/components/assistant/assistant-panel.tsx`
- `resources/js/components/crud/crud-page.tsx`
- `resources/js/components/crud/dynamic-form.tsx`
- `resources/js/components/crud/data-table.tsx`
- `resources/js/components/crud/filter-bar.tsx`
- `resources/js/components/crud/action-dropdown.tsx`
- `resources/js/components/forms/repeatable-editors.tsx`
- `resources/js/pages/clients/show.tsx`
- `resources/js/pages/clients/edit.tsx`
- `resources/js/pages/issues/show.tsx`
- `resources/js/pages/issues/index.tsx`
- `resources/js/pages/boards/show.tsx`
- `resources/js/pages/clients/members/index.tsx`
- `resources/js/pages/projects/index.tsx`
- `resources/js/pages/finance/transactions.tsx`
- `resources/js/pages/finance/invoices.tsx`
- `resources/js/pages/clients/statuses.tsx`

### Tests

- `tests/Feature/Assistant/AssistantFlowTest.php`
- `tests/Feature/Permissions/ScopeAccessTest.php`
- `tests/Feature/Clients/ClientPortalVisibilityTest.php`
- `tests/Feature/Clients/ClientManagementTest.php`
- `tests/Feature/Clients/ClientMembershipTest.php`
- `tests/Feature/Clients/ClientStatusManagementTest.php`
- `tests/Feature/Projects/ProjectManagementTest.php`
- `tests/Feature/Finance/FinanceManagementTest.php`
- `tests/Feature/Tracking/IssueManagementTest.php`
- `tests/Feature/Tracking/BoardAccessTest.php`
- `tests/Browser/OwnerWorkflowTest.php`
- `tests/Browser/PortalBoardWorkflowTest.php`
- `tests/Browser/IssueWorkflowTest.php`
- `tests/Browser/fixtures/assistant-model-responses.json`

## What Was Just Finished

The latest major implementation stretch was not one isolated feature. It was a broad architecture pass across scope, client portal direction, AI observability, and shared CRUD patterns.

That included:

- centralized scope/capability logic through `WorkspaceAccess`
- platform-only middleware and scope-aware top-level routing
- client portal perspective work:
    - client-scoped users now enter their client workspace instead of a platform overview
    - client portal users no longer receive platform-wide nav/routes by default
    - internal owner-only client profile fields are hidden from client-scoped users
- client workspace expansion:
    - overview
    - members
    - projects
    - issues
    - boards
    - statuses
    - finance
- dedicated create/edit pages replacing inline index-page forms across major CRUD surfaces
- shared CRUD component upgrades:
    - section-based forms
    - sticky form action bar
    - selection-capable data tables
    - row actions
    - bulk actions bar with drop-up
    - confirmed deletes
    - server-backed search/sort
    - pagination and sortable headers
- richer client model groundwork:
    - origin
    - social links
    - tags
    - phone numbers
- assistant improvements:
    - page context awareness
    - auto-primed issue/board context
    - richer debug timeline/grouping
    - better markdown and table rendering

## Current Position

The codebase is in a good state to continue.

The current baseline is:

- clients/projects/finance/issues/boards/assistant all exist in a working v1 shape
- the app now has a centralized scope/capability foundation via `WorkspaceAccess`
- the client portal perspective is documented in stable docs and partially reflected in UI/scope behavior
- client-scoped users no longer get platform-wide nav/routes by default
- the client workspace is now the main client-scoped product surface
- major CRUD surfaces are no longer index-page inline forms; create/edit now exist as dedicated pages across the main working domains
- clients, projects, finance, issues, memberships, and client statuses now largely follow the same management-screen pattern:
    - dedicated create/edit pages
    - list-first indexes
    - row actions
    - bulk actions
    - delete confirmation
    - server-backed search/sort
    - pagination
- nested issue comments/replies now exist
- major owner/portal/assistant browser flows are covered and passing
- assistant issue create/update exists
- assistant issue discussion read exists
- assistant issue detail read exists
- assistant board list read exists
- assistant comment/reply support now exists
- assistant board context read exists

There is no immediate blocker in the verified current state.

## Current Architecture Notes

### Scope / Access

- The current central scope model is `App\Support\WorkspaceAccess`.
- `User` convenience methods delegate to it, but fresh work should prefer thinking in terms of centralized capabilities rather than inventing new ad hoc checks.
- Shared frontend auth props now expose:
    - `auth.user.capabilities`
    - `auth.user.portal_context`
- Platform-only sections currently include top-level:
    - finance
    - tracking
    - CMS
    - AI settings
    - reusable client tags

### Client Portal Boundary

- A client portal user should experience the app as their workspace with Nour.
- A portal user should not be shown owner-only relationship intelligence.
- The client overview page now intentionally hides internal profile data for client-scoped users.
- The dedicated client edit page is currently internal/owner-only.

### Shared CRUD Layer

- `DynamicForm` now supports section-based layouts and is the intended default for create/edit pages.
- `DataTable` now supports:
    - selection
    - bulk actions
    - row actions
    - sortable headers
    - pagination controls
- `FilterBar` is now intended to hold only actual filters/search, not random mixed controls.
- Current direction is: sorting should happen from table headers, not dropdowns in the filter bar.

### Current CRUD Coverage

The strongest management surfaces right now are:

- clients
- client members
- projects
- finance transactions
- finance invoices
- issues
- client statuses
- client boards

The weaker or less-finished nested areas are:

- client finance/details polish
- richer board operations beyond base CRUD
- board columns and board memberships management surfaces
- attachments/image workflows
- remaining structured repeatable editors outside client profile

### AI Runtime State

- The assistant now has:
    - thread history
    - confirmations
    - page context
    - debug timeline
    - grouped tool/model/cost sections
    - better markdown rendering
    - table styling
- The AI system still has more work to become a truly "well-oiled machine":
    - run-backed confirmation continuity is not fully complete everywhere
    - live backend-driven progress is still not there
    - richer execution records can still improve further

## Best Next Step

The best next step is still to keep pushing the central CRUD sprint into the remaining nested management surfaces and then finish the shared table/form polish.

Why this is the best continuation:

- the app itself was previously much weaker than the AI subsystem
- the shared CRUD/table/form system is now finally getting coherent
- continuing this work gives the product a stronger operational backbone across domains
- the remaining lagging nested surfaces are more urgent than adding more AI breadth right now

### Recommended Next TDD Slice

1. Continue the same CRUD pattern into the next remaining nested areas, likely:
    - board columns and board memberships management
    - the next lagging client-nested management surface after boards base CRUD
2. Keep using dedicated create/edit pages instead of inline index-page forms.
3. Keep list pages as management screens with:
    - server-backed search
    - server-backed sorting
    - pagination
    - row actions
    - bulk actions
    - delete confirmation
4. Strengthen the shared table and filter system rather than improvising per page.
5. Only return to deeper AI breadth after the core app surfaces are in a much stronger state.

### More Concrete Next Targets

If a fresh model needs clearer direction, the most sensible next implementation order is:

1. Board columns / board memberships management surfaces
    - dedicated create/edit pages where needed
    - list-first indexes
    - row/bulk actions
    - delete confirmation
    - server-backed search/sort/pagination
2. remaining nested management areas that still lag behind the CRUD standard
3. table/filter polish and consistency cleanup
4. only after that, resume deeper AI breadth or broader domain expansion

## Other Good Next Steps After That

If assistant comment/reply parity is done, likely next candidates are:

1. Issue attachments
2. Issue links
3. Boards CRUD/management polish
4. More reusable CRUD primitives if a domain needs them
5. Assistant tools for broader board operations after the app surfaces are stronger

## Things That Are Still Missing From The Broader Vision

Not exhaustive, but still absent or incomplete:

- attachments on issues
- links on issues
- assistant tools for broader board operations
- CMS implementation
- branding/theme pass beyond the current baseline
- any old-data import work
- broader domain expansion beyond the current v1 foundations

## Testing Guidance For The Next Model

When continuing, do not skip the TDD loop.

Suggested pattern:

1. add failing feature test first
2. implement minimum backend code
3. run targeted feature file
4. if frontend changes are involved, run:

```bash
npm run types:check
npm run lint:check
npm run build
```

5. add or update Dusk coverage if the flow is user-critical
6. run the smallest relevant browser file first
7. then run the current serial browser suite

Current working browser command:

```bash
composer run test:browser -- tests/Browser/ExampleTest.php tests/Browser/OwnerWorkflowTest.php tests/Browser/PortalBoardWorkflowTest.php tests/Browser/IssueWorkflowTest.php
```

## 2026-04-07 Continuation Update

This session continued the central CRUD sprint from the previous handoff without re-planning the roadmap.

What changed:

- `clients/{client}/boards` was upgraded into a real management surface.
- Board visibility on the client boards index now follows centralized `WorkspaceAccess` rules instead of relying only on project access.
- Client `member` users now only see boards they can actually access.
- Client `viewer` users still get read access to boards they can reach through project membership.
- Client `owner` / `admin` users now have dedicated board create/edit/delete flows.
- Board create/edit remain on dedicated pages. No inline create/edit form was reintroduced on the index page.
- The board list now has:
    - server-backed search
    - server-backed sorting
    - pagination
    - row actions
    - bulk actions
    - delete confirmation
- Scope decisions for board visibility stay centralized through `App\Support\WorkspaceAccess`.
- The client workspace / portal framing was preserved. No internal client profile fields were added to the board pages.

Primary implementation files:

- `app/Support/WorkspaceAccess.php`
- `app/Http/Controllers/ClientController.php`
- `app/Http/Controllers/BoardController.php`
- `app/Actions/Boards/`
- `resources/js/pages/clients/boards.tsx`
- `resources/js/pages/boards/create.tsx`
- `resources/js/pages/boards/edit.tsx`
- `routes/web.php`
- `tests/Feature/Tracking/BoardAccessTest.php`

Latest commands run in this continuation:

### Feature / Normal Tests

```bash
php artisan test tests/Feature/Tracking/BoardAccessTest.php
```

Result:

- passed (`9 passed`)

### Frontend Checks

```bash
npm run types:check
npm run lint:check
```

Result:

- both passed

### Browser Verification Attempt

Commands attempted:

```bash
php artisan dusk tests/Browser/PortalBoardWorkflowTest.php
APP_URL=http://127.0.0.1:8001 php artisan serve --host=127.0.0.1 --port=8001
APP_URL=http://127.0.0.1:8001 php artisan dusk tests/Browser/PortalBoardWorkflowTest.php
```

Observed result:

- browser verification was attempted but not completed successfully in this session
- initial run failed with connection-refused behavior against the app URL
- rerun with an explicit local server got past connection refusal, but the existing browser file still failed in its current environment with `/overview` wait timeouts and an assistant interaction failure
- no new browser coverage was added in this continuation

What remains after this slice:

1. board columns and board memberships still do not have full CRUD management surfaces
2. board show is functional, but still more bespoke than the stronger CRUD screens
3. richer board operations and assistant board mutations are still future work
4. broader board-related browser coverage likely needs a clean follow-up once the Dusk environment is stable again

Recommended next step from this new state:

- continue the central CRUD sprint into the next weak nested management surface after boards base CRUD, most likely board columns / memberships management or the next lagging nested client-management area, while keeping `WorkspaceAccess`, dedicated pages, and the client-portal perspective intact

## Dusk / Browser Notes

- Use `loginAs(...)` in Dusk when the test is not specifically about the login screen.
- Keep one dedicated browser test for login itself.
- The assistant composer is a controlled React textarea.
- For assistant Dusk tests, raw `type()` was unreliable.
- The stable pattern is the existing value-tracker script in:
    - `tests/Browser/OwnerWorkflowTest.php`
    - `tests/Browser/IssueWorkflowTest.php`
- Reuse that pattern for any new assistant-composer browser tests.

## Known Permission Model In Code

From `app/Models/User.php`:

- `isPlatformOwner()`
- `canAccessClient(Client $client)`
- `canManageClient(Client $client)`
- `hasProjectAccess(Project $project)`
- `canManageProject(Project $project)`
- `canAccessBoard(Board $board)`
- `canMoveIssueOnBoard(Board $board)`
- `canCommentOnIssue(Issue $issue)`

Important current behavior:

- `canManageProject()` is currently admin/owner/platform only.
- `canCommentOnIssue()` is more permissive than issue update:
    - it allows project-access members
    - it still denies viewers

That distinction is intentional for the current implementation and is documented in `docs/working/sprint-1.md`.

## Known Dirty-Worktree Reality

The repo is mid-migration away from starter Laravel team assumptions.

This means:

- many files show as deleted because the team system is being removed
- many files show as untracked because the new `devnotes` foundation has not been committed yet
- do not treat the dirty worktree as accidental
- do not reset or clean it

## Recommended Session Start For The Next Model

If context is reset, the next model should start with:

1. read `AGENTS.md`
2. read:
    - `docs/README.md`
    - `docs/permissions/scopes.md`
    - `docs/ai/central-ai.md`
    - `docs/tracking/issues.md`
    - `docs/working/sprint-1.md`
    - this file
3. inspect:
    - `app/Support/WorkspaceAccess.php`
    - `app/Http/Middleware/EnsurePlatformOwner.php`
    - `app/AI/AssistantToolRegistry.php`
    - `app/AI/AssistantToolExecutor.php`
    - `app/Http/Controllers/ClientController.php`
    - `app/Http/Controllers/ClientMembershipController.php`
    - `app/Http/Controllers/ProjectController.php`
    - `app/Http/Controllers/FinanceController.php`
    - `app/Http/Controllers/IssueController.php`
    - `resources/js/components/crud/`
    - `resources/js/layouts/client-workspace-layout.tsx`
    - `resources/js/pages/clients/`
    - `resources/js/pages/projects/`
    - `resources/js/pages/finance/`
    - `resources/js/pages/issues/`
    - `tests/Feature/Assistant/AssistantFlowTest.php`
    - `tests/Feature/Permissions/ScopeAccessTest.php`
    - `tests/Feature/Clients/ClientPortalVisibilityTest.php`
    - `tests/Feature/Clients/ClientManagementTest.php`
    - `tests/Feature/Clients/ClientMembershipTest.php`
    - `tests/Feature/Clients/ClientStatusManagementTest.php`
    - `tests/Feature/Projects/ProjectManagementTest.php`
    - `tests/Feature/Finance/FinanceManagementTest.php`
    - `tests/Feature/Tracking/BoardAccessTest.php`
    - `tests/Feature/Tracking/IssueManagementTest.php`
4. continue the central CRUD sprint using TDD, starting with the weakest remaining nested management surface

## Short Summary

Current position:

- the v1 foundation is real and working
- centralized scope is now real and documented
- client portal perspective is now real and documented
- the shared CRUD system is much stronger than before
- the assistant is much stronger than before, but the app still benefits more from continuing CRUD/domain polish first
- the next high-value continuation is the next weak nested management surface, not random isolated feature work

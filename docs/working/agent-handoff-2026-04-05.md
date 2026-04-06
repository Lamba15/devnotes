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

- `Overview` is the post-login landing page and is intentionally blank in v1.
- Top nav is:
    - `Overview`
    - `Clients`
    - `Finance`
    - `CMS`
- There is no team system.
- `Clients` are the collaborative root.
- `Projects` are nested under `Clients`.
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
- Minimum client creation is in place.
- Client memberships exist.
- Direct client user creation is implemented.
- No email invitation flow is implemented.

Key files:

- `app/Http/Controllers/ClientController.php`
- `app/Http/Controllers/ClientMembershipController.php`
- `app/Actions/Clients/`
- `resources/js/pages/clients/`

### Projects

- Projects are nested under clients.
- Project creation exists.
- Explicit `project_memberships` exist.

Key files:

- `app/Http/Controllers/ProjectController.php`
- `app/Actions/Projects/`
- `resources/js/pages/projects/`

### Finance

- Transactions are linked to projects.
- Invoices are linked to projects.
- Finance UI baseline exists.
- Assistant invoice/transaction tooling exists.

Key files:

- `app/Http/Controllers/FinanceController.php`
- `app/Http/Controllers/TransactionController.php`
- `app/Http/Controllers/InvoiceController.php`
- `app/Actions/Finance/`
- `resources/js/pages/finance/`

### Tracking: Issues / Boards

- Issue list/create/show/update exists.
- Boards exist.
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
php artisan test tests/Feature/Tracking tests/Feature/Assistant/AssistantFlowTest.php
```

Result:

- `42 passed`

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
- `app/Http/Controllers/IssueController.php`
- `app/Http/Controllers/IssueCommentController.php`
- `app/Actions/Tracking/`
- `app/AI/AssistantToolRegistry.php`
- `app/AI/AssistantToolExecutor.php`

### Frontend

- `resources/js/components/assistant/assistant-panel.tsx`
- `resources/js/pages/issues/show.tsx`
- `resources/js/pages/issues/index.tsx`
- `resources/js/pages/boards/show.tsx`
- `resources/js/pages/finance/index.tsx` or equivalent finance page entry
- `resources/js/components/crud/`

### Tests

- `tests/Feature/Assistant/AssistantFlowTest.php`
- `tests/Feature/Tracking/IssueManagementTest.php`
- `tests/Feature/Tracking/BoardAccessTest.php`
- `tests/Browser/OwnerWorkflowTest.php`
- `tests/Browser/PortalBoardWorkflowTest.php`
- `tests/Browser/IssueWorkflowTest.php`
- `tests/Browser/fixtures/assistant-model-responses.json`

## What Was Just Finished

The last completed implementation slice was assistant tracking read-surface expansion.

That included:

- failing assistant feature tests first for richer reads and scoped board discovery
- assistant tool registry and executor support for:
    - `get_issue_discussion`
    - `get_issue_detail`
    - `list_accessible_boards`
    - `get_board_context`
- assistant UI rendering for:
    - `issue_discussion`
    - `issue_detail`
    - `board_list`
    - `board_context`
- browser fake-model rules for assistant board discovery/context reads
- Dusk coverage for assistant-created issue comments and replies
- Dusk coverage for assistant board discovery/context reads
- full tracking + assistant feature regression
- full serial browser regression

## Current Position

The codebase is in a good state to continue.

The current baseline is:

- clients/projects/finance/issues/boards/assistant all exist in a working v1 shape
- nested issue comments/replies now exist
- major owner/portal/assistant browser flows are covered and passing
- assistant issue create/update exists
- assistant issue discussion read exists
- assistant issue detail read exists
- assistant board list read exists
- assistant comment/reply support now exists
- assistant board context read exists

There is no immediate blocker in the verified current state.

## Best Next Step

The best next step is to extend assistant parity into board mutations.

Why this is the best continuation:

- issue discussion parity is now in place
- issue detail reads are now in place
- board discovery/context reads are now in place
- board context reads are now in place
- the docs say meaningful capabilities should be exposed as tools
- board movement is already a real user capability in the product
- assistant board mutation support is the clearest remaining parity gap in tracking
- this continues the same tracking slice instead of switching domains too early

### Recommended Next TDD Slice

1. Add failing assistant feature tests for a board mutation tool, for example:
    - move an issue onto a board column
    - respect board access rules
    - respect move permissions separately from read permissions
    - require confirmation because it is a mutation
2. Implement assistant registry and executor support.
3. Reuse the existing board issue movement behavior instead of duplicating rules.
4. Update assistant panel rendering if a board-move result type is needed.
5. Add browser fake-model coverage for the confirmation flow if the slice lands cleanly.

## Other Good Next Steps After That

If assistant comment/reply parity is done, likely next candidates are:

1. Issue attachments
2. Issue links
3. Assistant tools for broader board operations
4. Assistant read tools for richer board summaries if needed
5. More reusable CRUD primitives if a domain needs them

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
    - `app/AI/AssistantToolRegistry.php`
    - `app/AI/AssistantToolExecutor.php`
    - `app/Http/Controllers/BoardController.php`
    - `app/Http/Controllers/BoardIssueMovementController.php`
    - `app/Http/Controllers/IssueController.php`
    - `resources/js/pages/issues/show.tsx`
    - `resources/js/pages/boards/show.tsx`
    - `tests/Feature/Assistant/AssistantFlowTest.php`
    - `tests/Feature/Tracking/BoardAccessTest.php`
4. continue with assistant board mutation parity using TDD

## Short Summary

Current position:

- the v1 foundation is real and working
- assistant issue discussion parity is implemented and verified
- assistant issue detail reads are implemented and verified
- assistant board discovery reads are implemented and verified
- assistant board-context reads are implemented and verified
- the full current serial browser suite passes
- the next high-value continuation is assistant board mutation parity

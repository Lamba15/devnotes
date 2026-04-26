# Boards

## Model

- Boards are views over project issues.
- Boards are not the source of truth for issue existence.
- A project has an issue list independent of boards.
- An issue can appear on many boards.
- An issue does not need to be on a board to exist.
- Boards can define any columns.

## Backlog

- Backlog is not a separate entity.
- By default, a board's backlog is the set of project issues that are not currently placed on **any** board. This keeps each board's backlog focused on truly unplaced work and prevents one board's in-progress issues from polluting the backlog of sibling boards on the same project.
- The board UI exposes an opt-in toggle ("Include issues placed on other boards") that switches the backlog to the broader scope: project issues that are not placed on **this** board, regardless of whether they appear on other boards. That broader scope is the recovery path for moving an existing issue from one board to another. In the controller this is driven by the `show_all_backlog` query string flag; the AI `get_board_context` tool exposes the same option as `include_issues_on_other_boards`.
- Issues placed on the current board are never part of that board's backlog under either scope.
- In the board UI, backlog is presented as a hidden drawer/dock rather than a permanent visible lane.
- That hidden backlog presentation is a UI choice only and does not change the domain rule that backlog is computed per board.

## Columns And Status

Columns can be one of two kinds:

- status-updating columns
- non-status-updating columns

Rules:

- If a column is status-updating, moving an issue into it updates the issue status.
- Moving an issue into a status-updating column is equivalent to editing the issue and changing its status.
- If the issue status changes somewhere else and the current board placement becomes invalid, the issue should fall back out of the board placement and return to that board's backlog.
- If a column is non-status-updating, moving an issue there does not change the issue status.
- Board cards stay compact; exact issue timestamps live in quick view and issue detail rather than on every card.
- A board lane mapped to `done`, or clearly named as a done/completed lane, may use a denser overlapping card-stack presentation than active work lanes.
- That done-lane compaction is a UI choice only. Completed issues should remain directly visible on the board and still support the same quick-view and move interactions as other board cards.

## AI Tooling

- AI should be able to list boards the active user can access.
- AI should be able to read board context including columns, placed issues, and computed backlog.
- AI should be able to create, update, and delete boards only within the active user's normal permissions and with explicit confirmation before mutations execute.
- AI board mutations should use the same board rules as the regular app surface, including status-updating column requirements.

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
- For a given board, backlog is the set of project issues that are not currently placed on that board.

## Columns And Status

Columns can be one of two kinds:

- status-updating columns
- non-status-updating columns

Rules:

- If a column is status-updating, moving an issue into it updates the issue status.
- Moving an issue into a status-updating column is equivalent to editing the issue and changing its status.
- If the issue status changes somewhere else and the current board placement becomes invalid, the issue should fall back out of the board placement and return to that board's backlog.
- If a column is non-status-updating, moving an issue there does not change the issue status.

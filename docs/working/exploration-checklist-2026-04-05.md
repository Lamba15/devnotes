# Exploration Checklist

Use this list to manually inspect the current sprint progress in the browser.

## Assistant Read Flows

1. Log in and open the global `Assistant` panel from `/overview`.
2. Ask `List my boards`.
3. Ask `Show board context for board <id>` using a board id returned by the assistant.
4. Compare the assistant board context result with the actual board page UI.
5. Open an issue page and compare:
    - the issue detail page
    - `get_issue_detail` style assistant output
    - `get_issue_discussion` style assistant output

## Assistant Mutation Flows

1. Try assistant issue creation and confirm it.
2. Try assistant issue comment creation and confirm it.
3. Try assistant issue reply creation and confirm it.
4. Try assistant board movement and confirm it.
5. Verify the assistant result cards after confirmation are understandable.

## Permission Checks

1. Verify a viewer can read board and issue context.
2. Verify a viewer cannot mutate issues or comments.
3. Verify a member can comment on issues.
4. Verify a member can only move board issues when they have board move access.

## Board Behavior Checks

1. Move an issue into a status-updating column.
2. Confirm the issue status changes with the move.
3. Confirm backlog and placed issues still match the board UI after moves.

## UX Notes To Look For

1. Any assistant prompt that feels too dependent on raw ids.
2. Any result card that is hard to scan.
3. Any mismatch between assistant read results and the normal page UI.
4. Any permission error that is confusing or too vague.

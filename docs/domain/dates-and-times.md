# Dates And Times

## Purpose

- The app distinguishes between exact moments in time and calendar-only dates.
- Timezone handling must be explicit and consistent across server storage, API payloads, and UI rendering.

## Field Categories

- **Instant**
    - A real moment that happened or was recorded.
    - Examples: `created_at`, `updated_at`, comment timestamps, audit timestamps, assistant timestamps.
- **Date-only**
    - A calendar date without a timezone shift.
    - Examples: `due_date`, invoice dates, transaction dates, birthdays, relationship dates.
- **Local-time-only**
    - Not currently used.
    - Reserved for future cases that represent a wall-clock time without a date.

## Storage Rules

- Instants are stored as UTC-backed timestamps on the server.
- Date-only fields are stored as SQL `date` values and represented as `YYYY-MM-DD`.
- Date-only fields must not be converted through a user timezone.

## API Rules

- Instants are serialized as ISO-8601 UTC strings with `Z`.
- Date-only values are serialized as `YYYY-MM-DD`.

## Rendering Rules

- Instants render in the active user's timezone.
- Date-only values render as calendar dates with no timezone conversion.

## Timezone Resolution

- First choice: saved `users.timezone`
- Second choice: browser timezone
- Last resort: `UTC`

The stored timezone should be an IANA timezone string such as `Africa/Cairo` or `America/New_York`.

## Formatting Rules

- Detailed timestamps use `DD MMM YYYY, HH:mm`
    - Example: `12 MAR 2026, 14:35`
- Compact date-only values use `DD MMM YYYY`
    - Example: `12 MAR 2026`

## Tracking UI

- Board cards stay compact and do not show created timestamps inline.
- Exact issue created timestamps are shown in issue quick view and issue detail.
- Discussion comment timestamps use the same instant formatting rules.

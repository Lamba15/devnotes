# Audit Logs

## Purpose

Audit logs track all user and system actions across the platform. They are viewable by platform owners in a dedicated page.

## What Gets Logged

Audit logs cover:

- All CRUD actions (create, update, delete) on domain entities
- Secret create, update, delete, and reveal actions
- Settings changes
- Attachment uploads and deletes
- Credit changes
- Authentication events (login, logout)
- AI assistant actions

## Log Structure

Each audit log entry records:

- `user_id` — the acting user (nullable for system actions)
- `event` — the action name (e.g. `client.created`, `issue.moved_on_board`)
- `source` — how the action was triggered (`manual_ui`, `api`, `assistant`)
- `subject_type` / `subject_id` — polymorphic reference to the affected entity
- `metadata_json` — additional context (e.g. `client_id` for cross-entity references)
- `before_json` / `after_json` — state snapshots for change tracking
- `created_at` — timestamp

For secret-related events:

- secret labels and owner references may be logged
- decrypted secret values must never be logged

## Filters

The audit log page uses drill-down filters following the standard filter pattern documented in [UI Architecture — Filters](./architecture.md#filters).

Available filters:

- **User** — filter by the acting user
- **Client** — filter by client (matches both direct Client subjects and logs with `client_id` in metadata)
- **Action** — filter by event name
- **Source** — filter by action source
- **Entity Type** — filter by subject type

All filters are drill-down: selecting one narrows the available options in all others.

A text search is also available and searches across event, source, subject type, and user name/email.

## UI Standards

- Each filter uses a `SearchableSelect` with a contextual Lucide icon
- Filters are displayed in a responsive grid (5 columns on large screens, 3 on medium, 2 on small)
- An active filter count badge shows how many filters are applied
- A "Clear filters" button appears when any filter is active
- Log entries show source icons (Bot for AI, Globe for API, User for manual)
- Event names are color-coded: green for creates, blue for updates, red for deletes
- Pagination preserves all active filter parameters

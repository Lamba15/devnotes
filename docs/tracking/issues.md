# Issues

## Position In The System

- Issues are first-class and do not depend on boards.
- An issue belongs to exactly one project.
- An issue can appear on many boards (via board issue placements).

## Database Fields

### Core Fields

| Field | Type | Notes |
|-------|------|-------|
| id | auto-increment | Primary key |
| project_id | FK to projects | Required. The owning project |
| title | string, max 255 | Required. The issue title |
| description | text, nullable | Optional long-form description |
| status | string, max 255 | Required. One of: todo, in_progress, done |
| priority | string, max 255 | Required. One of: low, medium, high |
| type | string, max 255 | Required. One of: task, bug, feature |
| assignee_id | FK to users, nullable | Optional. Who is assigned to this issue |

### Extended Fields

| Field | Type | Notes |
|-------|------|-------|
| due_date | date, nullable | Optional deadline for the issue |
| estimated_hours | string, nullable | Optional time estimate (e.g. "4", "2.5") |
| label | string, nullable | Optional freeform label (e.g. "frontend", "urgent") |

### System Fields

| Field | Type | Notes |
|-------|------|-------|
| created_at | timestamp | Record creation |
| updated_at | timestamp | Last modification |

## Relationships

| Relation | Type | Target | Notes |
|----------|------|--------|-------|
| project | belongsTo | Project | The owning project |
| assignee | belongsTo | User | Optional assigned user |
| comments | hasMany | IssueComment | Discussion thread |
| attachments | morphMany | Attachment | Polymorphic files and images |
| boardPlacements | hasMany | BoardIssuePlacement | Board positions |

## Current Capabilities

- Files and images can be attached to issues
- Comments exist with nested Reddit-style threading
- File attachments can be added to comments in the discussion
- Issues support due dates, time estimates, and labels
- Status, priority, and type are rendered with color-coded icons in the UI

## Comment Threading

- Replies are comments on comments.
- Replies can also have replies.
- Threading should behave more like Reddit-style nested discussion than a flat one-reply layer.
- Comments show user avatars and support file attachment uploads.

## Naming

- Prefer generic, clear terminology.
- Avoid branded planning language unless it is genuinely needed.
- Current preference is toward terms like issue, board, column, status, and backlog rather than terms like epic or story points.

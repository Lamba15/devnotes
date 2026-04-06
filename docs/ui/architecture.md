# UI Architecture

## Direction

The UI should strongly favor centralized reusable high-level components for repeated application patterns.

This is an intentional project preference, not an accident.

## Central Components

The system should lean on a small number of major reusable components such as:

- Dynamic form
- Data table
- Filter bar

These components should cover the majority of repeated CRUD-style and management surfaces in the application.

## Dynamic Form

The dynamic form is intended to be a major shared component.

Current direction:

- A single dynamic form should handle both create and edit flows by default.
- The same form definition should usually be reused for create and edit.
- Differences between create and edit should come mainly from initial values and small overrides where needed.
- The form should be reusable across many domains rather than reimplemented screen by screen.

## Form Definition Source

Form definitions should be shaped from both frontend and backend concerns, in the spirit of how Inertia connects server and client concerns.

Current direction:

- Frontend and backend should both participate in the form system.
- The frontend should render the form experience and reusable field system.
- The backend should remain authoritative for validation, persistence, permissions, and server-driven context.

## Data Table

The data table is intended to be another major shared component.

It should support:

- row selection
- bulk selection
- row actions
- bulk actions
- server sorting
- server filtering
- pagination

## Filters

Filtering should be handled through a central reusable filtering system.

The project prefers a dedicated reusable filter layer rather than rebuilding ad hoc filter UIs per page.

## Extensibility

The system should prefer extending the parent dynamic form and related central components so features can be reused later.

Current direction:

- If a new field type or repeated behavior is useful beyond one screen, it should be added to the shared component system.
- Escape hatches may exist, but the default preference is to improve the central component rather than fork patterns casually.

## General CRUD Shell

The project prefers one general page-shell pattern for CRUD-style screens.

Current direction:

- CRUD pages should share a common structural shell.
- Create, edit, and list flows should feel like one coherent system.
- Central reusable modals should exist for repeated interaction patterns such as:
  - confirmation modals
  - form modals
  - other repeatable modal workflows

## Creatable Selects

The UI should support creatable selects where appropriate.

Current direction:

- Some select fields should allow the user to type a new value directly from the form.
- When a new value is created in that select, it should become a reusable option elsewhere in the system.
- This is especially relevant for statuses and other owner-defined classifications.

## Constraint

Centralization is a deliberate strength, but it must not become an excuse to move business rules out of the backend.

- Laravel should remain authoritative for validation, authorization, and domain rules.
- Shared UI components should reduce repetition without becoming a substitute for application logic.

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

### SearchableSelect as Standard

The standard select input across the application is `SearchableSelect` — a custom component that replaces basic HTML selects and Radix Select dropdowns in all filter and form contexts where search is useful.

Standard features:

- Built-in search input that auto-focuses when the dropdown opens
- Optional leading icon (LucideIcon) for visual context
- Inline clear button (X) when a value is selected
- Focus ring styling consistent with the design system
- Keyboard support (Escape to close, click-outside to dismiss)
- A "no results" empty state when search matches nothing
- The unselected/reset option (e.g. "All users") appears at the top when no search query is active

### Drill-Down Filter Behavior

Filters should behave in a drill-down style by default where it makes sense.

Drill-down means:

- Selecting a value in one filter narrows the available options in all other filters.
- Each filter's options are computed by applying all other active filters except itself.
- This gives the user a progressive narrowing experience instead of showing stale or irrelevant options.

Backend implementation pattern:

- A shared `applyFilters()` method accepts an `$exclude` parameter.
- When computing options for a specific filter, all other filters are applied but the current filter is excluded.
- A `scopedQuery()` helper creates a fresh query with the appropriate exclusion.

### Clear Filters

- A "Clear filters" button should appear when any filter is active.
- It resets all filter values at once.
- Each individual SearchableSelect also supports clearing its own value via the inline X button.

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

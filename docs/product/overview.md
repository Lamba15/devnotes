# Product Overview

## Nature Of The Product

`devnotes` is a personal professional operating system.

It is centered on Nour's work and the systems around that work. It is not defined primarily as a project-management tool, a note-taking tool, or a Jira alternative, even though it may contain systems that cover some of those areas.

## Center

The center of the system is the owner's own professional operating space.

Domains such as clients, finance, website, CMS, skills, and tracking exist inside that operating space. Some are personal. Some are collaborative. Some are public-facing. Some reference each other.

## Product Language

- Use `Client` as the business-facing concept.
- Do not frame the product around `Organization` as the top-level user-facing concept.
- Tracking is one subsystem inside the larger OS.

## Perspective Rule

- `Client` is the owner's concept, not necessarily the portal user's concept.
- From Nour's perspective, the record is a `Client`.
- From the other side, the person using the workspace should usually experience it as their own work portal with Nour, not as "the client area" in a cold CRM sense.
- Internal modeling can still use `Client`, but user-facing scope, navigation, and copy should respect the portal user's perspective.
- When a portal user is inside a client-scoped workspace, the product should feel like:
    - their workspace
    - their projects
    - their boards
    - their issues
    - their finance context with Nour when relevant
      rather than a detached admin view of "a client record"

## Scope Philosophy

- The full product scope is intentionally broader than the first implementation scope.
- Not every future domain needs to be fully defined now.
- Stable intent should be written down when it becomes clear enough to matter.
- Unknown future capabilities should remain open rather than being prematurely specified.

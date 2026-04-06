# Sprint 1

## Goal

Establish the first usable structural slice of v1.

Sprint 1 should create the base system shape needed for the client domain and its first operational surfaces without trying to complete all of v1.

## Delivery Method

- Sprint 1 should be implemented with TDD rather than test-after.
- Preferred loop:
  - write a failing test
  - implement the minimum code to pass it
  - refactor safely
  - rerun feature tests
- Critical browser flows should also be covered during Sprint 1.
- Laravel Dusk is the intended browser-testing direction for Sprint 1.

## First Group

These things should be done together because they define the foundation for everything after them:

### 1. Workspace Structure

- top-level navigation shape
- `Overview` is the first page after the platform owner logs in
- `Overview` is intentionally blank in v1
- top-level v1 navigation is:
  - Overview
  - Clients
  - Finance
  - CMS
- Projects live inside Clients rather than as a top-level section in v1
- naming and information architecture for the first version

### 2. Client Foundation

- client entity shape
- client profile fields
- client accounts and portal access direction
- whether clients are active/inactive/archived
- minimum v1 client creation requires name and behavior
- behavior defaults to `normal`

### 3. Project Foundation

- what a project is in relation to a client
- every project belongs to exactly one client
- project lifecycle/state
- project visibility and membership rules
- project status fields should support creatable values rather than only fixed predefined options
- default project statuses start with:
  - active
  - paused
  - completed
  - archived

### 4. Permission Skeleton

- platform owner behavior
- client-level roles
- project-level access model
- minimal explicit permissions needed for Sprint 1

### 5. V1 Tracking Baseline

- project issue list
- board model
- column model
- issue baseline fields

### 6. Finance Baseline

- financial operations are connected to projects
- clients expose aggregated financial information through their related projects
- old financial and client data should be brought forward from the previous system for continuity
- first implementation should start with project-linked transactions and project-linked invoices

## Why These Are Grouped

These items must move together because:

- navigation depends on domain boundaries
- client/project modeling affects permissions
- permissions affect portal access and AI access
- tracking cannot be modeled cleanly until project boundaries are clear

## Not In Sprint 1

- full finance implementation
- full CMS implementation
- advanced AI execution flows
- all future portal features

## Testing Direction

- PHPUnit feature tests should cover the backend and policy behavior for the Sprint 1 slice.
- Laravel Dusk should cover the first critical owner, portal, and assistant browser flows.
- Browser coverage should include at least:
  - login landing on blank `Overview`
  - creating a client
  - creating a project inside a client
  - using the assistant for a confirmed mutation
  - confirming read-only and restricted portal behaviors

## Remaining Open Questions

- What exact membership schema should client access use in the database and UI?
- Is project access granted separately from client membership, or is there a default inheritance rule?
- What is the exact import strategy for old client and finance data?

## Current Implementation Assumptions

- Until a dedicated platform-owner identity marker exists, authenticated accounts with no client memberships are treated as platform-scope accounts in the current implementation.
- The current issue implementation stores `status`, `priority`, and `type` as strings until the reusable classification catalogs are locked.
- The current issue implementation limits issue create and update actions to platform-scope users and client `owner` or `admin` roles until broader member edit rules are explicitly defined.
- The current issue comment implementation treats commenting and replying as normal project work: platform-scope users, client `owner`/`admin`, and project-access `member` users may comment, while `viewer` users remain read-only.

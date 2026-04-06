# Product Scope

## Known Domains

The system currently has these known product domains:

- Clients
- Finance
- CMS

There are also additional future domains that are intentionally left outside the current planning scope.

## Clients

`Clients` is a major product domain.

Current known facts:

- Clients are part of the owner's OS.
- Clients are not the root of the whole product.
- A client can have accounts inside the system.
- A client can have its own portal inside the system.
- A client can add its own people to its own portal.
- Client accounts belong to a client.
- Client users are created directly inside the system rather than through email invitations.
- The platform owner or an authorized client admin creates the user account, assigns it to the client, and sets the initial credentials.
- That user then logs in normally with their credentials.
- Roles exist inside the client portal.
- Current client portal roles are:
  - owner
  - admin
  - member
  - viewer
- Role meaning currently is:
  - owner: effectively admin
  - admin: can do everything inside the client scope
  - member: can view and perform normal working actions such as moving tickets on boards they are assigned to
  - viewer: view only
- Portal users only see projects and issues that belong to their client.
- Issue tracking is one known subsystem inside the client/project space.
- Client records are intended to be rich and flexible, with many optional fields and a small required core.
- Membership is created directly by creating the user and attaching that user to the client.
- The remaining open implementation questions are things like:
  - whether project access is granted automatically from client membership or assigned separately

The full scope of the client domain is intentionally not fully specified yet.

## Finance

`Finance` is a major product domain.

Current known facts:

- Finance exists outside the client scope, even though it can reference clients.
- Known finance concerns include invoices, transactions, and transaction categories.
- Financial operations should connect to projects.
- Clients expose aggregated financial information through their related projects.
- The first concrete finance rule to implement is:
  - transactions belong to projects
  - invoices belong to projects

## CMS

`CMS` is a known product domain.

Current known facts:

- CMS includes things like public website content.
- CMS may include skills, feedback, and related public/profile content later.

## Outside Current Planning Scope

- There are additional future parts of the OS beyond the currently named domains.
- Those parts are intentionally outside the scope of current planning.
- They should remain open until they become clear enough to define.

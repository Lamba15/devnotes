# Navigation And Client Rebuild

## Why

The current app structure is too flat for the agreed product shape.

Problems:

- major domains appear as single links instead of expandable areas
- `Clients` is still under-modeled relative to the docs
- `Finance` is still one page instead of a domain with real subsections
- `Tracking` exists in implementation but not yet as a first-class top-level section
- the current shell does not yet communicate the broader OS structure

## Agreed Direction

### Navigation

The left sidebar should move from flat links to expandable domain sections.

Target navigation structure:

- Overview
- Clients
    - Clients
    - Members
    - Tags
- Tracking
    - Issues
    - Boards
    - Statuses
- Finance
    - Transactions
    - Invoices
    - Categories
- CMS
    - Pages
    - Skills
    - Feedback
- AI
    - Assistant
    - AI settings

Not every child page needs full implementation immediately, but the structure should exist.

### Clients

Client records should support the full intended field set even when most fields are optional.

Current known client fields from docs:

- image
- name
- email
- tags
- country of origin
- industry
- numbers
- attachments
- first met
- origin
- notes
- address
- behavior
- social media
- birthday

Optional means implemented but not always required.

## Execution Order

### Slice 1

- write this plan
- implement expandable sidebar sections
- split Finance and Tracking into child routes/pages

### Slice 2

- lock client storage shape
- add missing client schema pieces
- document which fields are columns, JSON, and related tables

### Slice 3

- rebuild Clients pages on the stronger shared CRUD shell
- add richer client detail/edit sections

### Slice 4

- finish Finance subsections
- finish Tracking subsections

## Client Storage Recommendation

Use a hybrid model.

### Direct columns

- `name`
- `email`
- `behavior_id`
- `image_path`
- `industry`
- `country_of_origin`
- `birthday`
- `date_of_first_interaction`
- `origin`
- `notes`

### JSON fields

- `address_json`
- `social_links_json`

### Related tables

- `client_phone_numbers`
- `client_tags`
- `client_attachments`

## First Implementation Slice

This document starts with the lowest-risk highest-leverage change:

1. navigation hierarchy
2. expandable sidebar behavior
3. finance child pages
4. tracking child pages

The client rebuild follows after this navigation layer is real.

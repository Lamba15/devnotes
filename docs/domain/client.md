# Client

## Direction

Client records should support a small required core and many optional attributes.

The intent is not a narrow CRM card. A client record should be able to hold a rich working profile over time.

## Perspective Note

- `Client` is still the correct domain term for modeling from the owner's side.
- But when the other side logs in, the system should not feel like they are browsing a record inside someone else's CRM.
- The client-scoped workspace should be shaped as their collaborative work portal with Nour.
- That means the client domain should not stop at profile data. It should gather the work that matters to them in one place, such as:
    - members
    - projects
    - issues
    - boards
    - statuses
    - finance context when appropriate

## Current Known Fields

Current known client fields or groups include:

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

## Field Notes

- Tags are freeform descriptors such as personality, working style, scale, or other owner-defined labels.
- Numbers may be more than one value.
- Attachments should be grouped.
- Notes may be grouped rather than limited to a single text field.
- Origin refers to how the client relationship started, such as freelancing, family, friends, or other owner-defined sources.

## Modeling Direction

- Only a small subset of fields should be required.
- Most client fields should be optional.
- The record should be extensible enough to reflect real working relationships without forcing every client into the same narrow structure.
- The client workspace should include both:
    - rich profile data
    - nested work surfaces relevant to that client relationship

## Minimum V1 Client Creation

The minimum client creation requirement in v1 is:

- name
- behavior

System fields such as `created_at` and `updated_at` are also part of the record.

Current direction:

- `name` is required
- `behavior` is required and defaults to `normal`
- the rest of the client profile is optional at creation time

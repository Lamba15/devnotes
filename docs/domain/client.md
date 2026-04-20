# Client

## Direction

Client records should support a small required core and many optional attributes.

The intent is not a narrow CRM card. A client record should be able to hold a rich working profile over time.

## Perspective Note

- `Client` is still the correct domain term for modeling from the owner's side.
- But when the other side logs in, the system should not feel like they are browsing a record inside someone else's CRM.
- The client-scoped workspace should be shaped as their collaborative work portal with Nour.
- The client dashboard must use the client's perspective for copy and priority, not a filtered copy of the platform-owner dashboard.
- For client users, finance should lead with what they have paid, what they have been invoiced, and their current running account before broader operational metrics.
- That means the client domain should not stop at profile data. It should gather the work that matters to them in one place, such as:
    - members
    - projects
    - issues
    - boards
    - statuses
    - finance context when appropriate

## Current Known Fields

### Core Fields (Required)

| Field | Type | Notes |
|-------|------|-------|
| name | string, max 255 | Required. The display name of the client |
| behavior_id | FK to behaviors | Required. Defaults to "normal". Describes the working style classification |

### Profile Fields (Optional)

| Field | Type | Notes |
|-------|------|-------|
| email | string, email | Primary contact email |
| image_path | string, nullable | Profile picture stored via public disk |
| country_of_origin | string, max 255 | Where the client is based |
| industry | string, max 255 | Business sector or field |
| address | text, nullable | Physical or mailing address |
| birthday | date, nullable | Client birthday for relationship tracking |
| date_of_first_interaction | date, nullable | When the relationship started |
| origin | string, max 255 | How the relationship started (freelancing, referral, friends, family, etc.) |
| notes | text, nullable | Free-form relationship notes visible only to platform owner |

### Structured Data (Optional)

| Field | Type | Notes |
|-------|------|-------|
| social_links_json | JSON array | Array of `{label, url}` objects for social media profiles |
| phone_numbers | hasMany PhoneNumber | Multiple phone numbers with optional labels |
| tags | morphToMany Tag | Freeform descriptors like personality, working style, scale |

### System Fields

| Field | Type | Notes |
|-------|------|-------|
| id | auto-increment | Primary key |
| created_at | timestamp | Record creation |
| updated_at | timestamp | Last modification |

## Relationships

| Relation | Type | Target | Notes |
|----------|------|--------|-------|
| behavior | belongsTo | Behavior | Working style classification |
| memberships | hasMany | ClientMembership | Users who have access to this client workspace |
| projects | hasMany | Project | All projects under this client |
| phoneNumbers | hasMany | PhoneNumber | Multiple contact numbers |
| tags | morphToMany | Tag | Freeform labels |
| attachments | morphMany | Attachment | Polymorphic file attachments |
| secrets | morphMany | SecretEntry | Platform-only secrets linked to the client |

## Workspace Summary Counts

When viewing a client workspace, the system provides these aggregate counts:

- **Members count**: total users with membership in this client
- **Projects count**: total projects accessible to the viewing user
- **Issues count**: total issues across accessible projects
- **Boards count**: total boards across accessible projects
- **Statuses count**: total project statuses (global + client-specific)

## Field Notes

- Tags are freeform descriptors such as personality, working style, scale, or other owner-defined labels.
- Phone numbers may be more than one value, each with an optional label.
- Social links are stored as JSON with label/url pairs.
- Notes may be grouped rather than limited to a single text field.
- Origin refers to how the client relationship started, such as freelancing, family, friends, or other owner-defined sources.
- The profile image is stored via Laravel's public disk and served at `/storage/{image_path}`.

## Visibility Rules

- **Platform owner** sees the full client profile including behavior, notes, origin, tags, phone numbers, social links, and all internal fields.
- **Platform-side users** can manage a separate secrets area for sensitive credentials tied to the client.
- **Client-scoped users** (members) see a workspace view with name, email, and collaborative surfaces (projects, issues, boards). Internal relationship data is hidden.
- The `canViewInternalClientProfile` and `canEditInternalClientProfile` permission methods control field visibility.

## Notes Vs Secrets

- `notes` are relationship context and owner-side commentary.
- `secrets` are credentials or sensitive values that require encrypted storage and explicit reveal.
- Secrets should not be stored inside `notes`.

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

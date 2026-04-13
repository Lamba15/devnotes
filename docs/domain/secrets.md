# Secrets

## Purpose

Secrets store platform-only credentials and sensitive values that should not be mixed into normal notes fields.

They are intentionally separate from client notes and project notes.

## Model

- One `SecretEntry` model stores both client secrets and project secrets.
- Ownership is polymorphic through `secretable_type` and `secretable_id`.
- Current supported owners are:
  - `Client`
  - `Project`

## Fields

| Field | Type | Notes |
|-------|------|-------|
| id | auto-increment | Primary key |
| secretable_type | string | Owning model class |
| secretable_id | integer | Owning model id |
| label | string, max 255 | Human-readable secret label |
| description | text, nullable | Optional context about the secret |
| secret_value | encrypted text | The stored credential or secret value |
| created_at | timestamp | Record creation |
| updated_at | timestamp | Last modification |

## Visibility Rules

- Secrets are platform-only in the current version.
- Client-scoped users do not see secret labels, counts, descriptions, or values.
- Secret values are never included in initial page props.
- Secret values are revealed only through an explicit platform action.

## Encryption

- `secret_value` is stored using Laravel's encrypted cast.
- The `SecretEntry` model hides `secret_value` from default serialization.

## UI Direction

- Clients have a platform-only secrets area.
- Projects have a platform-only secrets area.
- Secret value reveal is explicit.
- Copy is available only after reveal.

## AI Direction

- Secrets are not exposed to AI tools in the current version.
- This is intentionally conservative even for platform-side users.

## Audit Rules

- Secret create, update, delete, and reveal actions are audited.
- Audit entries must not store decrypted secret values.
- `before_json`, `after_json`, and `metadata_json` may include labels and owner references, but not `secret_value`.

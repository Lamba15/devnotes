# AGENTS

This file is the entry point for future agent sessions working in this repository.

## Core Rule

Docs are the source of truth for intent.

Code is the source of truth for implementation.

Agents should not silently invent product behavior in code when intent is unclear.

## How To Work In This Repo

1. Read the relevant docs before making product or implementation decisions.
2. Use chat for exploration and negotiation.
3. Use docs for agreed decisions.
4. If implementation reveals a missing rule, clarify it or document it before baking it into code.
5. Prefer updating an existing doc over creating duplicate descriptions.

## Documentation Structure

Stable intent lives under `docs/`.

Current structure:

- [`docs/README.md`](/home/aboelsoud/WebstormProjects/devnotes/docs/README.md): index and high-level summary
- [`docs/domain/core-model.md`](/home/aboelsoud/WebstormProjects/devnotes/docs/domain/core-model.md): top-level product entities
- [`docs/permissions/scopes.md`](/home/aboelsoud/WebstormProjects/devnotes/docs/permissions/scopes.md): scope and permission rules
- [`docs/ai/central-ai.md`](/home/aboelsoud/WebstormProjects/devnotes/docs/ai/central-ai.md): central AI model and constraints
- [`docs/tracking/issues.md`](/home/aboelsoud/WebstormProjects/devnotes/docs/tracking/issues.md): issue model and naming
- [`docs/tracking/boards.md`](/home/aboelsoud/WebstormProjects/devnotes/docs/tracking/boards.md): board behavior and status rules
- [`docs/meta/collaboration.md`](/home/aboelsoud/WebstormProjects/devnotes/docs/meta/collaboration.md): collaboration preferences for future sessions

Working drafts live under `docs/working/`.

- [`docs/working/README.md`](/home/aboelsoud/WebstormProjects/devnotes/docs/working/README.md): temporary drafts, milestones, and planning notes

## Product Framing

- This product is shaped around real personal use first.
- Avoid generic SaaS defaults unless they are intentional.
- Prefer clear generic terminology over branded PM jargon unless a branded concept is truly needed.
- Favor explicit behavior over vague role labels or accidental framework defaults.

## Current Agreed System Shape

- Core domain: organization, project, board, issue
- No team model
- Issues exist independently of boards
- Boards are views over project issues
- An issue can appear on many boards
- Backlog is computed per board as issues not placed on that board
- Columns may or may not update issue status
- Permissions are scoped and explicit
- AI uses the same permissions as the active user

## AI Constraints

- Every meaningful system capability should be exposed as tools.
- Tools are grouped into skills.
- One central AI system uses those skills.
- The AI must not have hidden elevated permissions.
- The chat UI may render structured interfaces inside the conversation.
- Sensitive AI actions should require user confirmation where appropriate.

## Collaboration Style

- Keep discussion direct and grounded.
- Be pragmatic and concise.
- Separate what is agreed from what is still being explored.
- Do not over-polish rough thoughts into inaccurate summaries.

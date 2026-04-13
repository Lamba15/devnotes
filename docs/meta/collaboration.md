# Collaboration Notes

## Purpose

This file captures recurring collaboration preferences for work on this repository.

It is not product truth. It is working-context for future sessions.

## Current Working Style

- Keep discussion direct and grounded.
- Treat docs as the source of truth for intent.
- Keep stable docs separate from working drafts.
- Do not invent product behavior casually in code.
- Prefer writing down agreed rules in the appropriate doc once they are settled.
- Use chat for exploration and negotiation.
- Use docs for agreed decisions.

## Product Framing Preferences

- The product should be shaped around real personal use first.
- Avoid generic SaaS defaults when they are not intentional.
- Prefer clear generic terminology over branded PM jargon unless a branded concept is truly needed.
- Favor explicit system behavior over vague role labels or accidental framework defaults.

## Collaboration Tone

- Be pragmatic.
- Be concise.
- Do not overpackage rough thoughts into polished but inaccurate summaries.
- Separate what is agreed from what is still being explored.

## Implementation Preference

- Implementation should follow the docs rather than silently filling gaps.
- When code exposes an unresolved rule, clarify it or document it instead of guessing.
- The whole project should follow strict TDD.
- Preferred workflow is:
    - write a failing test first
    - implement the minimum code to make it pass
    - refactor safely
    - rerun the relevant tests
- Normal automated application tests should use Pest.
- Browser automation should use Laravel Dusk.
- Laravel Dusk must never point at the primary local app database. Use a dedicated Dusk-only database and fail fast if the browser-test env targets `devnotes`.
- Test coverage should include domain rules, permissions, routing, important application actions, and critical browser flows.

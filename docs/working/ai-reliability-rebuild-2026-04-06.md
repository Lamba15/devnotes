# AI Reliability Rebuild

## Why

The current assistant is useful, but it is still a message-decorated chat system rather than a reliable operational AI runtime.

Main problems discovered:

- confirmation execution is disconnected from the original run
- tool executions are stored as loose arrays instead of first-class records
- at least one read tool currently leaks scope (`list_accessible_clients`)
- debug timing is unreliable because duration math is wrong
- loading progress is simulated on the client instead of being run-backed
- planner/tool/writer responsibilities are mixed together

The goal of this rebuild is to make the assistant a well-oiled machine:

- grounded
- permission-safe
- observable
- resumable
- debuggable

## Target Model

One user request should create one durable assistant run.

That run should own:

- the user message
- the assistant message
- phase timeline
- tool executions
- confirmation state
- model trace
- final answer trace

## Data Model

### assistant_runs

One row per assistant request lifecycle.

Suggested fields:

- `id`
- `thread_id`
- `user_id`
- `user_message_id`
- `assistant_message_id`
- `status`
- `provider`
- `configured_model`
- `effective_model`
- `system_prompt_source`
- `model_runs`
- `reruns`
- `started_at`
- `finished_at`
- `duration_ms`
- `error_type`
- `error_message`
- `metadata_json`

### assistant_tool_executions

One row per tool execution or confirmation-gated tool request.

Suggested fields:

- `id`
- `run_id`
- `tool_name`
- `tool_call_id`
- `arguments_json`
- `status`
- `result_type`
- `result_json`
- `error_message`
- `requires_confirmation`
- `confirmation_id`
- `started_at`
- `finished_at`
- `duration_ms`
- `metadata_json`

### assistant_run_phases

One row per run phase for observability and future live progress.

Suggested fields:

- `id`
- `run_id`
- `key`
- `title`
- `status`
- `summary`
- `started_at`
- `finished_at`
- `duration_ms`
- `metadata_json`

## Runtime Stages

The assistant runtime should become explicit.

### 1. Planner pass

Input:

- thread history
- user message
- available tools

Output:

- direct answer
  or
- tool calls
  or
- confirmation-gated mutation request

### 2. Tool execution stage

- execute each tool call
- persist each execution as a row
- persist confirmation-gated state as execution records too

### 3. Writer pass

Input:

- user request
- planner draft
- execution records
- confirmation state

Output:

- final user-facing assistant answer

This stage should always produce the user-visible explanation unless the planner already produced a complete direct answer with no tool work needed.

## Immediate Fixes Before Full Rebuild

These should land first because they affect correctness.

### Fix 1: `list_accessible_clients` scope

Current issue:

- it returns all clients, ignoring active user scope

Required fix:

- platform owner: all clients
- owner/admin: clients they manage
- member/viewer: only clients they belong to

### Fix 2: duration math

Current issue:

- many stored durations are negative

Required fix:

- standardize duration as `start->diffInMilliseconds(end)` or equivalent positive calculation everywhere

### Fix 3: confirmation trace continuity

Current issue:

- approval creates a new assistant message with no tool-call trace

Required fix:

- confirmation should resume the same run
- executed confirmation should create or update tool execution records
- the resulting assistant message should remain tied to the run that requested confirmation

## Implementation Order

### Phase A

- add this working plan
- fix client scope leak
- fix duration math

### Phase B

- add `assistant_runs`
- add `assistant_tool_executions`
- add `assistant_run_phases`
- add models/relations

### Phase C

- create a run at the start of each request
- persist planner pass metadata into the run
- persist tool execution rows
- persist phase rows

### Phase D

- refactor confirmation approval/rejection to resume the same run
- remove disconnected confirmation-only debug behavior

### Phase E

- move debug UI from ad hoc message metadata to run-backed data
- replace simulated loading with phase-backed loading

## UI Target

The assistant UI should eventually render:

- thread history
- messages
- per-run debug
- compact tool call list
- side detail panel for one execution
- phase timeline
- model/cost summary

The current UI can stay during the backend rebuild, but it should gradually switch to run-backed data instead of message-backed approximations.

## Success Criteria

The rebuild is successful when:

- every request creates one run
- every tool execution has a durable row
- confirmation does not break trace continuity
- debug reflects actual runtime state
- timings are correct
- user scope is enforced consistently
- loading progress can be sourced from run phases instead of client simulation

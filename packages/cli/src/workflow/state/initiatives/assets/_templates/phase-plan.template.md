> This template is for a phase `plan.md` file:
> `.mawm/initiatives/active/<initiative-slug>/phases/active/<phase-slug>/plan.md`

> Planner notes
>
> - Clear every ambiguity before writing. Ask questions first when assumptions are not locked.
> - This file is the current source of truth for the phase while it lives under `phases/active/`. Keep it aligned with the parent initiative plan, `roadmap.md`, sibling active phase docs, and the current codebase.
> - When sequencing, scope, or code reality changes, update every affected active doc in the same pass. Delete stale text instead of layering corrections.
> - Completed phases and archived initiatives are historical only. Refer to them only when absolutely necessary.
> - Each step must be implementable, verifiable, and focused so coder subagents can execute one step at a time.
> - Assume the plan will be reviewed by plan-reviewer agents. If it does not pass first review, a HITL gate is triggered.

<!-- Delete sections that do not apply. Do not leave open questions or superseded instructions in the final plan. -->

# Phase <n> Plan: <phase title>

## Status Reset

<optional: only when needed, state which earlier active phase assumption, sequencing decision, or scope call is no longer valid. Keep historical detail to the minimum required to prevent conflicting reads>

## Source of Truth Rules

- This plan must match the parent initiative plan, `.mawm/initiatives/roadmap.md`, sibling active phase docs, and current codebase behavior.
- When phase direction changes, update every affected active doc in the same pass.
- Remove or rewrite superseded instructions instead of appending contradictory follow-up notes.
- Use completed phase docs only when a historical reference is required to explain a handoff, reset, or retired assumption.

## Goal

<1 short paragraph describing the end state and why this phase exists in the current initiative direction.>

## Current State

- <current code or workflow behavior this phase starts from>
- <current mismatch or missing capability this phase resolves>
- <active docs or contracts that must stay aligned while this phase is in progress>

## Scope

- `<repo>/<path>` - <what changes here>
- `<repo>/<path>` - <what changes here>
- `<tests/docs/scripts>` - <what must stay aligned>

## Out of Scope

- <explicitly excluded work item>
- <next-phase or separate-initiative item>

## Decisions Cleared

- <resolved decision stated as an exact rule>
- <resolved fallback, warning, output, or file-shape rule>
- <resolved ownership or boundary rule>

## Execution Notes

### <note title>

<add precise behavior, data shape, or command contract that removes ambiguity>

```text
<exact format, example output, path contract, or payload>
```

### <note title>

<add another exact rule only if it materially reduces implementation ambiguity>

## Work Plan

<!-- Keep each step to one concern. Every step needs concrete edits and its own verification. Copy the step block as needed. Remove stale steps instead of leaving contradictory replacements below them. -->

### 1. <step title> (<estimated-token-usage>)

<say why this step exists, what it owns, and what it must not pull in yet>

- [ ] `<file or area>`: <specific change>
- [ ] `<file or area>`: <specific change>
- [ ] `<tests>`: <coverage or fixture update>

Verify:

- [ ] `<command>`
- [ ] `<command or manual check>`

### 2. <step title> (<estimated-token-usage>)

<say why this step exists, what it owns, and what it must not pull in yet>

- [ ] `<file or area>`: <specific change>
- [ ] `<file or area>`: <specific change>
- [ ] `<tests>`: <coverage or fixture update>

Verify:

- [ ] `<command>`
- [ ] `<command or manual check>`

### 3. <step title> (<estimated-token-usage>)

<continue until the phase is fully decomposed into focused, sequential steps>

- [ ] `<file or area>`: <specific change>
- [ ] `<file or area>`: <specific change>
- [ ] `<tests/docs/smoke>`: <coverage or verification update>

Verify:

- [ ] `<command>`
- [ ] `<command or manual check>`

## Verification

### Per-step verification

- [ ] Step 1: `<command>`
- [ ] Step 2: `<command>`
- [ ] Step 3: `<command>`

### Phase completion

- [ ] `<repo or package>`: `<typecheck, build, lint, or test command>`
- [ ] `<repo or package>`: `<integration or smoke command>`
- [ ] `<manual acceptance check if needed>`

## Exit Criteria

- [ ] <observable end-state>
- [ ] <observable end-state>
- [ ] <observable end-state>

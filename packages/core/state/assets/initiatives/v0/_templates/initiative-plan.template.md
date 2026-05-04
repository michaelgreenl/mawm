> This template is for an initiative's plan file:
> `.mawm/initiatives/active/<initiative-slug>/plan.md`

> Planner notes
> - Clear every ambiguity before writing. Ask questions first when assumptions are not locked.
> - This file is the current source of truth for the initiative while it lives under `active/`. Keep it aligned with `roadmap.md`, active phase docs, and the current codebase.
> - When direction or code reality changes, update this file and every impacted active doc in the same pass. Delete stale text instead of layering corrections.
> - `archived/` initiatives and `phases/complete/` docs are historical only. Refer to them only when absolutely necessary.
> - Break delivery into focused, implementable, verifiable phases that coder subagents can execute one at a time.
> - Assume the plan will be reviewed by plan-reviewer agents. If it does not pass first review, a HITL gate is triggered.

<!-- Delete sections that do not apply. Replace open questions with cleared decisions before finalizing the plan. Remove or rewrite superseded active text instead of stacking contradictory notes. -->

# <Initiative Name> - Initiative Plan

## Status Reset

<optional: only when needed, state which earlier active assumptions, drafts, or decisions are no longer valid. Keep historical detail to the minimum required to prevent conflicting reads>

## Source of Truth Rules

- This plan must match `.mawm/initiatives/roadmap.md`, sibling active phase docs, and current codebase behavior.
- When initiative direction changes, update every affected active doc in the same pass.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.
- Use archived initiatives or completed phases only when a historical reference is required to invalidate a stale assumption, explain a migration boundary, or capture a handoff dependency.

## Finalized Decisions

- <locked architecture, ownership, or rollout decision>
- <locked contract, file shape, CLI, or API decision>
- <locked scope boundary or MVP decision>

## Architecture

```text
<system, repo, or service diagram>
```

## Responsibility Split

| Concern | Owner |
| --- | --- |
| `<concern>` | `<repo/team/component>` |
| `<concern>` | `<repo/team/component>` |

## Target State

<describe the desired end state once the initiative is complete>

### <target layout, scaffold, or topology>

```text
<directory layout, deployment shape, or major artifact topology>
```

### <primary config, contract, or data shape>

<describe the exact contract>

```json
{}
```

### <primary command, API, or workflow surface>

```text
<command surface, interface, or request flow>
```

### <runtime, prompt, tool, or behavior model>

<describe ordering, fallback rules, ownership, or composition semantics>

## MVP Definition

<state the minimum outcome that counts as done for this initiative>

- <capability>
- <capability>
- <capability>

## Post-MVP Follow-On

- <separate initiative or queued work>

## Current State Assessment

- <current codebase behavior or conflict this initiative must correct>
- <missing capability in the current active direction>
- <active contract, doc, or ownership rule that must be brought back into alignment>

## Execution Plan

<!-- Each phase should later get its own plan.md using phase-plan.template.md. Keep phase titles, ordering, and scope aligned with the current roadmap and codebase. -->

### Phase 0: <alignment or prerequisite phase>

- [ ] complete

- <phase outcome>
- <phase outcome>

### Phase 1: <phase title>

- [ ] complete

- <phase outcome>
- <phase outcome>
- <phase outcome>

### Phase 2: <phase title>

- [ ] complete

- <phase outcome>
- <phase outcome>
- <phase outcome>

### Phase <n>: <phase title>

- [ ] complete

- <phase outcome>
- <phase outcome>
- <phase outcome>

## Verification Gates

### <repo, package, or system name>

- `<command>`
- `<command>`
- `<command>`

### Smoke methodology

- <how disposable verification environments are created>
- <how local changes are exercised before push>
- <where smoke logs or results are recorded>

### Cross-repo acceptance checks

- <observable system-level behavior>
- <observable system-level behavior>
- <observable system-level behavior>

## Execution Order

```text
Phase 0 (<title>)
   -> Phase 1 (<title>)
      -> Phase 2 (<title>)
         -> Phase <n> (<title>)
```

## Installation / Rollout Model

<describe how the initiative lands in a target project, package graph, environment, or deploy flow>

```text
<example install, run, or rollout commands if helpful>
```

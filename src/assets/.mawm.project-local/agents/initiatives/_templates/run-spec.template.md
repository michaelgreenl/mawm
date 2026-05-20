> This template is for a run's `spec.md` file:
> `.mawm/initiatives/active/<initiative-slug>/runs/active/<run-slug>/spec.md`

> Planner notes
>
> - This file is the current source of truth for the run while it lives under `runs/active/`. Keep it aligned with the parent initiative spec, `roadmap.md`, sibling active run specs, and the current codebase.
> - When sequencing, scope, or code reality changes, update every affected active doc in the same pass. Delete stale text instead of layering corrections.
> - Each run must name one installed LangGraph workflow and be independently implementable, reviewable, verifiable, smoke-testable, and committable.

<!-- Delete sections that do not apply. Do not leave open questions or superseded instructions in the final plan. -->

# Run Spec: <run title>

## Assigned Workflow

`<workflow-name-under-.mawm/graphs>`

## Task

<run-task>

## Current State

- <current code or workflow behavior this run starts from>
- <current mismatch or missing capability this run resolves>

## Goal (Run Outcome)

<run-outcome>

## Scope

<run-scope>

## Out of Scope

<out-of-scope>

## Contracts

<run-contracts>

## Implementation Plan

<run-implementation-plan>

## Verification Commands

<verification-commands>

## Smoke Verification

- Mode: `<headless|manual>`
- Method: <run-smoke-method>
- Manual instructions, if needed: <manual-smoke-instructions>

## Completion Gate

- TDD implementation is complete within scope.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes, or HITL confirms manual smoke instructions were completed.
- Run is ready to become one commit on the initiative branch.

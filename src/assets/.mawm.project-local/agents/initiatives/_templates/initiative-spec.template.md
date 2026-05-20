> This template is for an initiative's `spec.md` file:
> `.mawm/initiatives/active/<initiative-slug>/spec.md`

> Planner notes
>
> - This file is the current source of truth for the initiative while it lives under `active/`. Keep it aligned with `roadmap.md`, active run specs, and the current codebase.
> - When direction or code reality changes, update this file and every impacted active doc in the same pass. Delete stale text instead of layering corrections.
> - Break delivery into focused, implementable, verifiable runs. Each run must name the installed LangGraph workflow that will execute it.

<!-- Delete sections that do not apply. Replace open questions with cleared decisions before finalizing the plan. Remove or rewrite superseded active text instead of stacking contradictory notes. -->

# <Initiative Name> - Initiative Spec Sheet

## Source of Truth Rules

- When initiative direction changes, update every affected active doc in the same pass.
- Active run specs under `runs/active/` must match the run summaries in this spec.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.

## Target State

<describe the desired end state once the initiative is complete>

## Initiative-wide Contracts

<vital contracts necessary for all runs in this initiative>

## Branch and PR Plan

- Target repo: `<repo path or name>`
- Base branch: `main`
- Initiative branch: `<initiative-branch-name>`
- Branch creation rule: create the initiative branch from `main` only when implementation is ready to begin.
- Run commit rule: each clean completed run becomes one commit.
- PR rule: open a PR from the initiative branch to `main` after all runs and initiative gates are complete.

## Execution Plan

### Run 1: <run title> (`<assigned-implementation-workflow>`)

- [ ] complete
- Run spec: `.mawm/initiatives/active/<initiative-slug>/runs/active/<run-slug>/spec.md`
- Task: <run-task>
- Current state: <code-base-current-state>
- Outcome: <run-outcome>
- Scope: <run-scope>
- Contracts: <run-contracts>
- Smoke verification: `<headless|manual>` - <run-smoke-method>

### Run 2: <run title> (`<assigned-implementation-workflow>`)

- [ ] complete
- Run spec: `.mawm/initiatives/active/<initiative-slug>/runs/active/<run-slug>/spec.md`
- Task: <run-task>
- Current state: <code-base-current-state>
- Outcome: <run-outcome>
- Scope: <run-scope>
- Contracts: <run-contracts>
- Smoke verification: `<headless|manual>` - <run-smoke-method>

### Run 3: <run title> (`<assigned-implementation-workflow>`)

- [ ] complete
- Run spec: `.mawm/initiatives/active/<initiative-slug>/runs/active/<run-slug>/spec.md`
- Task: <run-task>
- Current state: <code-base-current-state>
- Outcome: <run-outcome>
- Scope: <run-scope>
- Contracts: <run-contracts>
- Smoke verification: `<headless|manual>` - <run-smoke-method>

### Run <n>: <run title> (`<assigned-implementation-workflow>`)

- [ ] complete
- Run spec: `.mawm/initiatives/active/<initiative-slug>/runs/active/<run-slug>/spec.md`
- Task: <run-task>
- Current state: <code-base-current-state>
- Outcome: <run-outcome>
- Scope: <run-scope>
- Contracts: <run-contracts>
- Smoke verification: `<headless|manual>` - <run-smoke-method>

## Initiative Verification Gates

- Every run is complete, verified, reviewed, smoke-tested, and committed.
- Manual smoke-test instructions, if any, have been completed by HITL and recorded.
- Initiative-wide contracts still match the current codebase after the final run.
- PR from `<initiative-branch-name>` to `main` is opened with the initiative summary and verification evidence.

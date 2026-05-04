> This template is for a step `plan.md` file:
> `.mawm/initiatives/active/<initiative-slug>/phases/active/<phase-slug>/steps/active/<nn>-<step-slug>/plan.md`

> Planner notes
> - Clear every ambiguity before writing. Ask questions first when assumptions are not locked.
> - This file is the current source of truth for one executable step while it lives under `steps/active/`. It is a focused coder handoff, not a replacement for the parent phase `plan.md`.
> - Keep it aligned with the parent phase plan, parent initiative plan, `roadmap.md`, and current codebase. When the contract changes, update every affected active doc in the same pass.
> - Include only the minimum context, contracts, tasks, and verification a coder subagent needs to execute this step safely.
> - Keep the step focused on one concern at a time. If the work still requires scope decisions during execution, the step is not ready.
> - The paired execution log for this step lives beside the plan at `log.md` in the same step directory. Cleanly completed step directories move to `steps/complete/`.
> - Assume the plan will be reviewed by plan-reviewer agents. If it does not pass first review, a HITL gate is triggered.

<!-- Delete sections that do not apply. Do not leave open questions, speculative tasks, or stale instructions that would force the coder to make scope, ownership, or acceptance decisions. -->

# Step <n> Plan: <step title>

## Goal

<1 short paragraph describing the exact end state this step must produce and why it exists now in the phase sequence.>

## Inputs

- Parent phase `plan.md`: <which phase step this derives from and any required execution note or contract>
- Required active docs or contracts: <initiative plan, roadmap note, ADR, interface contract, or none>
- Code or artifact inputs: <existing files, fixtures, generated artifacts, or baseline behavior this step starts from>

## Scope

- `<repo>/<path>` - <specific change this step owns>
- `<repo>/<path>` - <specific change this step owns>
- `<tests/docs/scripts>` - <what must stay aligned as part of this step>

## Out of Scope

- <adjacent work item that belongs to another step>
- <future phase work or separate initiative work>

## Decisions / Contracts

- <exact behavior, fallback, warning, file-shape, or interface rule the coder must follow>
- <ownership, sequencing, or non-goal rule that prevents scope drift>
- <command, payload, path, or acceptance contract that removes ambiguity>

## Implementation Tasks

<!-- Keep tasks concrete and file-oriented. This should be executable in one pass without the coder deciding what “done” means. -->

- [ ] `<file or area>`: <specific change>
- [ ] `<file or area>`: <specific change>
- [ ] `<tests/docs/fixtures>`: <coverage, fixture, or alignment update>

## Verification Commands

- [ ] `<command>`
- [ ] `<command>`
- [ ] `<manual or smoke check>`

## Acceptance Checks

- [ ] <observable behavior, output, or artifact proves the step is complete>
- [ ] <observable behavior, output, or artifact proves the step did not regress the relevant contract>
- [ ] <observable behavior, output, or artifact proves adjacent out-of-scope work was not pulled forward>

## Return / Logging Requirements

- Record the exact files changed.
- Record every verification command run and whether it passed or failed.
- Record any unresolved issue, deviation, or blocker before handing the step back.
- State whether every implementation task and acceptance check above was completed.
- Keep the return focused on durable execution evidence, not a full transcript export.

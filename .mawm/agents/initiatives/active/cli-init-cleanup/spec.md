# CLI Init Cleanup - Initiative Spec Sheet

## Source of Truth Rules

- When initiative direction changes, update every affected active doc in the same pass.
- Any run specs created under `runs/active/` must match the run summaries in this spec.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.

## Target State

`mawm init` can clearly scaffold the current local MAWM workspace, scaffold the new workflow templates through `-t [type]`, and install agent assets without claiming the wrong side effects. This initiative stops at the truthful CLI init surface; the deferred README refresh is tracked separately as a queued ad-hoc run at `.mawm/agents/adhoc/queued/readme-refresh/spec.md`.

## Initiative-wide Contracts

- Do not start this initiative's implementation runs until the `workflow-templates` initiative has shipped the CLI-consumable workflow template assets under `dist/assets/workflow-templates/{base,initiative}`.
- `mawm init` keeps its current default local MAWM scaffold behavior unless a new template mode is explicitly requested.
- `-t` is the local template-generation mode and accepts an optional `<type>` argument. Supported types are `base` and `initiative`.
- `mawm init -t` and `mawm init -t base` both scaffold the standalone/base workflow template. `mawm init -t initiative` scaffolds the initiative-run workflow template.
- Bare `-i` keeps the existing `.mawm/agents` initiative workspace behavior when `-t` is absent.
- Template-generation mode is local-only and must not be combinable with `-g`, `-a`, or bare `-i`.
- Any unsupported `-t <type>` value is an error.
- Template-generation mode must consume the CLI-shipped workflow template assets from `dist/assets/workflow-templates/{base,initiative}`, not copy directly from `workflows/examples/coding`.
- Success output should describe what changed by action/category and avoid unnecessary absolute paths. Prompts and errors may still include concrete paths when they are required for safety or diagnosis.
- The README refresh no longer belongs to this initiative and is tracked separately at `.mawm/agents/adhoc/queued/readme-refresh/spec.md`.
- The queued README ad-hoc run must remain unassigned and unpromoted until the user explicitly requests it after the next approved initiative lands.

## Branch and PR Plan

- Target repo: `mawm`
- Base branch: `main`
- Initiative branch: `initiative/cli-init-cleanup`
- Branch creation rule: create the initiative branch from `main` only when implementation is ready to begin.
- Run commit rule: each clean completed run becomes one commit.
- PR rule: open a PR from `initiative/cli-init-cleanup` to `main` after all runs and initiative gates are complete.

## Execution Plan

### Run 1: Template init modes (`coding`)

- [x] complete
- Run spec path: `.mawm/agents/initiatives/active/cli-init-cleanup/runs/active/init-template-modes/spec.md`
- Task: Add `-t [type]` support to `mawm init` so it can scaffold the new workflow templates without regressing current local/global/agent flows.
- Current state:
  - `mawm init` currently advertises `[-g] [-i] [-a <agent>]` and does not scaffold workflow templates.
  - Bare `init` scaffolds `.mawm/graphs` and initializes missing `~/.config/mawm`.
  - Bare `-i` copies `.mawm/agents` initiative docs/workspace.
  - The option parser already handles value-bearing flags such as `-a <agent>`.
- Outcome:
  - `mawm init -t` and `mawm init -t base` scaffold the standalone/base workflow template into the current directory.
  - `mawm init -t initiative` scaffolds the initiative-run workflow template into the current directory.
  - Unsupported template types fail with a clear error.
  - Existing non-template init flows keep their current targets unless explicitly blocked by the new template-mode exclusivity rules.
- Scope:
  - Add template-mode parsing and routing to `mawm init`.
  - Use the CLI-shipped template assets produced by the `workflow-templates` initiative from `dist/assets/workflow-templates/{base,initiative}`.
  - Update usage/help text and tests for the new flag matrix, including the optional type argument.
- Out of scope:
  - No broad success-message rewrite beyond what is minimally necessary for the new template paths.
  - No README refresh.
- Contracts:
  - `-t` accepts only `base` or `initiative`; omitted type defaults to `base`.
  - `-t` is mutually exclusive with `-g`, `-a`, and bare `-i`.
  - Bare `-i` keeps its current project-initiative-doc behavior when `-t` is absent.
  - Template init must not read from `workflows/examples/coding`.
  - `base` maps to the standalone/base template package and `initiative` maps to the initiative-run template package.
  - The source of copied scaffold files is `dist/assets/workflow-templates/{base,initiative}`.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun test test/cli/init.test.ts test/cli/arguments.test.ts`
- Smoke verification: `headless` - run the init-command test paths for `-t`, `-t base`, and `-t initiative`, plus invalid-type coverage, and confirm the existing non-template init behavior still passes.

### Run 2: Init output messaging (`coding`)

- [x] complete
- Run spec path: `.mawm/agents/initiatives/active/cli-init-cleanup/runs/active/init-output-messaging/spec.md`
- Task: Make `mawm init` output reflect what actually changed across local, global, template, and agent-asset flows.
- Current state:
  - Success output currently collapses many paths into generic messages such as `Initialized .mawm scaffold.` or a raw global-config path.
  - Messages can claim `.mawm` or global MAWM config changed even when only agent assets were touched.
  - Declined overwrite exits with no output, which reads like silent success instead of an intentional no-op.
- Outcome:
  - `mawm init` success and no-op output is action-based and accurate for template, MAWM, and agent-asset flows.
  - Representative combinations such as `-a opencode`, `-g -a opencode`, `-t`, `-t base`, and `-t initiative` report only the surfaces they actually changed.
- Scope:
  - Rewrite success/no-op copy for `mawm init`.
  - Tighten any related prompt or explanatory copy needed to match actual behavior.
  - Update tests to assert representative success and no-op outputs.
- Out of scope:
  - No new flag semantics beyond the template-mode matrix from run 1.
  - No README changes.
- Contracts:
  - Success output avoids unnecessary absolute paths.
  - Errors and overwrite prompts may keep specific paths when precision is needed.
  - Messages must never claim `.mawm` or `~/.config/mawm` changed when only `.opencode` or template files changed.
  - Declined overwrite must be reported as a no-op, not as silent success.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun test test/cli/init.test.ts`
- Smoke verification: `headless` - run the init-command message matrix in automated tests for local, global, template, agent, and overwrite-declined flows.

## Deferred Follow-on

- README refresh was removed from this initiative and moved to the queued ad-hoc run at `.mawm/agents/adhoc/queued/readme-refresh/spec.md`.
- That ad-hoc run intentionally has no assigned workflow while queued.
- Do not promote or execute the queued README run until the user explicitly requests it after the next approved initiative lands.

## Initiative Verification Gates

- Every run is complete, verified, reviewed, smoke-tested, and committed.
- `mawm init` test coverage includes the `-t`, `-t base`, and `-t initiative` flows plus invalid-type coverage and representative message assertions for template, MAWM, and agent-asset modes.
- `mawm init` no longer reports misleading success output for agent-only or global-agent flows.
- The deferred README work is tracked only at `.mawm/agents/adhoc/queued/readme-refresh/spec.md` and does not block the `cli-init-cleanup` PR.
- PR from `initiative/cli-init-cleanup` to `main` is opened with the initiative summary and verification evidence.

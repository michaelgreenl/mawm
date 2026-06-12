# Run Spec: Run 2: CLI surface goes global-only

## Assigned Workflow

`coding`

## Task

Collapse the dual project/global workflow-management CLI into a single global model: `install`, `update`, `remove`, and `list` should operate only on `~/.config/mawm`, `update` should default to today's global-update behavior, and `init` should stop scaffolding `.mawm/graphs/` without changing its planning or agent-asset flows.

## Current State

- `src/cmd/surface/install.ts:15-120` still exposes `-g` and branches between a global source-path install flow and a project-local copy flow that installs `~/.config/mawm/<workflow>` into `<cwd>/.mawm/graphs/<workflow>`.
- `src/cmd/surface/update.ts:10-95` still exposes `-g`, keeps `-i` planning mode, and defaults to project-local updates backed by `src/utils/update/project.ts:1-55` and `<cwd>/.mawm/graphs/manifest.json`.
- `src/cmd/surface/remove.ts:47-95` and `src/cmd/surface/list.ts:6-41` still treat project scope as the default and global scope as an opt-in `-g` mode.
- `src/cmd/surface/init.ts:14-246` still copies `src/assets/.mawm.project-local/graphs/manifest.json` into `<cwd>/.mawm/graphs/manifest.json` and emits `Initialized local MAWM graphs scaffold.` in default, `-i`, and `-a` flows.
- `test/cli/{install,update,remove,list,init}.test.ts` and `test/assets/workflow-template-distribution.test.ts:296-410` still encode the dual model: global installs require `-g`, project installs create `.mawm/graphs`, update/remove/list default to project scope, and the template distribution test launches workflows from project-local `.mawm/graphs` copies.
- `scripts/copy-assets.mjs:79-87` already deletes `dist/assets` before copying `src/assets`, so removing `src/assets/.mawm.project-local/graphs/` is enough to remove the shipped graphs scaffold after `bun run build`; no separate asset manifest needs updating.

## Goal (Run Outcome)

- `install` keeps only the current global source-path behavior: optional path argument defaulting to `.`; workflow artifacts install into `~/.config/mawm/<workflow-id>`; the global manifest keeps `absolutePath` tracking unchanged.
- `update` keeps `-i` exactly as today's planning-assets mode and otherwise updates one or all workflows from `~/.config/mawm/manifest.json` using the existing global update flow by default.
- `remove` and `list` operate only on `~/.config/mawm`.
- `init` no longer creates `<project>/.mawm/graphs` and no longer ships a graphs scaffold asset, but its existing `-i`, `-a`, and `-g` meanings stay intact aside from losing the graph-scaffold side effect and output line.
- Help text, usage strings, and stdout/stderr messages in scope describe the global-only workflow-management model.
- The CLI suites and workflow-template distribution test prove the new model end-to-end, including built assets after `bun run build`.

## Scope

- `src/cmd/surface/{install,update,remove,list,init}.ts`
- `src/utils/update/global.ts`
- `src/utils/update/shared.ts`
- `src/utils/update/project.ts` deletion and any import cleanup caused by that removal
- `src/assets/.mawm.project-local/graphs/`
- `test/cli/{install,update,remove,list,init}.test.ts`
- `test/assets/workflow-template-distribution.test.ts`
- Help, usage, and command-output strings touched by the files above

## Out of Scope

- `execute-graph` tool behavior or tests from Run 1
- Prompt, template, README, or other documentation rewrites from Run 3
- Deleting this repo's committed `.mawm/graphs/` tree from Run 4
- Changes to planning-asset contents under `.mawm/agents/**`
- Any backward-compatibility or migration behavior for stale project-local workflow installs in user projects
- Broader refactors of update helpers, command builders, or asset-copying infrastructure that are not required by the global-only CLI surface

## Contracts

- For this run, `-g` removal applies to workflow-management commands only: remove it from `install`, `update`, `remove`, and `list`, but keep `init -g` because it controls global config/agent-asset initialization rather than workflow install scope and the initiative roadmap explicitly leaves `init` focused on stopping `.mawm/graphs` scaffolding.
- `install` must continue accepting either a workflow root or a dist path and keep using `resolveWorkflowRoot`, `resolveWorkflowMetadata`, and `refreshManifest`; this run does not introduce any new install source contract.
- The global manifest schema and `absolutePath` update flow stay unchanged.
- `update -i` stays byte-for-byte compatible in behavior and output except that `-g` is no longer a recognized option on `update` at all.
- Removing the `global` option definitions should let the parser surface `Unknown option: -g` / `Unknown option: --global` naturally; do not add custom compatibility handling for removed flags.
- `src/utils/update/project.ts` should be deleted rather than left unused, and no in-scope command may read or write `<project>/.mawm/graphs/manifest.json` afterward.
- `init` must still initialize global MAWM config when missing, but it must not create `<project>/.mawm` unless `-i` planning assets or project agent assets require it.
- `init -i`, `init -a <agent>`, `init -ia <agent>`, and `init -g -a <agent>` keep their existing meanings; only the removed graphs scaffold and its output line should change their observable behavior.
- `scripts/copy-assets.mjs` should stay unchanged unless the build proves otherwise; the existing wipe-and-copy behavior is already sufficient to drop deleted graph assets from `dist/assets`.
- The workflow-template distribution test must stop depending on project-local installed copies and instead prove the built CLI installs and launches from the global workflow roots under a temp `HOME`.

## Implementation Plan

1. Simplify the workflow-management command surfaces in `install`, `update`, `remove`, and `list`: remove the `global` option definitions, rewrite usage/description strings to the global-only model, and collapse each command to the current global code path.
2. In `install`, delete the project-local branch entirely and keep the existing source-path install flow as the only path, still defaulting the optional argument to `.` and still recording `absolutePath` in the global manifest.
3. In `update`, keep the `-i` planning branch first, remove the old `GLOBAL_PLANNING_ERROR`, make the non-planning path always read `~/.config/mawm/manifest.json`, and delete `src/utils/update/project.ts` plus any now-dead imports.
4. In `remove` and `list`, make the user-config root the only workflow location, update descriptions/usages accordingly, and keep existing missing-root / empty-directory handling intact.
5. In `init`, remove the project-local graphs asset constant, the `graphs` bookkeeping/output line, and the `copyMissing(..., join(mawmRoot, "graphs"))` call. Leave `-g`, `-i`, `-a`, template mode, overwrite prompts, and agent-asset logic otherwise unchanged.
6. Delete `src/assets/.mawm.project-local/graphs/manifest.json`. Do not change `scripts/copy-assets.mjs` unless `bun run build` exposes a real stale-path dependency.
7. Rewrite `test/cli/install.test.ts` to keep alias/help coverage, convert the current global install cases to default `install` behavior with no `-g`, remove the project-install cases, and add a removed-flag failure case for `-g`.
8. Rewrite `test/cli/update.test.ts` to keep alias/help and planning-asset coverage, replace the old `-g` planning-combination test with removed-flag coverage, delete the project-update scenarios, convert the existing global-update scenarios to default `update`, and keep the one/all-workflow failure-isolation assertions.
9. Rewrite `test/cli/remove.test.ts` and `test/cli/list.test.ts` so their existing global cases become the defaults, project-scope expectations disappear, and removed-flag coverage is added where useful.
10. Rewrite `test/cli/init.test.ts` so outputs and filesystem assertions no longer expect `.mawm/graphs`, while the rest of the init matrix stays intact, including `-g` flows.
11. Rewrite `test/assets/workflow-template-distribution.test.ts` so it builds, installs each template once via the global-only `install` command into a temp `HOME`, asserts the installed roots under `~/.config/mawm`, confirms the deleted graphs scaffold is absent from built assets, and launches both templates from their global install roots instead of `.mawm/graphs` copies.
12. Run the targeted suites first, then build and full repo verification. If verification finds more stale `.mawm/graphs` or `-g` assumptions inside the scoped files, clean only those references.

## Verification Commands

- `bun run build`
- `bun run test -- test/cli/install.test.ts`
- `bun run test -- test/cli/update.test.ts`
- `bun run test -- test/cli/remove.test.ts`
- `bun run test -- test/cli/list.test.ts`
- `bun run test -- test/cli/init.test.ts`
- `bun run test -- test/assets/workflow-template-distribution.test.ts`
- `bun run typecheck`
- `bun run lint:all`
- `bun run test`

## Smoke Verification

- Mode: `headless`
- Method: run `bun run build`, the rewritten CLI suites, and `test/assets/workflow-template-distribution.test.ts`; the distribution test must prove that the built CLI installs workflow templates directly into a temp `HOME` global config, no project `.mawm/graphs` copy is needed, launches succeed from the global install roots, and the deleted graphs scaffold no longer appears in shipped assets.
- Manual instructions, if needed: none

## Completion Gate

- `install`, `update`, `remove`, and `list` are global-only and no longer accept `-g`/`--global`.
- `init` no longer creates or references `.mawm/graphs`, while its existing planning and agent-asset flows remain intact.
- `src/utils/update/project.ts` and `src/assets/.mawm.project-local/graphs/` are gone with no remaining in-scope behavior depending on them.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

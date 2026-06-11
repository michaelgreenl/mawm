# Run Spec: Refresh agent planning assets with `mawm update -i`

## Assigned Workflow

`unassigned`

Ad-hoc run. The execution workflow or implementation agent is selected when the run is executed.

## Task

Add a project-local planning-asset refresh mode at `mawm update -i` so managed assets under `.mawm/agents` can be refreshed from the shipped bundle without overwriting user-authored planning state.

## Current State

- `src/cmd/surface/update.ts` only supports workflow reinstall behavior. It accepts `-g` plus an optional workflow id, then reads workflow manifests and dispatches to `updateProjectWorkflow` or `updateGlobalWorkflow`.
- `src/cmd/surface/init.ts` is currently the only path that seeds `.mawm/agents`. `init -i` copies `src/assets/.mawm.project-local/agents` with `copyMissing`, so reruns never refresh existing planning assets.
- `src/utils/update/` currently contains workflow refresh helpers only (`global.ts`, `project.ts`, `shared.ts`); there is no planning-asset refresh helper or managed-path allowlist.
- The shipped project-local planning bundle currently contains `_templates/run-spec.template.md`, `_templates/roadmap.template.md`, `_templates/initiative-spec.template.md`, `adhoc/README.md`, `initiatives/README.md`, `initiatives/manifest.json`, and `initiatives/roadmap.md`.
- `test/cli/update.test.ts` covers workflow update flows only, and `README.md` documents only workflow-oriented `mawm update` forms.
- `src/assets/.mawm.project-local/agents/initiatives/README.md` currently references `.mawm/initiatives/roadmap.md`; if that shipped doc remains unchanged, the new refresh path would continue to propagate an incorrect path reference.

## Goal (Run Outcome)

- `mawm update -i` can seed a fresh `.mawm/agents` workspace and refresh managed planning assets in an existing one.
- Overwrite behavior is limited to an explicit managed planning-asset set rather than the entire workspace.
- Existing user-authored roadmap and run-planning docs remain untouched.
- CLI help/output, shipped planning docs, README guidance, and tests describe this as a safe, scoped project-local planning-asset refresh.

## Scope

- CLI handling in `src/cmd/surface/update.ts`
- One helper under `src/utils/update/` for planning-asset path selection and copy behavior
- Project-local planning asset refresh logic for `.mawm/agents`
- Tests in `test/cli/update.test.ts`
- `README.md` command docs and examples that mention `update`
- Shipped planning-asset docs under `src/assets/.mawm.project-local/agents/**` only where needed to keep refreshed guidance accurate

## Out of Scope

- Workflow update semantics for `.mawm/graphs/**` or `~/.config/mawm/**`
- Changes to `mawm init -i` behavior beyond keeping messaging consistent with the new `update -i` path
- Any global planning-asset refresh mode
- Overwriting or deleting user planning docs such as `initiatives/roadmap.md`, `initiatives/active/**`, `initiatives/queued/**`, `initiatives/archived/**`, or ad-hoc run docs
- New manifest or version-migration machinery for planning assets

## Contracts

- When `-i` is present, `update` must select planning-assets mode before any workflow manifest read so the command works in a fresh project with no `.mawm/graphs/manifest.json`.
- `mawm update -i` is project-local only and must reject `-g`.
- `mawm update -i` must reject a positional workflow argument.
- The source bundle for this mode is `src/assets/.mawm.project-local/agents`.
- On a project with no `.mawm/agents`, the command seeds the current planning bundle into `.mawm/agents`, including `initiatives/roadmap.md`.
- On an existing `.mawm/agents` workspace, overwrite-allowed managed paths are only:
  - `.mawm/agents/_templates/**`
  - `.mawm/agents/adhoc/README.md`
  - `.mawm/agents/initiatives/README.md`
  - `.mawm/agents/initiatives/manifest.json`
- `.mawm/agents/initiatives/roadmap.md` is create-only: seed it if missing, never overwrite it if it already exists.
- Never overwrite or delete `.mawm/agents/initiatives/active/**`, `.mawm/agents/initiatives/queued/**`, `.mawm/agents/initiatives/archived/**`, or ad-hoc run docs under `.mawm/agents/adhoc/**` other than the shipped README.
- v1 does not delete extra user files or directories outside the managed refresh set.
- On any managed-path creation or refresh, stdout is `Updated project planning assets in .mawm/agents.`.
- When no managed file changes and no create-only file is added, stdout is `No changes required.`.
- Validation failures follow the existing `update` command usage and error style.

## Implementation Plan

1. Update `src/cmd/surface/update.ts` to add a boolean `-i` planning-assets mode and split control flow into planning-assets, global workflow, and project workflow branches.
2. Validate invalid combinations before manifest IO. Update description, usage, and help text so workflow reinstall usage and the `update -i` planning-assets mode are both clear.
3. Add a planning-assets helper under `src/utils/update/` that targets `src/assets/.mawm.project-local/agents`, seeds missing directories and files with `copyMissing`, overwrites only the allowlisted managed paths with `copyRecursive`, treats `initiatives/roadmap.md` as create-only, and returns a single `changed` boolean to drive command output.
4. Extend `test/cli/update.test.ts` to cover:
   - `--help` and usage text for the new mode
   - rejecting `-g -i` and `update -i <workflow>`
   - first-time `update -i` workspace creation
   - overwriting stale managed template, README, and manifest files
   - preserving a custom `initiatives/roadmap.md`
   - preserving user-authored docs under `initiatives/active/` and `adhoc/active/`
   - a second `update -i` no-op returning `No changes required.`
5. Update `README.md` to document `mawm update -i` as the supported project planning-asset refresh path, and correct the shipped `src/assets/.mawm.project-local/agents/initiatives/README.md` roadmap reference so refreshed docs remain internally consistent.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`
- `bun run test -- test/cli/update.test.ts`
- `bun run test`
- `bun run build`

## Smoke Verification

- Mode: `headless`
- Method: create a temp project with no `.mawm/agents`, run `mawm update -i`, verify the workspace is seeded, then modify `adhoc/README.md`, `initiatives/manifest.json`, and one template file plus custom `initiatives/roadmap.md` and `initiatives/active/` content, rerun `mawm update -i`, and verify managed files refresh while the custom roadmap and active docs remain unchanged.
- Manual instructions, if needed: none

## Completion Gate

- In-scope implementation is complete.
- Code review is clear or all findings are resolved.
- Verification commands pass.
- Smoke verification passes.
- No branch or PR work is required for this ad-hoc run.

> This ad-hoc run spec is for:
> `.mawm/agents/adhoc/active/update-agent-planning-assets/spec.md`

> Notes
>
> - Ad-hoc runs do not require an assigned workflow.
> - This run is execution-ready and can be handed to a direct implementation agent or a user-selected coding workflow.
> - No branch or PR planning is required for this run.

# Ad-Hoc Run Spec: Refresh agent planning assets with `mawm update -i`

## Execution Routing

- Workflow/Agent: `unassigned`
- Recommended executor: implementation agent or coding workflow selected at execution time
- Branch / PR: not required

## Task

Implement a project-local planning-asset refresh flow at `mawm update -i` so shipped planning templates and other managed planning assets can be updated in place without treating those overwrites as destructive replacement of user-authored planning docs.

## Current State

- `mawm init -i` seeds `.mawm/agents` from `src/assets/.mawm.project-local/agents` with `copyMissing`, so reruns never refresh existing planning assets.
- `mawm update` currently updates workflows only and has no planning-asset mode.
- Shipped project planning assets currently include `_templates/**`, `adhoc/README.md`, `initiatives/README.md`, `initiatives/manifest.json`, and the seeded placeholder `initiatives/roadmap.md`.
- `initiatives/roadmap.md` and docs under `initiatives/active/`, `initiatives/queued/`, and `initiatives/archived/` are user-authored planning state and must not be blindly overwritten.
- Existing destructive-safety language in the repo covers git-style destructive actions and global config overwrite refusal, but there is no explicit contract yet for scoped planning-asset refresh.

## Goal (Run Outcome)

- `mawm update -i` refreshes managed planning assets under `.mawm/agents`.
- Managed template and seed-doc paths covered by the refresh contract may be overwritten by this command by design.
- User-authored roadmap and run-planning docs remain untouched.
- CLI help text, README guidance, and tests describe this as a safe, scoped refresh path for planning assets.
- No branch or PR setup is required.

## Scope

- CLI handling in `src/cmd/surface/update.ts`
- A helper under `src/utils/update/` if needed to keep planning-asset path selection out of the command surface
- Project-local planning asset refresh logic for `.mawm/agents`
- Tests in `test/cli/update.test.ts`
- README command docs and examples that mention `update`

## Out of Scope

- Workflow update semantics for `.mawm/graphs/**` or `~/.config/mawm/**`
- Changes to `mawm init -i` behavior beyond keeping messaging consistent with the new `update -i` path
- Any global planning-asset refresh mode
- Overwriting or deleting user planning docs such as `initiatives/roadmap.md`, `initiatives/active/**`, `initiatives/queued/**`, `initiatives/archived/**`, or ad-hoc run docs
- New manifest/version migration machinery for planning assets

## Contracts

- `mawm update -i` is project-local only and must reject `-g`.
- `mawm update -i` must reject a workflow positional argument.
- The command may create missing `.mawm/agents` directories and files as needed; it must not require a preexisting initiative workspace.
- The refresh contract may overwrite only these managed paths:
  - `.mawm/agents/_templates/**`
  - `.mawm/agents/adhoc/README.md`
  - `.mawm/agents/initiatives/README.md`
  - `.mawm/agents/initiatives/manifest.json`
- The refresh contract must preserve:
  - `.mawm/agents/initiatives/roadmap.md`
  - `.mawm/agents/initiatives/active/**`
  - `.mawm/agents/initiatives/queued/**`
  - `.mawm/agents/initiatives/archived/**`
  - ad-hoc run docs under `.mawm/agents/adhoc/**` other than the shipped README
- v1 does not delete extra files that are not part of the managed refresh set.
- This refresh path is non-destructive by contract because it overwrites only managed planning-asset paths and leaves user-authored planning state intact.
- On change, stdout should be `Updated project planning assets in .mawm/agents.`.
- On a managed-path no-op, stdout should remain `No changes required.`.
- Validation failures should follow the existing `update` command error/usage style.

## Implementation Plan

1. Extend `update` command option parsing to accept `-i` as a planning-asset refresh mode and short-circuit workflow update handling when present.
2. Add validation for invalid combinations such as `-g -i` and `update -i <workflow>`, and update the `update` usage/help text to show the new mode.
3. Add a dedicated refresh helper that:
   - seeds missing `.mawm/agents` content from `src/assets/.mawm.project-local/agents`
   - overwrites only the managed refresh paths via `copyRecursive`
   - returns whether any file changed so the command can emit either the update message or `No changes required.`
4. Add CLI tests for:
   - updated `--help` / usage text
   - first-time `update -i` workspace creation
   - overwriting stale managed template, README, and manifest files
   - preserving custom `initiatives/roadmap.md` and active planning docs
   - rejecting invalid flag combinations
5. Update README quick-start/reference text to document `mawm update -i` as the supported planning-asset refresh path.

## Verification Commands

- `bun run typecheck`
- `bun run lint`
- `bun run test -- test/cli/update.test.ts`
- `bun run test`
- `bun run build`

## Smoke Verification

- Mode: `headless`
- Method: create a temp project with stale contents in managed planning-asset files plus custom contents in `.mawm/agents/initiatives/roadmap.md`, run `mawm update -i`, and verify that managed paths refresh while the custom roadmap content remains unchanged.
- Manual instructions, if needed: none

## Completion Gate

- `mawm update -i` works in a clean temp project and in a project with stale managed planning assets.
- Managed planning-asset paths are refreshed in place.
- User planning docs remain unchanged.
- CLI help/output and README are aligned with the shipped behavior.
- Verification commands pass.
- No branch or PR work is required for this ad-hoc run.

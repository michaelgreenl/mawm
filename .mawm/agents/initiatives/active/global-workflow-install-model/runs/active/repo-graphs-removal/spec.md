# Run Spec: Run 4: Migrate this repo off the committed project-local install

## Assigned Workflow

`coding`

## Task

Finish this repo's migration off the committed project-local workflow copy by reconciling the active planning docs to the actual initiative-branch state and re-verifying that this repo executes the `coding` workflow only from `~/.config/mawm/coding`.

## Current State

- The repo is already off the committed project-local install on the current initiative branch: `git diff --name-status main..HEAD -- ".mawm/graphs"` shows all former `.mawm/graphs/coding/**` files and `.mawm/graphs/manifest.json` deleted, and `git ls-tree -r --name-only HEAD -- ".mawm/graphs"` returns nothing.
- The working-tree `.mawm/` directory now contains only `agents/` and ignored runtime logs under `logs/`; any existing `.mawm/logs/coding/` artifacts are runtime state from global workflow execution, not committed workflow assets, and must be preserved.
- Product code and current user-facing docs already reflect the global model: `src/cmd/surface/install.ts:11-76`, `.opencode/tools/execute-graph.ts:587-659`, `README.md:59-119`, and `.mawm/agents/_templates/run-spec.template.md:13-32` no longer point to `.mawm/graphs`, and `rg -n "\.mawm/graphs" src .opencode README.md .mawm/agents/_templates` is clean.
- The remaining mismatch is in active planning state: `.mawm/agents/initiatives/active/global-workflow-install-model/spec.md:84-95` still describes Run 4 as a pending filesystem deletion from a repo state that no longer exists.

## Goal (Run Outcome)

- Run 4 has an implementation-ready source of truth that matches the actual initiative branch: the repo-local workflow copy is already gone, and the remaining work is reconciliation plus final verification.
- Active initiative planning docs no longer claim that `.mawm/graphs/` is still present in this repo or that deleting it is the outstanding code change for Run 4.
- Manual smoke verification confirms this repo still executes `coding` through `~/.config/mawm/coding` and keeps runtime state under `.mawm/logs/coding/` without recreating `.mawm/graphs/`.

## Scope

- `.mawm/agents/initiatives/active/global-workflow-install-model/spec.md`
- `.mawm/agents/initiatives/roadmap.md` only if its active-state wording must change to stay consistent with the revised Run 4 entry
- Final verification and smoke evidence for this run's planning assertions

## Out of Scope

- Any further code or asset changes under `src/`, `.opencode/`, `test/`, or `dist/`
- Any attempt to delete `.mawm/graphs/` again on the current branch
- Modifying the contents of `~/.config/mawm/coding` beyond optional HITL reinstall or update if the global copy is stale
- Editing or deleting `.mawm/logs/**`
- Rewriting completed run specs or ad-hoc planning docs that mention `.mawm/graphs` only as historical change context

## Contracts

- `.mawm/graphs/` must remain absent from both `HEAD` and the working tree; this run must not reintroduce or recreate it.
- `.mawm/agents/**` planning assets remain intact, and `.mawm/logs/**` remains ignored runtime state; do not delete, stage, or otherwise modify the runtime-log tree as part of this run.
- Rewrite the parent initiative spec's Run 4 section instead of layering notes on top of the stale deletion plan. After this run, the active initiative spec must describe the actual branch state after Runs 1-3.
- Treat current-truth and historical references differently: product paths (`src`, `.opencode`, `README.md`, `.mawm/agents/_templates`) must stay free of `.mawm/graphs` references, but historical mentions inside completed run specs or ad-hoc specs are out of scope unless they create a live contradiction in the parent initiative spec or roadmap.
- Manual smoke verification still uses the real globally installed `coding` workflow. Do not inspect secrets, env files, or arbitrary contents under `~/.config/mawm`; only confirm presence or currentness as needed for HITL smoke instructions.
- If updating the parent initiative spec makes the roadmap materially inconsistent, update the roadmap in the same pass. Otherwise leave it unchanged.

## Implementation Plan

1. Confirm the current branch state before editing planning docs: `.mawm/graphs/` is already deleted relative to `main`, absent from `HEAD`, and not recreated in the working tree.
2. Rewrite the Run 4 section in `.mawm/agents/initiatives/active/global-workflow-install-model/spec.md` so its task, current state, outcome, scope, contracts, verification, and smoke text match the actual initiative-branch state: repo-local workflow copy already gone, product paths already migrated, remaining work is doc reconciliation plus validation.
3. Update `.mawm/agents/initiatives/roadmap.md` only if the revised Run 4 wording would otherwise leave the active roadmap contradicting the initiative spec about what work is still outstanding.
4. Run scoped audits proving product paths remain clean of `.mawm/graphs` references and that `HEAD` still contains no `.mawm/graphs/` tree, then run the standard repo verification commands.
5. Complete the manual smoke path from this repo: HITL confirms `~/.config/mawm/coding` is installed and current, invokes `execute-graph` against `coding`, and confirms the tool resolves the global workflow root, returns a runtime `logPath` under `.mawm/logs/coding/`, keeps runtime files there, and does not recreate `.mawm/graphs/`.

## Verification Commands

- `git diff --name-status main..HEAD -- ".mawm/graphs"`
- `git ls-tree -r --name-only HEAD -- ".mawm/graphs"`
- `rg -n "\.mawm/graphs" src .opencode README.md .mawm/agents/_templates`
- `bun run typecheck`
- `bun run lint:all`
- `bun run test`

## Smoke Verification

- Mode: `manual`
- Method: HITL performs one trivial `execute-graph` invocation from this repo against the globally installed `coding` workflow and confirms the returned workflow root is under `~/.config/mawm/coding`, runtime artifacts stay under `.mawm/logs/coding/`, and no `.mawm/graphs/` directory is recreated.
- Manual instructions, if needed: If `~/.config/mawm/coding` is missing or stale, refresh it first from the workflow's dist output with `mawm install <workflow-or-path>`, then rerun the smoke invocation. Do not commit or inspect files inside `.mawm/logs/coding/`; only verify that the runtime path is used and remains ignored.

## Completion Gate

- The parent initiative spec no longer claims Run 4's remaining work is to delete an existing `.mawm/graphs/` tree from the current branch.
- Active planning docs now reflect the real initiative-branch state: this repo is already off the committed project-local install, and Run 4 finishes with reconciliation plus validation rather than new product-code changes.
- `git diff main..HEAD` still shows the `.mawm/graphs/**` deletion relative to `main`, and `git ls-tree HEAD -- ".mawm/graphs"` remains empty.
- Product paths still contain no current-truth `.mawm/graphs` references.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

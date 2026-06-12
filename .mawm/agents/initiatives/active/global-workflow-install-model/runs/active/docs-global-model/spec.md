# Run Spec: Run 3: Prompts, templates, and README describe the global model

## Assigned Workflow

`coding`

## Task

Rewrite the repo-local and shipped prompt/template docs plus `README.md` so they describe the already-shipped global workflow model: installed workflows live under `~/.config/mawm/<workflow>`, workflow-management CLI commands are global-only, and any project-local workflow runtime state lives under `<target-project>/.mawm/logs/<workflow>`.

## Current State

- `src/cmd/surface/install.ts:11-76`, `src/cmd/surface/list.ts:5-34`, `src/cmd/surface/remove.ts:47-78`, and `src/cmd/surface/update.ts:13-70` already implement the global-only CLI surface, while `.opencode/tools/execute-graph.ts:590-594` and `src/assets/.config/agents/opencode/tools/execute-graph.ts:590-594` already describe global workflow execution with project-local runtime logs. The remaining mismatch is documentation, not code behavior.
- `.opencode/agents/workflow-runner.md:18-20` and `src/assets/.config/agents/opencode/agents/workflow-runner.md:18-20` still point their source-of-truth bullets at `<target-project>/.mawm/graphs/<workflow-name>/...`.
- `.opencode/agents/mawma-manager.md:24-25` and `src/assets/.config/agents/opencode/agents/mawma-manager.md:24-25` still say installed workflows and workflow metadata live under `<target-project>/.mawm/graphs/...`.
- `.opencode/agents/mawma-planner.md:81` and `src/assets/.config/agents/opencode/agents/mawma-planner.md:37,109` still require assigned workflows to exist under `<target-project>/.mawm/graphs/`. The mirror pair is also already out of sync beyond that stale path wording: the shipped asset copy is the richer prompt body, while the repo-local mirror is older.
- `.mawm/agents/_templates/run-spec.template.md:17` and `src/assets/.mawm.project-local/agents/_templates/run-spec.template.md:17` still use `<workflow-name-under-.mawm/graphs>`. The other template files in those directories do not currently reference the old install model.
- `README.md:59-109` still documents the removed dual-mode CLI (`mawm install -g`, project-local `mawm install <workflow-id>`, `mawm list -g`, `mawm update -g`, `mawm remove -g`). `README.md:111-117` still says shipped assets include project-local workflow manifests. `README.md:122-133` still treats global execution as future `Post-v0.1.0` direction instead of current behavior.

## Goal (Run Outcome)

- All in-scope prompts, templates, and README sections describe globally installed workflows under `~/.config/mawm/<workflow>` with project-local `.mawm/` reserved for planning docs and runtime logs.
- `README.md` matches the current CLI and tool behavior exactly: `install`, `list`, `update`, and `remove` are global-only; `init -i` and `update -i` stay project-local planning-asset operations; running workflows via `execute-graph` uses global roots and project-local `.mawm/logs/<workflow>`.
- `.opencode/agents/*.md` and their shipped `src/assets/.config/agents/opencode/agents/*.md` counterparts end text-identical, and the touched planning template mirrors under `.mawm/agents/_templates/` and `src/assets/.mawm.project-local/agents/_templates/` end text-identical.
- Scoped audits over only the in-scope paths find no current-truth `.mawm/graphs` or dual install-model references.

## Scope

- `.opencode/agents/{workflow-runner,mawma-manager,mawma-planner}.md`
- `src/assets/.config/agents/opencode/agents/{workflow-runner,mawma-manager,mawma-planner}.md`
- `.mawm/agents/_templates/{run-spec,roadmap,initiative-spec}.template.md`
- `src/assets/.mawm.project-local/agents/_templates/{run-spec,roadmap,initiative-spec}.template.md`
- `README.md`

## Out of Scope

- CLI or `execute-graph` code changes
- Test logic changes unless an existing in-scope asset assertion is already hardcoded to superseded text and must move with the doc rewrite
- Deleting this repo's committed `.mawm/graphs/` tree from Run 4
- Rewriting active initiative specs, completed run specs, roadmap notes, or other historical planning docs that mention `.mawm/graphs` as change context rather than current product truth
- Broader README or prompt rewrites unrelated to the global install model

## Contracts

- Installed workflow location text must match current code, not planned future behavior: workflows live at `~/.config/mawm/<workflow>`, with `mawm.json` and `langgraph.json` there; project-local `.mawm/` contains planning docs under `.mawm/agents/` and runtime state under `.mawm/logs/<workflow>/` when workflows run.
- README command examples must match the actual current command surface exactly.
- `mawm init [-g] [-i] [-a <agent>] [-t [type]]` remains the `init` usage shown in docs.
- `mawm [i, install] [workflow-or-path]` is the only documented `install` form.
- `mawm list` is the only documented `list` form.
- `mawm [u, update] [workflow] | -i` is the documented `update` usage.
- `mawm [rm, remove] <workflow>` is the documented `remove` usage.
- `init -g` stays documented because it still controls global config and global agent-asset installation; this run must not present it as a removed workflow-scope flag.
- End state for mirrored docs is exact parity, not merely similar wording: each `.opencode/agents/*.md` file must match its shipped `src/assets/.config/agents/opencode/agents/*.md` counterpart exactly, and each touched template file under `.mawm/agents/_templates/` must match its shipped counterpart exactly.
- Resolve the current `mawma-planner.md` divergence by keeping the richer prompt body and applying the global-model wording there, then mirroring that final text to both copies.
- The run-spec template must stop naming workflows relative to `.mawm/graphs`; use wording that reflects a globally installed workflow name and, if needed, a short note that the assigned workflow comes from `~/.config/mawm/`.
- No in-scope doc may describe `.mawm/graphs/`, `mawm install -g`, `mawm list -g`, `mawm update -g`, `mawm remove -g`, or `project-local or global workflows` as current behavior.
- Keep the edits surgical. Do not rewrite unrelated sections just to normalize tone or structure.

## Implementation Plan

1. Re-read the current CLI surface and `execute-graph` tool description so the documentation rewrite mirrors shipped behavior rather than the stale initiative summary.
2. Update the shipped agent prompts under `src/assets/.config/agents/opencode/agents/` so their source-of-truth and rule text point to `~/.config/mawm/<workflow>` and, where runtime location matters, `<target-project>/.mawm/logs/<workflow>` instead of `.mawm/graphs`.
3. Copy the finalized prompt text into `.opencode/agents/` so `workflow-runner`, `mawma-manager`, and `mawma-planner` each end as exact repo/shipped mirror pairs. Use this step to eliminate the existing `mawma-planner` prompt-body drift as well as the stale path wording.
4. Update both `run-spec.template.md` copies so the assigned-workflow placeholder and any supporting note reflect a globally installed workflow name rather than `.mawm/graphs`.
5. Audit `roadmap.template.md` and `initiative-spec.template.md` in both template directories, but leave them unchanged unless a stale current-truth install-model reference is actually present.
6. Rewrite `README.md`'s `Workflow Management` section so it describes only the global workflow-management commands and keeps `init -i` and `update -i` as project planning-asset operations.
7. Rewrite `README.md`'s `Command Reference`, `Shipped Assets`, `Running Workflows`, and `Status` sections so they match the current command usage, remove the project-local workflow-manifest claim, explain `execute-graph`'s global-root plus project-local-runtime model, and remove the now-delivered post-v0.1.0 global-execution bullet.
8. Run scoped text audits over `README.md`, `.opencode/agents/`, `src/assets/.config/agents/opencode/agents/`, `.mawm/agents/_templates/`, and `src/assets/.mawm.project-local/agents/_templates/` to catch lingering `.mawm/graphs` or dual-model wording, then fix only those in-scope references.
9. Verify exact mirror parity with `diff -u` across the agent and template pairs, then run the standard repo verification commands.

## Verification Commands

- `rg -n "\.mawm/graphs" README.md .opencode/agents src/assets/.config/agents/opencode/agents .mawm/agents/_templates src/assets/.mawm.project-local/agents/_templates`
- `rg -n "mawm install -g|mawm list -g|mawm update -g|mawm remove -g|copies into \.mawm/graphs|project-local or global workflows|workflow manifests|Running globally installed workflows with project-local customization" README.md`
- `diff -u ".opencode/agents/mawma-manager.md" "src/assets/.config/agents/opencode/agents/mawma-manager.md"`
- `diff -u ".opencode/agents/mawma-planner.md" "src/assets/.config/agents/opencode/agents/mawma-planner.md"`
- `diff -u ".opencode/agents/workflow-runner.md" "src/assets/.config/agents/opencode/agents/workflow-runner.md"`
- `diff -u ".mawm/agents/_templates/run-spec.template.md" "src/assets/.mawm.project-local/agents/_templates/run-spec.template.md"`
- `diff -u ".mawm/agents/_templates/roadmap.template.md" "src/assets/.mawm.project-local/agents/_templates/roadmap.template.md"`
- `diff -u ".mawm/agents/_templates/initiative-spec.template.md" "src/assets/.mawm.project-local/agents/_templates/initiative-spec.template.md"`
- `bun run test -- test/cli/init.test.ts`
- `bun run test -- test/cli/update.test.ts`
- `bun run typecheck`
- `bun run lint:all`
- `bun run test`

## Smoke Verification

- Mode: `headless`
- Method: the scoped `rg` audits must show no current-truth old-model wording in the in-scope docs, the mirror `diff -u` commands must be empty, and `test/cli/init.test.ts` plus `test/cli/update.test.ts` must still prove the shipped agent and planning assets can be initialized or refreshed without drift.
- Manual instructions, if needed: none

## Completion Gate

- Every in-scope prompt, template, and README reference reflects the current global workflow model and no longer describes `.mawm/graphs` or dual-mode workflow-management commands as present behavior.
- `.opencode/agents/*` and shipped prompt copies are text-identical, and the template mirror pairs remain text-identical.
- README command snippets and workflow-location language match the actual current codebase.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

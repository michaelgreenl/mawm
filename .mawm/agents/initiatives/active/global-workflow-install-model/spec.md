# Global Workflow Install Model - Initiative Spec Sheet

## Source of Truth Rules

- When initiative direction changes, update every affected active doc in the same pass.
- Any run specs created under `runs/active/` must match the run summaries in this spec.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.

## Target State

Workflows are installed, updated, listed, removed, and executed from a single global location: `~/.config/mawm/<workflow-id>/`. The project-local executable copy under `<project>/.mawm/graphs/` no longer exists anywhere in the product or in this repo.

- The `execute-graph` tool resolves workflows at `~/.config/mawm/<workflow-id>/` and executes them there. It never looks for `<project>/.mawm/graphs/`.
- Per-project workflow runtime state (generated runtime `langgraph` config, dev-server log, dev-server state file, and LangGraph `.langgraph_api/` persistence) lives in a lazily created, self-ignored directory at `<target-project>/.mawm/logs/<workflow-id>/`. Each project tracks its own dev server for a given global workflow.
- Workflow code and its lazily installed `node_modules/` stay in the global workflow directory, shared by all projects.
- CLI workflow commands (`install`, `update`, `remove`, `list`) operate only on the global location. The `-g`/`--global` flag is removed everywhere. `update`'s default behavior is what `update -g` does today.
- The project-local `.mawm/` directory contains only planning assets (`.mawm/agents/`) and runtime logs (`.mawm/logs/`). `init` no longer scaffolds `.mawm/graphs/`. The `-i` planning-asset modes of `init` and `update` are unchanged.
- Shipped opencode agent prompts, planning templates, and the README describe the global model with no stale `.mawm/graphs/` references.
- This repo itself runs on the new model: the committed `.mawm/graphs/` copy of the `coding` workflow is deleted, and initiative runs execute via the globally installed `~/.config/mawm/coding`.

## Initiative-wide Contracts

- Global workflow root: `~/.config/mawm/<workflow-id>/`, resolved with the same home-directory precedence as `src/config/user-config.ts` (`HOME` → `USERPROFILE` → `HOMEDRIVE`+`HOMEPATH` → `os.homedir()`). The standalone `execute-graph` tool must implement this resolution itself; it cannot import `src/config/user-config.ts` because it ships as a self-contained asset with `execute-graph-lib.ts`.
- Per-project runtime directory: `<target-project>/.mawm/logs/<workflow-id>/`, created lazily by `execute-graph` on first use, containing a `.gitignore` whose content is `*` so nothing inside is ever committed.
- Runtime-state ownership: everything mutable and per-project (`langgraph.runtime.json`, `.langgraph-dev.json` server state, `.langgraph-dev.log`, `.langgraph_api/` persistence) must end up under `<target-project>/.mawm/logs/<workflow-id>/`. Everything shared and immutable-per-version (workflow code, source `langgraph.json`, `mawm.json`, assets, `node_modules/`) stays in the global workflow directory.
- LangGraph CLI reality: `langgraph dev --config <path>` sets the API server's `projectCwd` to `dirname(<path>)`. The server resolves graph/auth/http/ui paths and writes `.langgraph_api/` relative to that same `projectCwd`; there is no supported separate persistence-directory flag. Therefore `execute-graph` must not pass the global workflow's source `langgraph.json` directly. It must generate `<target-project>/.mawm/logs/<workflow-id>/langgraph.runtime.json` from the global workflow's source config and rewrite path-like fields to absolute paths rooted at `~/.config/mawm/<workflow-id>/`.
- Runtime config normalization: for current MAWM LangGraph.js workflows, normalize `graphs` string values or object `path` values, `auth.path`, `http.app`, `ui` definition values, and string `env` paths. Preserve non-path config fields unchanged. Do not read env files or print env values. If a workflow config uses unsupported path-bearing fields that cannot be safely normalized, fail with a clear error instead of falling back to global persistence.
- Spawn contract: run `langgraph dev` with `--config <runtime-dir>/langgraph.runtime.json`, `--port <free-port>`, `--no-browser`, and `--no-reload`; use the global workflow root as the process cwd so workflow package resolution and existing `process.cwd()` behavior continue to match today's executable-copy model. The generated config directory becomes LangGraph's `projectCwd`, so `.langgraph_api/` lands in the project runtime directory while graph code loads from absolute global paths.
- Concurrency: two projects executing the same global workflow must not collide. Each project's server gets its own port (an available port selected at spawn time and passed explicitly to `langgraph dev`) and its own persistence directory. Server reuse logic (live PID + `/ok` check) keys off the project's own state file.
- The global manifest `~/.config/mawm/manifest.json` (including `absolutePath` source tracking for `update`) remains the single workflow registry. The project-local `.mawm/graphs/manifest.json` concept is deleted, not relocated.
- v0 pre-release: no backward compatibility or migration shims for existing `.mawm/graphs/` installs in other projects. Stale copies are simply ignored by the new tool and CLI.
- Repo verification commands (used by every run): `bun run typecheck`, `bun run lint:all`, `bun run test`.

## Branch and PR Plan

- Target repo: `mawm` (this repo)
- Base branch: `main`
- Initiative branch: `initiative/global-workflow-install-model`
- Branch creation rule: create the initiative branch from `main` only when implementation is ready to begin.
- Run commit rule: each clean completed run becomes one commit.
- PR rule: open a PR from the initiative branch to `main` after all runs and initiative gates are complete.

## Execution Plan

### Run 1: execute-graph resolves and runs global workflows (`coding`)

- [x] complete
- Run spec path: `.mawm/agents/initiatives/active/global-workflow-install-model/runs/active/execute-graph-global-resolution/spec.md` (created by the assigned workflow when this run starts)
- Task: Rework the `execute-graph` tool (both the repo dev copy at `.opencode/tools/execute-graph.ts` and the shipped asset at `src/assets/.config/agents/opencode/tools/execute-graph.ts`, plus their `execute-graph-lib.ts` helpers as needed) to resolve workflows globally and keep runtime state per-project.
- Current state: `resolveWorkflowLocation` (`.opencode/tools/execute-graph.ts:191-240`) walks up from the OpenCode context directory looking for `<root>/.mawm/graphs/<workflow>`. `ensureLangGraphServer` (lines 375-451) spawns `npx --yes @langchain/langgraph-cli dev --no-browser` with `cwd` set to the workflow root and writes `.langgraph-dev.log`, `.langgraph-dev.json`, and `.langgraph_api/` there. `ensureWorkflowRuntime` (lines 317-349) installs `node_modules` into the workflow root. The tool schema description hardcodes the project-local path contract.
- Outcome: The tool resolves `~/.config/mawm/<workflow>` (home-dir precedence per the initiative contract) and errors clearly when the workflow is not installed globally. `node_modules` is still lazily installed into the global workflow directory. `<target-project>/.mawm/logs/<workflow>/` is created lazily with a self-ignoring `.gitignore` (`*`). Before server launch, the tool generates `<target-project>/.mawm/logs/<workflow>/langgraph.runtime.json` by reading the global workflow's source `langgraph.json` and rewriting path-like fields to absolute paths rooted at the global workflow directory. The dev server is spawned from the global workflow root with `--config <runtime-dir>/langgraph.runtime.json`, an explicitly selected available port, `--no-browser`, and `--no-reload`. All per-project mutable state (`.langgraph-dev.json`, `.langgraph-dev.log`, `.langgraph_api/`) lands in the project runtime directory. Server-reuse logic reads the project-local state file. Tool schema descriptions and the returned `logPath` reflect the new paths. Repo copy and shipped asset stay functionally identical.
- Scope: `.opencode/tools/execute-graph.ts`, `.opencode/tools/execute-graph-lib.ts`, `src/assets/.config/agents/opencode/tools/execute-graph.ts`, `src/assets/.config/agents/opencode/tools/execute-graph-lib.ts`.
- Out of scope: CLI command changes, agent prompt text, README, deleting this repo's committed `.mawm/graphs/`, any other-project migration handling.
- Contracts: Per-project runtime dir, runtime config generation, spawn contract, and global-root resolution exactly as defined in Initiative-wide Contracts. The tool's input schema (workflow, assistantID, input, context, resume, threadID) and result shape (including `logPath`) keep their existing field names; only path semantics change. The tool must never run `langgraph dev` against the global source `langgraph.json` directly, because that would put `.langgraph_api/` in the global workflow directory.
- Verification: `bun run typecheck`, `bun run lint:all`, `bun run test`; `diff` the repo and asset tool copies for functional parity.
- Smoke verification: `manual` - From this repo (which has `~/.config/mawm/coding` installed), invoke the updated `execute-graph` tool against the `coding` workflow far enough to confirm: resolution hits the global directory, the server starts, `.mawm/logs/coding/` is created with `.gitignore`, `langgraph.runtime.json`, log, state, and `.langgraph_api/` files appear there, the runtime config points graph paths at `~/.config/mawm/coding`, no new files appear under `.mawm/graphs/coding/`, and `git status` shows no untracked runtime files. Note for HITL: after this run's commit, restart the OpenCode session if needed so the updated tool file is loaded for subsequent runs.

### Run 2: CLI surface goes global-only (`coding`)

- [x] complete
- Run spec path: `.mawm/agents/initiatives/active/global-workflow-install-model/runs/active/cli-global-only/spec.md` (created by the assigned workflow when this run starts)
- Task: Collapse the dual project/global CLI modes so workflow commands operate only on `~/.config/mawm`, remove the `-g`/`--global` flag everywhere, and stop scaffolding `.mawm/graphs/` in `init`.
- Current state: `src/cmd/surface/install.ts` has a global branch (lines 29-81) and a project branch (lines 83-114). `src/cmd/surface/update.ts` has `-i` planning mode (lines 36-52), `-g` global mode (lines 54-75), and a default project mode (lines 77-95) backed by `src/utils/update/project.ts`. `src/cmd/surface/remove.ts` (project removal lines 79-87) and `src/cmd/surface/list.ts` (line 20) both read `.mawm/graphs`. `src/cmd/surface/init.ts` seeds `.mawm/graphs/manifest.json` (lines 17, 209-211) from `src/assets/.mawm.project-local/graphs/`. Tests in `test/cli/{install,update,remove,list,init}.test.ts` and `test/assets/workflow-template-distribution.test.ts:296-357` encode the dual model.
- Outcome: `install` keeps only today's global behavior (source path → `~/.config/mawm/<id>`, `absolutePath` recorded in the global manifest). `update` keeps `-i` planning mode unchanged and otherwise performs today's `-g` behavior by default; `src/utils/update/project.ts` is deleted. `remove` and `list` operate only on `~/.config/mawm`. No command accepts `-g`/`--global`. `init` no longer creates `.mawm/graphs/`; `src/assets/.mawm.project-local/graphs/` is deleted and `scripts/copy-assets.mjs` output stays consistent. Help text and command output strings describe the global model. All affected tests are rewritten to assert the global-only behavior, including the e2e distribution test exercising build → install → global layout.
- Scope: `src/cmd/surface/{install,update,remove,list,init}.ts`, `src/utils/update/` (delete `project.ts`, adjust `shared.ts`/`global.ts` as needed), `src/assets/.mawm.project-local/graphs/`, `test/cli/{install,update,remove,list,init}.test.ts`, `test/assets/workflow-template-distribution.test.ts`, related help/usage strings.
- Out of scope: `execute-graph` tool files (Run 1), agent prompts/README (Run 3), deleting this repo's committed `.mawm/graphs/` (Run 4), `init -i`/`update -i` planning-asset behavior.
- Contracts: Global manifest schema and `absolutePath`-based update flow are unchanged. `init -a` opencode-asset behavior and `-i` planning-asset behavior are untouched. No migration logic for existing project-local installs (v0, no backward compatibility).
- Verification: `bun run typecheck`, `bun run lint:all`, `bun run test`.
- Smoke verification: `headless` - `bun run test` covering the rewritten CLI suites plus the e2e workflow-template distribution test; additionally run the built CLI (`bun run build` then invoking `install`/`list`/`update`/`remove` against a temp `HOME`) is acceptable as part of the suite, not as a separate manual step.

### Run 3: Prompts, templates, and README describe the global model (`coding`)

- [x] complete
- Run spec path: `.mawm/agents/initiatives/active/global-workflow-install-model/runs/active/docs-global-model/spec.md` (created by the assigned workflow when this run starts)
- Task: Update every shipped and repo-local prompt, planning template, tool description remnant, and README section that still references `.mawm/graphs/` or the dual install model.
- Current state: Shipped agent prompts `src/assets/.config/agents/opencode/agents/{workflow-runner,mawma-manager,mawma-planner}.md` (and their `.opencode/agents/` mirrors in this repo) reference `<target-project>/.mawm/graphs/<workflow>` as the installed-workflow source of truth. `src/assets/.mawm.project-local/agents/_templates/run-spec.template.md:17` (mirrored at `.mawm/agents/_templates/run-spec.template.md`) uses the placeholder `<workflow-name-under-.mawm/graphs>`. README.md lines 59-109 document the dual command model ("copies into .mawm/graphs/") and line 131 lists global execution as a post-v0.1.0 item.
- Outcome: All prompts and templates state that installed workflows live at `~/.config/mawm/<workflow>` and that project-local `.mawm/` holds only planning docs (`agents/`) and runtime logs (`logs/`). README's workflow-management and command-reference sections describe the global-only commands, and the now-delivered post-v0.1.0 bullet is removed or rewritten. Shipped assets and this repo's own `.opencode/`/`.mawm/agents/` mirrors stay in sync.
- Scope: `src/assets/.config/agents/opencode/agents/*.md`, `.opencode/agents/*.md`, `src/assets/.mawm.project-local/agents/_templates/*.md`, `.mawm/agents/_templates/*.md`, `README.md`.
- Out of scope: Code behavior, tests beyond doc-reference assertions if any exist, this repo's committed `.mawm/graphs/` deletion (Run 4).
- Contracts: Prompt path contracts must match the Run 1 tool behavior and Run 2 CLI surface exactly; no doc may describe `.mawm/graphs/` as a current location.
- Verification: `bun run lint:all` (prettier covers md where configured); `rg -n "\.mawm/graphs" src .opencode README.md .mawm/agents/_templates` returns no current-truth references (historical/changelog mentions excluded by inspection); `bun run test` still passes.
- Smoke verification: `headless` - the `rg` audit above plus full `bun run test`.

### Run 4: Migrate this repo off the committed project-local install (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/global-workflow-install-model/runs/active/repo-graphs-removal/spec.md` (created by the assigned workflow when this run starts)
- Task: Delete the committed `<repo>/.mawm/graphs/` tree (the `coding` workflow copy and `manifest.json`) so this repo runs purely on the global model.
- Current state: `.mawm/graphs/coding/` (workflow files committed; runtime junk ignored by its own `.gitignore`) and `.mawm/graphs/manifest.json` are tracked in git. `~/.config/mawm/coding` is installed globally on the development machine. After Runs 1-3, nothing in the product resolves `.mawm/graphs/`.
- Outcome: `.mawm/graphs/` is removed from the repo and from git tracking. `rg -n "\.mawm/graphs"` across the repo returns no current-truth references. Initiative runs in this repo continue to execute via `~/.config/mawm/coding` with runtime state in `.mawm/logs/coding/`.
- Scope: Deletion of `.mawm/graphs/**` from the working tree and index; any leftover repo references discovered by the audit.
- Out of scope: Changes to `~/.config/mawm` contents; product code or docs (complete in prior runs).
- Contracts: `.mawm/agents/` planning docs are untouched. The deletion must not remove `.mawm/logs/` if present.
- Verification: `bun run typecheck`, `bun run lint:all`, `bun run test`; `git status` clean apart from the intended deletions; `rg -n "\.mawm/graphs"` audit.
- Smoke verification: `manual` - HITL confirms `~/.config/mawm/coding` is present and current (re-run `mawm install` from the workflow's dist if stale), then executes a trivial `execute-graph` invocation from this repo and confirms it resolves globally and writes runtime state to `.mawm/logs/coding/`.

## Initiative Verification Gates

- Every run is complete, verified, reviewed, smoke-tested, and committed.
- Manual smoke-test instructions (Runs 1 and 4) have been completed by HITL and recorded.
- `bun run typecheck`, `bun run lint:all`, and `bun run test` pass at the initiative head.
- `rg -n "\.mawm/graphs"` across the repo returns no current-truth references.
- Initiative-wide contracts still match the current codebase after the final run.
- PR from `initiative/global-workflow-install-model` to `main` is opened with the initiative summary and verification evidence.

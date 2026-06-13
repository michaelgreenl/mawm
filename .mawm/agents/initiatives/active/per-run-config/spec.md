# Per-Run Configuration - Initiative Spec Sheet

## Source of Truth Rules

- When initiative direction changes, update every affected active doc in the same pass.
- Any run specs created under `runs/active/` must match the run summaries in this spec.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.

## Target State

Each run can carry a sidecar `run.config.json` next to its `spec.md`, authored by `mawma-planner` during initiative planning and editable by the user before execution. The sidecar declares per-run context that stacks on top of the project-local context from the Project-Local Context Configuration initiative, and per-run model and variant overrides per agent. The OpenCode execution layer and runtime config resolution live in a new shared `@mawm/core` package, exposed at `@mawm/core/opencode`, consumed by the coding workflow and usable by mawm core. Model overrides flow through invoke-time resolution into OpenCode, which still owns provider connectivity and credentials.

- Sidecar path: `.mawm/agents/initiatives/active/<initiative-slug>/runs/active/<run-slug>/run.config.json`, alongside the run `spec.md`.
- Per-run context stacks on top of project-local context; all stacking, duplicates included.
- Per-run model/variant overrides are keyed by kebab agent id; absence falls back to the agent's default model/variant from the coding workflow's `definitions.ts`.
- `@mawm/core/opencode` is the single source of truth for OpenCode execution and config resolution; the coding workflow keeps only its graph, agents, prompts, and wiring.

## Multi-Repo Note

This initiative spans two git repos with one initiative branch and one PR per repo:

- `mawm` owns the new `@mawm/core` package (the lifted OpenCode and config layer, plus per-run context and model resolution) and the `mawma-planner` agent asset that authors sidecars.
- The `coding` workflow repo consumes `@mawm/core/opencode` and removes its in-repo OpenCode layer.
- After the lift, the center of gravity for runtime config and execution is `@mawm/core` (mawm repo); only the consumption run lands in the coding repo.
- Coding-repo runs are launched with `targetRepoPath` pointed at the coding workflow checkout while specs and sidecars stay in this mawm project's `.mawm/agents/`.

## Dependencies

- Depends on the Project-Local Context Configuration initiative: the node injection seam and the project-local config layer are what per-run config extends. The lift in Run 1 moves that layer into `@mawm/core`.

## Initiative-wide Contracts

- The sidecar `run.config.json` is planning input, not a run spec. `mawma-planner` authors it during planning; the user may edit it before execution. `@mawm/core` reads it from the directory of `runSpecPath`.
- Per-run context stacks on top of project-local context; no replace or precedence; duplicates allowed.
- Per-run model/variant overrides are per agent (kebab). OpenCode owns provider connectivity; an absent override uses the agent default.
- `@mawm/core/opencode` is the canonical OpenCode execution and config-resolution layer after Run 1. The coding workflow imports it and holds no private copy.
- `@mawm/core` is a new published package in the mawm workspace; `@mawm/core/opencode` is a subpath export. `@mawm/cli` and the coding workflow both consume `@mawm/core`; the coding workflow bundles it at build.
- `.env` files and their contents are never read, parsed, printed, or inspected.
- Coding-workflow runtime changes only go live after `bun run build:mawm` reinstall into `~/.config/mawm/coding`. Automated verification uses each repo's own toolchain; live smoke requires the reinstall.
- Repo verification commands: `bun run typecheck`, `bun run lint:all`, `bun run test`, `bun run build` in each repo.

## Branch and PR Plan

- Repos, base branches, and initiative branches:
  - `mawm` (`/Users/michaelgreen/Documents/Projects/ai/maw-management/mawm`): base `main`, initiative branch `initiative/per-run-config`. Runs 1, 3, 4.
  - `coding` (`/Users/michaelgreen/Documents/Projects/ai/maw-management/workflows/coding`, remote `coding-workflow`): base `main`, initiative branch `initiative/per-run-config`. Run 2.
- Branch creation rule: create each repo's initiative branch from its base only when implementation in that repo is ready to begin.
- Run commit rule: each completed run becomes one clean commit on its repo's initiative branch.
- PR rule: open one PR per repo from its initiative branch to `main` after that repo's runs and the initiative gates are complete.
- Cross-repo sequencing: Run 1 (mawm) creates `@mawm/core`; Run 2 (coding) consumes it; Runs 3 and 4 (mawm) extend `@mawm/core` and reach agents only after the coding workflow consuming `@mawm/core` is rebuilt and reinstalled.

## Execution Plan

### Run 1: Create `@mawm/core` and lift the OpenCode and config layer (`coding`)

- [ ] complete
- Target repo: `mawm` (branch `initiative/per-run-config`)
- Run spec path: `.mawm/agents/initiatives/active/per-run-config/runs/active/core-package-opencode-lift/spec.md` (created by the assigned workflow when this run starts)
- Task: Convert the mawm repo to a workspace, create the `@mawm/core` package, move the OpenCode execution layer and the project-local config-resolution layer into it as `@mawm/core/opencode`, and have `@mawm/cli` consume `@mawm/core` where useful, with behavior parity.
- Current state: the OpenCode execution layer lives only in the coding workflow repo (`src/integrations/opencode/connection.ts`, `node.ts`, `message.ts`, `memory.ts`, `types.ts`) plus the project-local config reader added by the Project-Local Context Configuration initiative. The mawm repo is a single package `@mawm/cli` (`package.json` has no workspaces) and exports only `.` and `./package.json`.
- Outcome: `@mawm/core` exists in the mawm workspace and exposes `@mawm/core/opencode` containing the OpenCode execution layer and the runtime config-resolution layer as the single source of truth. The package builds and its exports resolve. `@mawm/cli` depends on `@mawm/core` where it shares logic. No behavior change for any current consumer.
- Scope: root workspace configuration, the new `@mawm/core` package (package.json, build, subpath exports, moved source), `@mawm/cli` dependency wiring, and tests.
- Out of scope: the coding repo (Run 2), per-run sidecar reading (Run 3), and model overrides (Run 4).
- Contracts: `@mawm/core/opencode` is the canonical layer; the moved modules keep their public surface so the coding workflow can import equivalents in Run 2. OpenCode still owns provider connectivity. Workspace conversion does not change `@mawm/cli`'s published bin or its install/update behavior.
- Smoke verification: `headless` - mawm-repo tests and build prove `@mawm/core` builds, `@mawm/core/opencode` exports resolve, and `@mawm/cli` still typechecks, lints, tests, and builds.

### Run 2: Consume `@mawm/core/opencode` in the coding workflow (`coding`)

- [ ] complete
- Target repo: `coding` (branch `initiative/per-run-config`)
- Run spec path: `.mawm/agents/initiatives/active/per-run-config/runs/active/consume-core-opencode/spec.md` (created by the assigned workflow when this run starts)
- Task: Depend on `@mawm/core`, import the OpenCode and config layer from `@mawm/core/opencode`, delete the in-repo copies, and confirm unchanged behavior.
- Current state: the coding workflow defines and imports its OpenCode layer locally (`src/integrations/opencode/*`) and, after the prior initiative, its project-local config reader. `package.json` depends on `@opencode-ai/sdk` directly and bundles the graph with `bun scripts/build.js`.
- Outcome: the coding workflow depends on `@mawm/core`, imports `createOpenCodeNode` and the config layer from `@mawm/core/opencode`, removes the moved modules, and bundles `@mawm/core` at build. Planning and implementing phases behave exactly as before.
- Scope: coding `package.json` dependency, import rewrites across `src/agents/*` and `src/graph/*`, deletion of the moved `src/integrations/opencode/*` and config modules, build config if needed, and tests.
- Out of scope: per-run sidecar reading and model overrides (Runs 3 and 4) and any `@mawm/core` logic change.
- Contracts: no behavior change versus the pre-run coding workflow; the bundle still runs from `~/.config/mawm/coding/graph.js` after reinstall. OpenCode still owns provider connectivity.
- Smoke verification: `manual` - run `bun run build:mawm` to reinstall, execute the coding workflow through `execute-graph` on a smoke target, and have HITL confirm planning and implementing still complete with no behavior change. Headless coding-repo tests and build pass.

### Run 3: Per-run context sidecar (`coding`)

- [ ] complete
- Target repo: `mawm` (branch `initiative/per-run-config`)
- Run spec path: `.mawm/agents/initiatives/active/per-run-config/runs/active/per-run-context-sidecar/spec.md` (created by the assigned workflow when this run starts)
- Task: Read `run.config.json` in `@mawm/core`, stack its per-run context on top of project-local context, inject it through the node seam, and teach `mawma-planner` to author the context portion of the sidecar during planning.
- Current state: after Runs 1 and 2, `@mawm/core/opencode` resolves project-local context from `.mawm/mawm.json` and injects per-agent bundles. Nothing reads a per-run sidecar. `mawma-planner` (`src/assets/.config/agents/opencode/agents/mawma-planner.md`) does not author run config.
- Outcome: `@mawm/core` reads `run.config.json` from the directory of `runSpecPath`, resolves its per-run context scopes with the same kebab agent and phase identifiers, stacks them on top of the project-local context (duplicates included), and injects the combined per-agent bundle. `mawma-planner` authors the context portion of `run.config.json` during initiative planning, leaving it for the user to keep or edit.
- Scope: `@mawm/core` per-run context reading, resolution, and stacking; the `mawma-planner` asset in the mawm repo; the sidecar context schema/shape; and tests. The data needed (`targetRepoPath`, `runSpecPath`) already flows through runtime context and input, so no coding-repo change is required.
- Out of scope: model/variant overrides (Run 4).
- Contracts: per-run context stacks on top of project-local context with duplicates allowed; an absent sidecar yields only project-local context; unknown agent/phase keys raise a clear error; `.env` is never read.
- Smoke verification: `manual` - author a `run.config.json` with per-run context in a smoke target, run `bun run build:mawm` to reinstall, execute the coding workflow, and have HITL confirm the per-run context stacks on top of the project-local context for the right agents. Headless `@mawm/core` tests cover reading and stacking.

### Run 4: Per-run model and variant toggling (`coding`)

- [ ] complete
- Target repo: `mawm` (branch `initiative/per-run-config`)
- Run spec path: `.mawm/agents/initiatives/active/per-run-config/runs/active/per-run-model-toggle/spec.md` (created by the assigned workflow when this run starts)
- Task: Move model and variant resolution into the node's per-invocation path in `@mawm/core`, apply per-agent overrides from the sidecar, confirm OpenCode honors a per-prompt model, and teach `mawma-planner` to author the model portion of the sidecar.
- Current state: in `@mawm/core/opencode` (post-lift), `model` and `variant` are still resolved once in the node closure and the embedded OpenCode server bakes the agent's model into its agent config at creation (originally `connection.ts:137-152`). Agent defaults live in the coding workflow's `src/agents/definitions.ts`. `mawma-planner` does not author model config.
- Outcome: `@mawm/core` resolves `model` and `variant` inside `invoke`, applies per-agent overrides from `run.config.json` (provider/model string plus optional variant), and passes them to `session.promptAsync`. An absent override uses the agent default. OpenCode resolves the provider and credentials. `mawma-planner` authors the model portion of `run.config.json` during planning. Mid-initiative model changes between runs take effect on the next run without manual server restarts.
- Scope: `@mawm/core` invoke-time model/variant resolution and override application; the `mawma-planner` asset; the sidecar model schema/shape; and tests, including a check that a per-prompt model overrides the embedded server's baked agent-config model.
- Out of scope: any new provider/credential management in MAWM (OpenCode owns this) and changes to the coding workflow's default agent definitions beyond their role as defaults.
- Contracts: per-agent model/variant overrides are optional; absence falls back to the coding workflow defaults; OpenCode owns provider connectivity. A per-prompt model override must win over the embedded server's agent-config model. `.env` is never read.
- Smoke verification: `manual` - set a per-agent model override in `run.config.json`, run `bun run build:mawm` to reinstall, execute the coding workflow, and have HITL confirm the agent runs on the overridden model through OpenCode and that changing the override between runs takes effect on the next run. Headless `@mawm/core` tests cover override resolution and default fallback.

## Initiative Verification Gates

- Every run is complete, verified, reviewed, smoke-tested, and committed on its repo's initiative branch.
- `bun run typecheck`, `bun run lint:all`, `bun run test`, and `bun run build` pass at each repo's initiative head.
- After the lift, the coding workflow holds no private OpenCode layer and runs with behavior parity through `@mawm/core/opencode`.
- HITL manual smoke records that per-run context stacks on top of project-local context and that a per-run model override reaches OpenCode and falls back to the agent default when absent.
- `mawma-planner` authors a valid `run.config.json` sidecar during planning that the user can keep or edit before execution.
- One PR per repo (`mawm` and `coding`) from `initiative/per-run-config` to `main` is opened with the implementation summary, verification evidence, and the manual smoke results.

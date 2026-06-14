# Project-Local Context Configuration - Initiative Spec Sheet

## Source of Truth Rules

- When initiative direction changes, update every affected active doc in the same pass.
- Any run specs created under `runs/active/` must match the run summaries in this spec.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.

## Target State

A target project can declare context injection in `<target-project>/.mawm/mawm.json`, scoping context-file paths to global, per-workflow, per-agent, and per-phase. At execution the coding workflow reads that config from `targetRepoPath`, validates the keys against its own agent and phase topology, resolves and reads every referenced file from both the project-local root and the global `~/.config/mawm/prompts/` root, stacks all matching context (duplicates included), and appends it to each agent's system prompt at node-execution time. OpenCode still owns provider connectivity and credentials.

- `.mawm/mawm.json` accepts the scoped shape: `context.global[]`, `context.workflows.<workflow-id>.global[]`, `context.workflows.<workflow-id>.agent.<agent-id>[]`, `context.workflows.<workflow-id>.phases.<phase-id>[]`, and top-level `context.phases.<phase-id>[]`. Every leaf is an array of context-file paths.
- Agent identifiers are kebab (`planner`, `plan-reviewer`, `coder`, `code-reviewer`). Phase identifiers are the workflow's declared phases (`planning`, `implementing`).
- The installed-workflow `mawm.json` contract and `~/.config/mawm/manifest.json` expose each workflow's agent and phase topology so configs can be authored and validated against real injection points.
- When no `.mawm/mawm.json` is present, or a scope matches nothing, agent prompts are unchanged from today's static prompts.

## Multi-Repo Note

This initiative spans two git repos and uses one initiative branch and one PR per repo:

- `mawm` (`@mawm/cli`) owns the `mawm.json`/manifest topology contract, the `.mawm/mawm.json` shape and schema, the `mawm init` scaffold, and the global `~/.config/mawm/prompts/` scaffold.
- The `coding` workflow repo (`coding-workflow`, separate checkout) owns the node-level injection seam and the runtime config reader/resolver/injector.
- Coding-repo runs are launched with `targetRepoPath` pointed at the coding workflow checkout while the initiative and run specs stay in this mawm project's `.mawm/agents/`. The execution manager sets `targetRepoPath` explicitly for these runs.

## Initiative-wide Contracts

- All matching context stacks. There is no replace or precedence; duplicated context across scopes is allowed and expected. This keeps resolution simple and predictable.
- The workflow reads, validates, resolves, and injects config itself at runtime as deterministic MAWM-authored code, not manager-agent prose. Execution-only values (`targetRepoPath`, `initiativeBranch`, sessions, base URL) still arrive from the launcher via runtime context.
- Config keys are validated at the workflow entry node against the workflow's own agent and phase topology. Unknown agent or phase keys are a clear, surfaced error.
- Context-file paths resolve from exactly two roots: the project-local root (relative to `targetRepoPath`) and the global `~/.config/mawm/prompts/` root.
- This initiative does not change model selection; model toggling is the per-run-config initiative.
- `.env` files and their contents are never read, parsed, printed, or inspected.
- Coding-workflow runtime changes only go live after a rebuild and reinstall into `~/.config/mawm/coding` via the coding repo's `bun run build:mawm`. Automated verification uses each repo's own toolchain; live smoke requires the reinstall.
- Repo verification commands: `bun run typecheck`, `bun run lint:all`, `bun run test`, `bun run build` in each repo.

## Branch and PR Plan

- Repos, base branches, and initiative branches:
  - `mawm` (`/Users/michaelgreen/Documents/Projects/ai/maw-management/mawm`): base `main`, initiative branch `initiative/project-local-context-config`.
  - `coding` (`/Users/michaelgreen/Documents/Projects/ai/maw-management/workflows/coding`, remote `coding-workflow`): base `main`, initiative branch `initiative/project-local-context-config`.
- Branch creation rule: create each repo's initiative branch from its base only when implementation in that repo is ready to begin.
- Run commit rule: each completed run becomes one clean commit on its repo's initiative branch.
- PR rule: open one PR per repo from its initiative branch to `main` after that repo's runs and the initiative gates are complete.
- Cross-repo sequencing: the mawm-repo contract run (Run 2) must land, or its `.mawm/mawm.json` shape and topology contract be frozen, before the coding-repo config reader (Run 3) integrates against it.

## Execution Plan

### Run 1: Execution-time prompt assembly and context-bundle injection (`coding`)

- [x] complete
- Target repo: `coding` (branch `initiative/project-local-context-config`)
- Run spec path: `.mawm/agents/initiatives/active/project-local-context-config/runs/active/node-context-injection/spec.md` (created by the assigned workflow when this run starts)
- Task: Move system-prompt assembly into the OpenCode node's per-invocation path and append a per-agent context bundle supplied through runtime context, without changing default behavior.
- Current state: `createOpenCodeNode` resolves `model`, `variant`, `system`, and `tools` once in the closure (`src/integrations/opencode/node.ts:395-399`) and only those closure copies reach `session.promptAsync` (`node.ts:456-475`). `OpenCodeRuntimeContext` (`src/integrations/opencode/types.ts:35-41`) carries only `targetRepoPath`, `initiativeBranch`, `opencodeBaseUrl`, `parentSessionID`. Nothing injects per-agent context; prompts are fully static from `src/agents/prompts.ts`.
- Outcome: `system` is assembled inside `invoke`, and the node appends a per-agent context bundle read from runtime context (keyed by kebab agent name) to the system prompt at prompt time. When no bundle is present the prompt is byte-identical to today. `model` and `variant` remain resolved as they are now.
- Scope: `src/integrations/opencode/node.ts`, `src/integrations/opencode/types.ts` (extend the runtime-context shape with the context bundle), and node tests in the coding repo.
- Out of scope: reading any config file, model or variant overrides, mawm-repo changes, and per-run sidecars.
- Contracts: the bundle is a per-agent collection of context strings that are stacked and appended after the static system prompt. Empty or absent bundle means no prompt change. OpenCode still owns provider connectivity. No change to message-serialization or session memory behavior.
- Smoke verification: `headless` - coding-repo test asserts that a supplied per-agent bundle appears in the prompt parts for that agent and that the absent-bundle path produces the unchanged prompt.

### Run 2: Workflow topology contract, config schema, and scaffolds (`coding`)

- [x] complete
- Target repo: `mawm` (branch `initiative/project-local-context-config`)
- Run spec path: `.mawm/agents/initiatives/active/project-local-context-config/runs/active/config-topology-contract/spec.md` (created by the assigned workflow when this run starts)
- Task: Extend the mawm workflow contract so an installed workflow can declare its agent and phase topology, define and document the `.mawm/mawm.json` shape with a JSON schema, and scaffold the project-local config stub and the global prompts directory.
- Current state: `normalizeWorkflowMetadata`/`normalizeExecutionContract` (`src/config/workflow/metadata.ts:75-144`) carry only scalar input/context arrays and drop unknown fields; `src/config/workflow/manifest.ts` propagates only those fields to `~/.config/mawm/manifest.json`. `mawm init` scaffolds `.mawm/agents/` only (`src/assets/.mawm.project-local/agents/`), with no `mawm.json`. The global config scaffold (`src/assets/.config/mawm/`) ships only `manifest.json`; there is no `prompts/` directory and no `.mawm/mawm.json` schema.
- Outcome: a workflow `mawm.json` can declare `agents` (kebab) and `phases` topology, and `readWorkflowMetadata`/manifest carry it through to the global manifest and `mawm list`. The `.mawm/mawm.json` shape is documented with a JSON schema that validates structure (scoped path arrays). `mawm init` writes a schema-backed `.mawm/mawm.json` stub that remains valid JSON, the global config scaffold creates `~/.config/mawm/prompts/`, and README plus workflow templates reflect the new contract.
- Scope: `src/config/workflow/metadata.ts`, `src/config/workflow/manifest.ts`, scaffolds under `src/assets/.mawm.project-local/` and `src/assets/.config/mawm/`, `src/assets/workflow-templates/*/mawm.json`, the `.mawm/mawm.json` JSON schema asset, README, and mawm-repo tests.
- Out of scope: the runtime config reader (coding repo, Run 3), `execute-graph` runtime behavior, and any model config.
- Contracts: topology fields are optional and backward-compatible; existing manifests without topology stay valid. Agents are kebab; phases name the workflow's real phases. The schema validates shape only and does not assert that referenced files exist. No change to install/update source behavior.
- Smoke verification: `headless` - mawm-repo tests prove topology declared in a workflow `mawm.json` fixture survives `readWorkflowMetadata` and manifest refresh, `mawm init` writes the `.mawm/mawm.json` stub, and the schema accepts the documented example while rejecting a malformed one.

### Run 3: Project-local config reader, resolver, and injector (`coding`)

- [ ] complete
- Target repo: `coding` (branch `initiative/project-local-context-config`)
- Run spec path: `.mawm/agents/initiatives/active/project-local-context-config/runs/active/project-local-config-reader/spec.md` (created by the assigned workflow when this run starts)
- Task: Read and validate `.mawm/mawm.json` at runtime, resolve every scope into stacked per-agent context, read the referenced files, populate the injection bundle from Run 1, and declare the coding workflow's topology in its `mawm.json`.
- Current state: the planning bootstrap (`src/graph/phases/planning/bootstrap.ts:7-29`) passes only spec paths and scalar context to the planner. No code reads `.mawm/mawm.json`. After Run 1 the node consumes a per-agent context bundle from runtime context, but nothing populates it. The coding `mawm.json` declares no agent or phase topology.
- Outcome: the coding workflow reads `.mawm/mawm.json` from `targetRepoPath` at its entry, validates agent and phase keys against its own topology, resolves `global`, `workflows.coding.*`, agent, and phase scopes, reads referenced files from the project-local root and `~/.config/mawm/prompts/`, stacks all matches (duplicates included), maps phases to their agents, and populates the per-agent bundle the node injects. The coding `mawm.json` declares its agent (kebab) and phase topology per Run 2's contract.
- Scope: a new config-resolution module in the coding repo, entry/bootstrap wiring that builds the bundle into runtime context, the coding `mawm.json` topology declaration, and tests.
- Out of scope: per-run sidecars and model config (per-run-config initiative), the `@mawm/core` lift, and `execute-graph` changes.
- Contracts: all matching context stacks with duplicates allowed; unknown agent/phase keys raise a clear validation error; absent `.mawm/mawm.json` yields no injected context and unchanged prompts; file-read failures are surfaced, not swallowed; paths resolve only from the project-local and global prompts roots; `.env` is never read.
- Smoke verification: `manual` - author a representative `.mawm/mawm.json` in a smoke target (for example `mawm-smoke`), run `bun run build:mawm` in the coding repo to reinstall, execute the coding workflow through `execute-graph`, and have HITL confirm the configured context reaches the correct agents and phases and stacks as expected. Headless tests cover resolution, validation, and stacking logic.

## Initiative Verification Gates

- Every run is complete, verified, reviewed, smoke-tested, and committed on its repo's initiative branch.
- `bun run typecheck`, `bun run lint:all`, `bun run test`, and `bun run build` pass at each repo's initiative head.
- A workflow's declared agent/phase topology is visible in `~/.config/mawm/manifest.json` and `mawm list` after install/refresh.
- HITL manual smoke records that project-local context configured in `.mawm/mawm.json` reaches the intended agents and phases and stacks, with duplicates retained.
- With no `.mawm/mawm.json`, agent prompts remain identical to pre-initiative behavior.
- One PR per repo (`mawm` and `coding`) from `initiative/project-local-context-config` to `main` is opened with the implementation summary, verification evidence, and the manual smoke result.

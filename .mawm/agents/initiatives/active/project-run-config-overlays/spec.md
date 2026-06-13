# Project and Run Config Overlays - Initiative Spec Sheet

## Source of Truth Rules

- When initiative direction changes, update every affected active doc in the same pass.
- Any run specs created under `runs/active/` must match the run summaries in this spec.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.

## Target State

MAWM can resolve project-local and per-run configuration before launching a workflow, inject the effective config through LangGraph runtime context, and let OpenCode-backed workflow agents use those settings for context and model selection.

- Target projects may define `.mawm/mawm.json` with `schemaVersion: "mawm.project.v0"`.
- Project config supports ordered context injection at project, workflow, phase, and agent scopes.
- Project config supports model overlays at workflow, phase, and agent scopes for agents whose workflow metadata declares `configurable.model: true`.
- Initiative specs and generated run specs may contain per-run config overlays that are generated before execution, reviewed by the user, and validated before launch.
- A run may also apply a mid-initiative implementation-phase override by updating the active run spec/config overlay and re-resolving effective config before the next workflow phase resumes.
- `execute-graph` resolves and forwards effective config at execution time through LangGraph context instead of asking the manager agent to emulate validation in prose.
- OpenCode provider connectivity stays owned by OpenCode; MAWM validates only config shape, target IDs, and provider/model string syntax.
- The MAWM-owned OpenCode execution layer based on the current `../workflows/coding` pattern reads runtime config per invocation so model toggles are effective without rebuilding workflow nodes.

## Initiative-wide Contracts

- Dependency: start after `Workflow Schema Runtime Contracts`, because project/run config validation depends on schema-v0 workflow topology and configurable-surface declarations.
- Target repo: `mawm` only. The sibling `../workflows/coding` repo is current-state/reference input for the OpenCode execution pattern; this initiative integrates the necessary OpenCode runtime/config layer into MAWM-owned assets or libraries instead of editing that separate Git repo.
- Assigned execution workflow for all runs: `coding` from `~/.config/mawm/coding`.
- Project config file path: `<target-project>/.mawm/mawm.json`.
- Project config schema version literal: `mawm.project.v0`.
- Per-run config schema version literal: `mawm.run.v0`.
- Context entry contract:
  - `{ "source": "project", "path": "relative/path.md" }` resolves under the target project root.
  - `{ "source": "user", "path": "prompts/relative/path.md" }` resolves under `~/.config/mawm/`.
  - Context paths must be relative, normalized, and must not escape their source root.
  - Missing context files are validation errors before workflow launch.
- Context merge order is append-only and stable: project-wide context, workflow-wide context, cross-workflow phase context matching the selected workflow's phase IDs, workflow-specific phase context, workflow-specific agent context, then per-run overlay context.
- Model overlay contract:
  - Model values use provider/model strings such as `openai/gpt-5.4` or `anthropic/claude-sonnet-4-6`.
  - Variants are optional strings passed through to the runtime, such as `xhigh` or `max`.
  - Narrower scopes override broader scopes: workflow, then phase, then agent, then per-run overlay.
  - A model overlay is valid only when the workflow schema declares the target agent and `configurable.model: true` for that agent.
  - MAWM does not validate provider credentials, provider availability, or whether a provider supports a variant. Those remain OpenCode/runtime errors.
- Project config scope shape is fixed for v0:
  - `context.project`: context entries for every workflow run in the target project.
  - `context.phases.<phase-id>`: context entries applied to workflows that declare a matching phase ID.
  - `context.workflows.<workflow-id>.all`: context entries for all agents/phases in that workflow.
  - `context.workflows.<workflow-id>.phases.<phase-id>`: context entries for one phase in that workflow.
  - `context.workflows.<workflow-id>.agents.<agent-id>`: context entries for one agent in that workflow.
  - `models.workflows.<workflow-id>.all`: default model overlay for all configurable agents in that workflow.
  - `models.workflows.<workflow-id>.phases.<phase-id>`: model overlay for configurable agents in one phase.
  - `models.workflows.<workflow-id>.agents.<agent-id>`: model overlay for one configurable agent.
- Effective runtime context key: `mawmConfig`. `execute-graph` passes the resolved, validated effective config under this key while preserving existing `targetRepoPath`, `parentSessionID`, `opencodeBaseUrl`, and initiative-run fields.
- Effective config is persisted under `<target-project>/.mawm/logs/<workflow-id>/` alongside runtime state so a run can be audited without committing runtime logs.
- The manager/runner agents may request validation or pass explicit overrides, but validation and merge behavior must live in code used by `mawm check` and `execute-graph`.
- Repo verification commands for every run: `bun run typecheck`, `bun run lint:all`, and `bun run test`.

## Branch and PR Plan

- Target repo: `mawm` (this repo)
- Base branch: `main`
- Initiative branch: `initiative/project-run-config-overlays`
- Branch creation rule: create the initiative branch from `main` only after `initiative/workflow-schema-runtime-contracts` is merged or otherwise available as the base.
- Run commit rule: each clean completed run becomes one commit.
- PR rule: open a PR from `initiative/project-run-config-overlays` to `main` after all runs and initiative gates are complete.

## Execution Plan

### Run 1: Project config schema, scaffold, and resolver (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/project-run-config-overlays/runs/active/project-config-schema-resolver/spec.md` (created by the assigned workflow when this run starts)
- Task: Add project-local `.mawm/mawm.json` schema-v0 support, project config scaffolding, and a resolver that validates context/model scopes against workflow schema-v0 metadata.
- Current state:
  - Project-local `.mawm/` currently holds planning assets under `.mawm/agents/` and runtime logs under `.mawm/logs/`; there is no project config file or asset scaffold at `.mawm/mawm.json`.
  - `src/utils/update/planning.ts` seeds and refreshes `.mawm/agents` only.
  - `execute-graph-lib.resolveRunContext` only merges `targetRepoPath` and `parentSessionID` into user-provided context; it does not read project config.
  - Workflow metadata schema-v0 from the dependency provides the workflow/phase/agent IDs needed to validate config targets.
- Outcome: MAWM exposes project config types and validation helpers; `init -i` seeds a create-only `.mawm/mawm.json` template and `update -i` refreshes managed project-config comments/schema stubs without overwriting user values; config validation resolves local/user context paths, rejects path traversal and missing files, validates workflow/phase/agent targets against workflow schema-v0 metadata, and returns a deterministic effective-config object.
- Scope: new `src/config/project-config/*` utilities, `.mawm.project-local` assets for `.mawm/mawm.json`, `init -i`/`update -i` planning asset wiring, tests for parsing/resolution/validation, and minimal README mention of the file location.
- Out of scope: `execute-graph` launch injection, per-run overlays in initiative docs, OpenCode node model application, provider credential checks, and editing sibling workflow repos.
- Contracts: Follow the config shape and merge order defined in Initiative-wide Contracts; config files are optional and absence means empty config; user config paths resolve under `~/.config/mawm/` without reading secrets or env files.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run test`
- Smoke verification: `headless` - Tests cover a valid context/model config, path traversal rejection, missing context file rejection, unknown workflow-specific agent rejection, and create-only scaffolding that does not overwrite an existing `.mawm/mawm.json`.

### Run 2: Launch-time effective config injection through `execute-graph` (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/project-run-config-overlays/runs/active/execute-graph-config-injection/spec.md` (created by the assigned workflow when this run starts)
- Task: Resolve effective project config at workflow launch and pass it to LangGraph runtime context under `mawmConfig`, while preserving existing explicit context behavior.
- Current state:
  - `src/assets/.config/agents/opencode/tools/execute-graph.ts` prepares a project-local runtime dir and sends `context: resolvedContext` to `/threads/<thread>/runs/wait`.
  - `src/assets/.config/agents/opencode/tools/execute-graph-lib.ts` has pure helpers for workflow root, runtime dir, assistant IDs, config normalization, and context merging, but no project config loading.
  - Shipped and repo-local `execute-graph` tool copies must stay functionally identical when touched.
- Outcome: `execute-graph` reads the selected workflow's schema-v0 metadata, reads optional `<target-project>/.mawm/mawm.json`, resolves the effective config for the selected workflow, merges any explicit tool-provided config overrides after project config, injects the result as `context.mawmConfig`, writes an audit copy under `<target-project>/.mawm/logs/<workflow-id>/effective-config.json`, and fails before launch with deterministic validation errors when config is invalid.
- Scope: `.opencode/tools/execute-graph.ts`, `.opencode/tools/execute-graph-lib.ts`, shipped copies under `src/assets/.config/agents/opencode/tools/`, project-config helpers imported or mirrored as needed for the standalone tool asset, tests for pure helpers and tool behavior.
- Out of scope: Applying model/config inside workflow agent nodes, per-run overlays in run specs, changing the existing `workflow`, `input`, `context`, `assistantID`, `threadID`, or `resume` tool argument names, and provider connectivity.
- Contracts: Explicit `context` values provided to the tool still win for existing first-class runtime keys (`targetRepoPath`, `parentSessionID`, `opencodeBaseUrl`) unless the tool already auto-fills them; `mawmConfig` is the only new reserved context key; invalid config blocks before creating a LangGraph thread.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run test`
  - `diff -u ".opencode/tools/execute-graph.ts" "src/assets/.config/agents/opencode/tools/execute-graph.ts"`
  - `diff -u ".opencode/tools/execute-graph-lib.ts" "src/assets/.config/agents/opencode/tools/execute-graph-lib.ts"`
- Smoke verification: `headless` - Tests prove a temp project config produces `mawmConfig` in the run payload and `effective-config.json` in the workflow runtime dir, while invalid config prevents thread creation.

### Run 3: MAWM-owned OpenCode runtime reads config per invocation (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/project-run-config-overlays/runs/active/opencode-runtime-config-application/spec.md` (created by the assigned workflow when this run starts)
- Task: Integrate the necessary OpenCode execution-layer pattern from the sibling coding workflow into MAWM-owned workflow assets/libraries and make OpenCode-backed agents read `mawmConfig` at invocation time for context and model selection.
- Current state:
  - The reusable pattern currently lives outside this repo in `../workflows/coding/src/integrations/opencode/*` and `../workflows/coding/src/agents/*`.
  - In that sibling workflow, `createOpenCodeNode` resolves `model` and `variant` once at node creation, then passes them to `sdk.client.session.promptAsync`.
  - `connection.ts` delegates provider connectivity to OpenCode by using `createOpencodeClient` or `createOpencodeServer`; MAWM does not need provider credentials.
  - The MAWM repo currently ships generic `base` and `initiative` workflow templates, but not a MAWM-owned OpenCode agent runtime layer that can consume `mawmConfig`.
- Outcome: MAWM-owned workflow assets or shared workflow-template utilities include an OpenCode runtime layer based on the current sibling coding pattern; OpenCode-backed agents resolve effective context text and model/variant overlays from `runtime.context.mawmConfig` during each invocation; model toggles are passed to OpenCode as `{ providerID, modelID }` plus optional `variant`; context entries are appended to the agent prompt/system input in the deterministic order from Initiative-wide Contracts; tests prove launch-time model overrides for `coder`/`code-reviewer` style agents without requiring provider credentials.
- Scope: MAWM-owned workflow template/shared runtime assets, tests for OpenCode config resolution with mocked SDK calls, and any template metadata needed to declare OpenCode agents as configurable.
- Out of scope: Editing `../workflows/coding`, changing OpenCode provider setup, adding new non-OpenCode runtimes, per-run overlay parsing, and changing the manager's branch/commit behavior.
- Contracts: Model/variant resolution must happen inside the node invocation path, not only when the node is constructed; provider/model strings must split into `providerID` and `modelID` exactly as the current sibling workflow does; OpenCode remains responsible for actual provider authentication and runtime failures.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run test`
- Smoke verification: `headless` - Mocked OpenCode SDK tests demonstrate that a workflow-agent override changes the `session.promptAsync` model/variant payload for one agent while leaving another agent on its default.

### Run 4: Per-run config overlays in initiative and run specs (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/project-run-config-overlays/runs/active/per-run-config-overlays/spec.md` (created by the assigned workflow when this run starts)
- Task: Add planned per-run config overlay sections to initiative/run spec templates, teach the coding workflow planner to materialize those overlays into generated run specs, and validate overlays before launch or phase resume.
- Current state:
  - Initiative and run spec templates contain run task/current-state/scope/contracts/smoke fields but no machine-readable run configuration block.
  - The installed `coding` workflow planner materializes run specs from initiative spec text and current code state, but current parser fields do not include run config.
  - `mawma-manager` builds the `execute-graph` payload from workflow metadata and selected initiative/run data; it has no instruction to resolve per-run config before launch.
- Outcome: Initiative specs can include an optional `Run configuration` fenced JSON block for each planned run using `schemaVersion: "mawm.run.v0"`; generated run specs preserve the selected run's overlay; the manager/runner prompts instruct agents to validate and pass the overlay before launch; the config resolver merges per-run overlay after project config; mid-initiative changes are supported by editing the active run spec overlay and re-validating before the next phase/resume.
- Scope: initiative and run spec templates in both repo-local and shipped assets, coding workflow parsing/materialization logic in MAWM-owned workflow assets/templates, manager/runner/planner prompt updates, config resolver tests for per-run overlay precedence.
- Out of scope: Human UI for editing config, provider credential validation, automatic model recommendation, changing completed run docs, and executing workflows during planning.
- Contracts: Per-run overlays are optional; invalid JSON or invalid target IDs block before launch/resume; overlays must not silently create unknown workflows/phases/agents; per-run model overlays have highest precedence over project config.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run test`
  - `diff -u ".opencode/agents/mawma-manager.md" "src/assets/.config/agents/opencode/agents/mawma-manager.md"`
  - `diff -u ".opencode/agents/mawma-planner.md" "src/assets/.config/agents/opencode/agents/mawma-planner.md"`
  - `diff -u ".opencode/agents/workflow-runner.md" "src/assets/.config/agents/opencode/agents/workflow-runner.md"`
- Smoke verification: `headless` - Tests prove a run overlay overrides project config for one agent, generated run specs preserve the overlay block, and malformed overlay JSON blocks execution before launch/resume.

### Run 5: Config documentation, audits, and end-to-end dry run (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/project-run-config-overlays/runs/active/config-docs-e2e-dry-run/spec.md` (created by the assigned workflow when this run starts)
- Task: Align README, planning docs, prompt docs, and tests around the final project/run config behavior, then prove an end-to-end dry run from project config through effective runtime payload.
- Current state:
  - README currently explains global workflow installation and execution, but not project-local config, context injection, model toggles, or per-run overlays.
  - Shipped initiative docs say execution-only values come from the launcher, but do not describe `mawmConfig` or effective-config audit logs.
  - No end-to-end test covers `.mawm/mawm.json` → `execute-graph` payload → OpenCode model override application.
- Outcome: README and shipped planning/prompt docs describe project config, per-run overlays, merge order, `mawmConfig`, and OpenCode model-toggling limits; tests include an end-to-end dry run with mocked OpenCode/LangGraph seams proving effective config is resolved, injected, audited, and consumed by a configurable OpenCode agent; docs clearly state that provider credentials remain an OpenCode concern.
- Scope: README, `.mawm` planning docs/templates and shipped mirrors, OpenCode agent prompts, tests that exercise config resolution/injection/application without real provider calls.
- Out of scope: Real provider smoke, UI/editor features, non-OpenCode runtime adapters, and docs for unimplemented future integrations.
- Contracts: Documentation must match the implemented merge order and schema field names exactly; no doc may imply MAWM can validate provider availability or credentials; runtime logs remain ignored and uncommitted.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run test`
  - `diff -u ".opencode/agents/mawma-manager.md" "src/assets/.config/agents/opencode/agents/mawma-manager.md"`
  - `diff -u ".opencode/agents/mawma-planner.md" "src/assets/.config/agents/opencode/agents/mawma-planner.md"`
  - `diff -u ".opencode/agents/workflow-runner.md" "src/assets/.config/agents/opencode/agents/workflow-runner.md"`
- Smoke verification: `headless` - End-to-end dry-run tests prove the effective config path without launching a real provider-backed model; mirror `diff` commands for touched prompt/template pairs are empty.

## Initiative Verification Gates

- Every run is complete, verified, reviewed, smoke-tested, and committed.
- `bun run typecheck`, `bun run lint:all`, and `bun run test` pass at initiative head.
- `mawm check` validates project config and per-run overlays against schema-v0 workflow metadata.
- A temp project with `.mawm/mawm.json` can produce an audited `effective-config.json` under `.mawm/logs/<workflow-id>/` without committing runtime logs.
- Tests prove context merge order, model override precedence, invalid-config blocking, and mocked OpenCode model/variant payload changes.
- README, shipped agent prompts, and planning templates describe the same `mawm.project.v0`, `mawm.run.v0`, and `mawmConfig` contracts.
- Provider credentials and availability remain outside MAWM validation and are still handled by OpenCode.
- Initiative-wide contracts still match the current codebase after the final run.
- PR from `initiative/project-run-config-overlays` to `main` is opened with the initiative summary and verification evidence.

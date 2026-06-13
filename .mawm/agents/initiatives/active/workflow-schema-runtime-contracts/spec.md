# Workflow Schema Runtime Contracts - Initiative Spec Sheet

## Source of Truth Rules

- When initiative direction changes, update every affected active doc in the same pass.
- Any run specs created under `runs/active/` must match the run summaries in this spec.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.

## Target State

MAWM has a deterministic, versioned workflow metadata contract that workflow templates, installed workflows, and richer coding workflows can validate before execution.

- Workflow `mawm.json` files use `schemaVersion: "mawm.workflow.v0"` and are rejected when required v0 fields are missing or malformed.
- The metadata contract keeps today's identity and `executionContract` fields, then adds declared workflow topology and configurable runtime surfaces.
- Workflow topology identifies phase IDs, node IDs, workflow agent IDs, and phase-agent membership so project/run config can target known scopes instead of free-text guesses.
- Configurable surfaces identify where context and model overrides are allowed. OpenCode-backed agents can declare default `model` and `variant` values without MAWM owning provider credentials.
- Bundled `base` and `initiative` workflow templates carry valid schema-v0 metadata.
- A MAWM-owned coding-workflow contract fixture captures the current sibling `../workflows/coding` topology (`planning` with `planner`/`plan-reviewer`, `implementing` with `coder`/`code-reviewer`) so the schema is proven against the workflow MAWM currently uses.
- `mawm check <workflow-id-or-path>` validates a globally installed workflow or local workflow/template path without launching, installing, or mutating the workflow.
- Install/update paths and shipped agent docs rely on the schema contract; project-local context/model config resolution remains out of scope until the dependent config initiative.

## Initiative-wide Contracts

- Dependency: start after `Git URL workflow sources`, because the user asked these initiatives to come after that active/ad-hoc work.
- Target repo: `mawm` only. The sibling `../workflows/coding` repo is current-state/reference input for the coding-workflow contract; this initiative does not edit that separate Git repo.
- Assigned execution workflow for all runs: `coding` from `~/.config/mawm/coding`.
- Workflow schema version literal: `mawm.workflow.v0`.
- Workflow metadata keeps these existing required fields: `id`, `displayName`, `workflowVersion`, `kind`, and `executionContract`.
- Workflow IDs continue to use the existing `^[A-Za-z0-9._-]+$` pattern.
- `kind` remains `standalone` or `initiative-run` unless a future initiative adds more kinds.
- Topology field names are part of the v0 contract:
  - `topology.phases.<phase-id>.nodes`: ordered node IDs in that phase.
  - `topology.phases.<phase-id>.agents`: workflow agent IDs active in that phase.
  - `topology.agents.<agent-id>.runtime`: `opencode`, `langgraph`, or `custom`.
  - `topology.agents.<agent-id>.defaultModel`: optional provider/model string such as `openai/gpt-5.4`.
  - `topology.agents.<agent-id>.defaultVariant`: optional runtime variant string such as `xhigh` or `max`.
  - `topology.agents.<agent-id>.configurable.context`: boolean.
  - `topology.agents.<agent-id>.configurable.model`: boolean.
- Topology validation fails when a phase references an undeclared agent, IDs are empty, `defaultModel` lacks a provider/model slash, or configurable flags are not booleans.
- `base` and generic `initiative` templates may declare empty `topology.agents`; empty topology is valid only when no model or agent-scoped config surface is declared.
- The coding-workflow fixture must reflect the known current sibling source:
  - `planner`: OpenCode, default `openai/gpt-5.4`, variant `xhigh`, configurable context/model.
  - `plan-reviewer`: OpenCode, default `anthropic/claude-sonnet-4-6`, variant `max`, configurable context/model.
  - `coder`: OpenCode, default `openai/gpt-5.4`, variant `xhigh`, configurable context/model.
  - `code-reviewer`: OpenCode, default `anthropic/claude-sonnet-4-6`, variant `max`, configurable context/model.
- `mawm check` is deterministic code, not agent judgement. It must not launch workflows, run package installs, read `.env` files, or inspect provider credentials.
- v0 pre-release rule: do not add hidden legacy compatibility shims for schema-less `mawm.json` files. If an installed external workflow lacks `schemaVersion`, `mawm check` reports that explicitly and the repair is to update/reinstall the workflow from schema-v0 source.
- Repo verification commands for every run: `bun run typecheck`, `bun run lint:all`, and `bun run test`.

## Branch and PR Plan

- Target repo: `mawm` (this repo)
- Base branch: `main`
- Initiative branch: `initiative/workflow-schema-runtime-contracts`
- Branch creation rule: create the initiative branch from `main` only after `Git URL workflow sources` is complete or the user explicitly directs execution to bypass that active/ad-hoc dependency.
- Run commit rule: each clean completed run becomes one commit.
- PR rule: open a PR from `initiative/workflow-schema-runtime-contracts` to `main` after all runs and initiative gates are complete.

## Execution Plan

### Run 1: Schema v0 metadata normalization and template manifests (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/workflow-schema-runtime-contracts/runs/active/schema-v0-metadata/spec.md` (created by the assigned workflow when this run starts)
- Task: Introduce the `mawm.workflow.v0` metadata version in MAWM's workflow metadata reader/normalizer and update all bundled workflow template `mawm.json` files plus tests to use the versioned contract.
- Current state:
  - `src/config/workflow/metadata.ts` normalizes `id`, `displayName`, `workflowVersion`, `kind`, and `executionContract`, but has no schema version field.
  - `src/config/workflow/manifest.ts` embeds normalized metadata entries but cannot distinguish legacy metadata from a current contract.
  - `src/assets/workflow-templates/base/mawm.json` and `src/assets/workflow-templates/initiative/mawm.json` do not declare a schema version.
  - `test/assets/workflow-template-distribution.test.ts` defines a local `Meta` shape without `schemaVersion`.
- Outcome: `WorkflowMetadata` and manifest entries require `schemaVersion: "mawm.workflow.v0"`; bundled base and initiative template manifests include it; metadata tests and template-distribution tests assert the versioned shape; invalid or missing schema version produces a clear metadata-validation error.
- Scope: `src/config/workflow/{metadata,manifest}.ts`, workflow-template `mawm.json` files, metadata/template tests, and any TypeScript types directly affected by the schema-version addition.
- Out of scope: Topology fields, `mawm check`, project-local config, `execute-graph` runtime config injection, and edits to `../workflows/coding`.
- Contracts: Keep the existing execution-contract field names and meaning; do not add legacy fallback defaults for missing `schemaVersion`; keep generated JSON formatted through existing `writeJson` behavior.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run test`
- Smoke verification: `headless` - The full test suite must pass and include assertions that bundled template metadata and manifest entries carry `schemaVersion: "mawm.workflow.v0"`.

### Run 2: Topology and configurable surface schema (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/workflow-schema-runtime-contracts/runs/active/topology-configurable-surfaces/spec.md` (created by the assigned workflow when this run starts)
- Task: Extend schema-v0 metadata with workflow topology and configurable context/model surfaces, then prove the schema against bundled templates and a MAWM-owned coding-workflow contract fixture.
- Current state:
  - MAWM metadata has no way to declare phase IDs, node IDs, agent IDs, phase-agent membership, default agent models, or whether an agent accepts context/model overrides.
  - The generic initiative workflow has phase nodes in `src/assets/workflow-templates/initiative/src/graph/index.ts`, but those IDs are not declared in `mawm.json`.
  - The richer coding workflow exists outside this repo at `../workflows/coding`; its `src/agents/definitions.ts` hardcodes OpenCode agents and default model/variant values, and `src/graph/phases/{planning,implementing}/index.ts` wires those agents into phases.
- Outcome: Workflow metadata validation accepts and validates `topology.phases` and `topology.agents`; bundled template `mawm.json` files declare valid topology; tests include a coding-workflow contract fixture matching the known `planner`, `plan-reviewer`, `coder`, and `code-reviewer` agents; validation fails for unknown agent references, malformed model strings, empty IDs, and non-boolean configurable flags.
- Scope: `src/config/workflow/metadata.ts`, new or existing workflow-schema validation helpers, bundled workflow template `mawm.json` files, tests/fixtures proving base, initiative, and coding-style metadata.
- Out of scope: `mawm check`, project-local config resolution, OpenCode runtime changes, provider/model availability checks, and edits to the sibling coding repo.
- Contracts: Use the topology field names defined in Initiative-wide Contracts; validate shape and references only, not provider credential availability; keep empty topology valid for standalone workflows that do not expose agent-scoped config.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run test`
- Smoke verification: `headless` - Unit tests must demonstrate successful validation for base, initiative, and coding-style metadata plus failing validation for at least one unknown phase-agent reference and one malformed OpenCode model string.

### Run 3: `mawm check` command for workflow contracts (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/workflow-schema-runtime-contracts/runs/active/mawm-check-workflow-contracts/spec.md` (created by the assigned workflow when this run starts)
- Task: Add a deterministic `mawm check <workflow-id-or-path>` CLI command that validates schema-v0 workflow metadata and LangGraph config for either a globally installed workflow ID or a local workflow/template path.
- Current state:
  - Registered commands are `init`, `install`, `update`, `remove`, and `list` in `src/cmd/surface/index.ts`; there is no check command.
  - `install` resolves local workflow roots through `resolveWorkflowRoot` and `resolveWorkflowMetadata`, while `update` and `list` read the global manifest, but users have no dry-run validation surface.
  - `execute-graph` checks for the presence of installed metadata and `langgraph.json` but does not provide a reusable CLI validation command.
- Outcome: `mawm check` resolves a local path when the argument points to a file/directory, otherwise resolves an installed workflow under `~/.config/mawm/<workflow-id>`; it validates `mawm.json`, `langgraph.json`, assistant IDs, execution contract fields, topology references, and configurable-surface shape; it exits `0` with a concise success summary or nonzero with actionable validation errors.
- Scope: new `src/cmd/surface/check.ts`, command registry/help wiring, workflow validation utilities, CLI tests, and README command-reference updates strictly needed for the new command.
- Out of scope: Installing/updating workflows, executing LangGraph, validating provider credentials, reading `.env`, project-local config files, or changing `execute-graph` launch behavior.
- Contracts: `mawm check` must be read-only; it must never run package managers or start `langgraph dev`; path validation must use existing workflow-root resolution semantics for local paths and global config-root semantics for workflow IDs.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run test`
- Smoke verification: `headless` - CLI tests cover a valid bundled template path, a valid installed-workflow-style temp directory, an invalid schema-version case, and an unknown global workflow ID.

### Run 4: Schema-aware install/update and docs alignment (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/workflow-schema-runtime-contracts/runs/active/schema-aware-install-docs/spec.md` (created by the assigned workflow when this run starts)
- Task: Wire schema-v0 validation into workflow install/update flows and align shipped docs/prompts/templates with the new metadata and `mawm check` contract.
- Current state:
  - `src/cmd/surface/install.ts` resolves and writes workflow metadata, but does not expose schema-aware validation messaging beyond `Invalid workflow metadata`.
  - `src/cmd/surface/update.ts` refreshes installed workflows from manifest entries, but the roadmap/docs do not tell users to validate workflow contracts with `mawm check`.
  - Shipped `workflow-runner` and `mawma-manager` prompts refer to workflow metadata contracts but do not mention topology/configurable surfaces or deterministic check behavior.
  - The initiative and run spec templates do not remind planners to use `Verification commands`, even though the installed `coding` workflow parser expects that field.
- Outcome: `install` and global `update` reuse the schema validation utilities and surface clear schema/topology errors; docs and shipped/repo-local OpenCode agent prompts describe `mawm check` as the validation gate before execution; planning templates include a `Verification commands` field for planned runs so new specs match the `coding` workflow parser; README describes schema-v0 workflow metadata without promising project/run config yet.
- Scope: `src/cmd/surface/{install,update}.ts`, schema validation utilities as needed, README, shipped and repo-local OpenCode agent prompts, initiative/run spec templates under both `.mawm/agents/_templates/` and `src/assets/.mawm.project-local/agents/_templates/`, and tests for install/update validation messaging.
- Out of scope: Project-local `.mawm/mawm.json`, context/model config resolution, changes to `execute-graph` runtime payloads, and sibling coding repo edits.
- Contracts: Keep prompt/template mirror pairs synchronized; do not introduce project config docs before the dependent initiative lands; preserve `init -i` and `update -i` planning-asset behavior except for template text refreshes.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run test`
  - `diff -u ".opencode/agents/mawma-manager.md" "src/assets/.config/agents/opencode/agents/mawma-manager.md"`
  - `diff -u ".opencode/agents/mawma-planner.md" "src/assets/.config/agents/opencode/agents/mawma-planner.md"`
  - `diff -u ".opencode/agents/workflow-runner.md" "src/assets/.config/agents/opencode/agents/workflow-runner.md"`
- Smoke verification: `headless` - The CLI test suite proves invalid schema-v0 metadata is rejected by install/update/check, and mirror `diff` commands for touched prompt/template pairs are empty.

## Initiative Verification Gates

- Every run is complete, verified, reviewed, smoke-tested, and committed.
- `bun run typecheck`, `bun run lint:all`, and `bun run test` pass at initiative head.
- `mawm check` validates the bundled base and initiative workflow templates and reports explicit failures for schema-less metadata.
- Workflow template metadata, manifest entry types, README, and shipped agent prompts all describe the same schema-v0 contract.
- The MAWM-owned coding-workflow contract fixture matches the known current sibling coding workflow defaults listed in Initiative-wide Contracts.
- No project-local context/model config resolver, per-run config overlay, or OpenCode model override behavior is shipped by this initiative.
- Initiative-wide contracts still match the current codebase after the final run.
- PR from `initiative/workflow-schema-runtime-contracts` to `main` is opened with the initiative summary and verification evidence.

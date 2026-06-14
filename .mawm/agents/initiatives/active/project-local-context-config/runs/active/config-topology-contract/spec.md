# Run Spec: Run 2: Workflow topology contract, config schema, and scaffolds

## Assigned Workflow

`coding`

## Task

Extend the MAWM workflow metadata contract so installed workflows can declare agent and phase topology, preserve and surface that topology through install-time metadata plus `mawm list`, and scaffold the project-local/global files needed to author `.mawm/mawm.json` without changing runtime prompt injection behavior in this repo.

## Current State

- Target repo path: `/Users/michaelgreen/Documents/Projects/ai/maw-management/mawm`
- Initiative branch: `initiative/project-local-context-config`
- Requested run spec path: `/Users/michaelgreen/Documents/Projects/ai/maw-management/mawm/.mawm/agents/initiatives/active/project-local-context-config/runs/active/config-topology-contract/spec.md`
- `WorkflowMetadata` currently exposes only `id`, `displayName`, `workflowVersion`, `kind`, and `executionContract`; `normalizeWorkflowMetadata` has no path for optional topology arrays, so workflow-level agent/phase declarations cannot survive validation today (`src/config/workflow/metadata.ts:7-22`, `src/config/workflow/metadata.ts:75-144`).
- The manifest layer simply normalizes `WorkflowMetadata` plus `path` and `absolutePath`, so any topology omitted from workflow metadata is also absent from `~/.config/mawm/manifest.json` (`src/config/workflow/manifest.ts:6-37`, `src/config/workflow/manifest.ts:76-95`).
- `mawm list` reads directories under `~/.config/mawm` and prints bare directory names. It never reads `manifest.json` or installed workflow metadata, so topology is not visible anywhere in the CLI today (`src/cmd/surface/list.ts:11-19`).
- `init -i` only copies `src/assets/.mawm.project-local/agents` into `.mawm/agents`, and `update -i` only manages `.mawm/agents` assets with user-facing output hardcoded to that path (`src/cmd/surface/init.ts:14-21`, `src/cmd/surface/init.ts:207-211`, `src/utils/update/planning.ts:5-29`, `src/cmd/surface/update.ts:34-38`).
- The global MAWM scaffold copies the full `src/assets/.config/mawm` directory, but that asset currently contains only `manifest.json`, so `~/.config/mawm/prompts/` is never created (`src/config/user-config.ts:43-50`, `src/assets/.config/mawm/manifest.json:1`).
- The shipped workflow templates currently document only the existing metadata contract and do not model topology fields (`src/assets/workflow-templates/base/mawm.json:1-13`, `src/assets/workflow-templates/initiative/mawm.json:1-13`).
- Existing tests encode the pre-topology behavior: `list` expects plain workflow names, `init -i` only verifies `.mawm/agents`, and shared metadata/manifest fixture helpers do not include topology fields (`test/cli/list.test.ts:23-33`, `test/cli/init.test.ts:67-82`, `test/support/workflow.ts:15-38`).
- There is no existing `.mawm/mawm.json` schema asset and no JSON-schema validation dependency in the repo, so schema acceptance/rejection coverage does not exist yet (`package.json:33-76`).

## Goal

Workflow `mawm.json` files can optionally declare top-level `agents` and `phases` arrays, MAWM preserves those arrays through metadata reads/writes and manifest refresh, and `mawm list` exposes the installed topology in a stable human-readable format. Project scaffolding seeds a strict-JSON `.mawm/mawm.json` stub plus a colocated `.mawm/mawm.schema.json`, while global config scaffolding creates `~/.config/mawm/prompts/`. README text, workflow template metadata, and focused tests all reflect the new contract.

## Scope

- `src/config/workflow/metadata.ts`
- `src/config/workflow/manifest.ts`
- `src/cmd/surface/list.ts`
- `src/cmd/surface/init.ts`
- `src/cmd/surface/update.ts`
- `src/utils/update/planning.ts`
- `src/assets/.mawm.project-local/mawm.json`
- `src/assets/.mawm.project-local/mawm.schema.json`
- `src/assets/.config/mawm/manifest.json`
- `src/assets/.config/mawm/prompts/README.md`
- `src/assets/workflow-templates/base/mawm.json`
- `src/assets/workflow-templates/initiative/mawm.json`
- `README.md`
- `package.json`
- `test/config/workflow-metadata.test.ts`
- `test/config/project-local-config-schema.test.ts`
- `test/cli/init.test.ts`
- `test/cli/install.test.ts`
- `test/cli/list.test.ts`
- `test/cli/update.test.ts`
- `test/assets/base-template.test.ts`
- `test/assets/initiative-template.test.ts`
- `test/assets/workflow-template-distribution.test.ts`
- `test/support/workflow.ts`

## Out of Scope

- Reading `.mawm/mawm.json` at workflow runtime or turning it into prompt context; that lands in Run 3
- Any `execute-graph`, LangGraph runtime-context, or OpenCode node changes
- Model selection or per-run configuration work from the separate `per-run-config` initiative
- Validating that referenced prompt files exist, are readable, or are semantically correct
- Changes to install/update source resolution beyond carrying the expanded metadata shape
- Editing `.env` files or introducing any secret handling

## Contracts

- Extend `WorkflowMetadata` and `WorkflowManifestEntry` with optional top-level `agents` and `phases` arrays. Do not introduce a nested `topology` object; the contract stays flat in `mawm.json` and `manifest.json`.
- `agents` and `phases` are preserved in author order, must be arrays of unique non-empty strings, and must use the same kebab identifier shape expected by project-local config keys. Invalid topology shape fails metadata or manifest validation instead of being silently dropped.
- `resolveWorkflowMetadata()` fallback paths for workflows without `mawm.json` stay valid and continue returning metadata with no topology fields.
- `writeWorkflowMetadata()` and `refreshManifest()` must persist topology fields unchanged when present, and leave them absent when not declared.
- `mawm list` becomes manifest-driven so topology can be surfaced. Output remains one workflow per line using the stable format `workflow-id (agents: a, b; phases: x, y)` when both arrays exist, `workflow-id (agents: a, b)` or `workflow-id (phases: x, y)` when only one exists, and bare `workflow-id` when neither exists. Missing global config or missing manifest still returns an empty successful result.
- The scaffolded `.mawm/mawm.json` must remain valid JSON because downstream readers use `JSON.parse`. Use a `$schema` reference, empty arrays, and self-explanatory key ordering instead of inline JSON comments.
- The project-local schema contract covers structure only. It allows `context.global[]`, `context.phases.<phase-id>[]`, `context.workflows.<workflow-id>.global[]`, `context.workflows.<workflow-id>.agent.<agent-id>[]`, and `context.workflows.<workflow-id>.phases.<phase-id>[]`, with every leaf expressed as an array of strings. It does not validate file existence or cross-check agent/phase keys against installed workflow topology.
- `update -i` treats `.mawm/mawm.json` as create-only user config and must not overwrite an existing file. `.mawm/mawm.schema.json` is a managed asset and may be refreshed in place. Update-command output text must describe the broader `.mawm/` asset refresh instead of only `.mawm/agents`.
- The global config scaffold must materialize `~/.config/mawm/prompts/` through a tracked placeholder file. Use a small `README.md` in that directory so the location is both real on disk and self-documenting.
- Workflow template metadata must reflect the new contract accurately for the template graph they ship. Do not invent agent identifiers just to demonstrate the field.
- Schema verification in tests should execute the schema itself through a dev-only validator package rather than a handwritten mirror validator so the schema file stays the single source of truth.

## Implementation Plan

1. Extend `src/config/workflow/metadata.ts` so `WorkflowMetadata` accepts optional `agents` and `phases`, add the minimal validation helpers needed for kebab-array normalization, and add direct config tests in `test/config/workflow-metadata.test.ts` that cover valid topology, invalid topology, legacy metadata with no topology, and manifest entry round-trips.
2. Preserve the expanded metadata through `src/config/workflow/manifest.ts`, then update `src/cmd/surface/list.ts` to read `manifest.json` and render the stable topology-aware output format from the manifest entries instead of directory names.
3. Update `test/support/workflow.ts`, `test/cli/install.test.ts`, `test/cli/update.test.ts`, and `test/cli/list.test.ts` so install/update fixtures can assert topology persistence into installed `mawm.json`, manifest refresh, and the new `mawm list` output.
4. Add `src/assets/.mawm.project-local/mawm.schema.json` and a strict-JSON `src/assets/.mawm.project-local/mawm.json` stub with a local `$schema` reference, then wire `src/cmd/surface/init.ts` so `init -i` seeds those files alongside `.mawm/agents`.
5. Broaden `src/utils/update/planning.ts` and `src/cmd/surface/update.ts` so `update -i` manages `.mawm/mawm.schema.json`, seeds `.mawm/mawm.json` only when missing, keeps existing planning-doc preservation behavior, and reports the wider `.mawm/` refresh accurately.
6. Add `src/assets/.config/mawm/prompts/README.md` so `initializeUserConfig()` creates the global prompts root automatically, then extend `test/cli/init.test.ts` to assert that default `init` and `init -g` both create `~/.config/mawm/prompts/` and that `init -i` creates the project-local config stub without overwriting rerun state.
7. Update `src/assets/workflow-templates/base/mawm.json` and `src/assets/workflow-templates/initiative/mawm.json` to demonstrate the new metadata contract accurately, then extend `test/assets/base-template.test.ts`, `test/assets/initiative-template.test.ts`, and `test/assets/workflow-template-distribution.test.ts` so source assets, built assets, and installed assets all agree on the new metadata shape.
8. Add `test/config/project-local-config-schema.test.ts` plus the smallest necessary `package.json` dev-dependency change to validate `src/assets/.mawm.project-local/mawm.schema.json` against the documented example and a malformed sample, and update `README.md` to document workflow topology fields, the project-local config file, the schema location, and the global prompts directory.
9. Finish by running the targeted verification command and the repo-wide typecheck, lint, test, and build commands required by the initiative.

## Verification Commands

- `bunx vitest run test/config/workflow-metadata.test.ts test/config/project-local-config-schema.test.ts test/cli/init.test.ts test/cli/install.test.ts test/cli/list.test.ts test/cli/update.test.ts test/assets/base-template.test.ts test/assets/initiative-template.test.ts test/assets/workflow-template-distribution.test.ts`
- `bun run typecheck`
- `bun run lint:all`
- `bun run test`
- `bun run build`

## Smoke Verification

- Mode: `headless`
- Method: The targeted config, CLI, and asset tests prove that workflow topology survives metadata normalization and manifest refresh, `mawm list` surfaces it in the documented format, project init/update seed `.mawm/mawm.json` and `.mawm/mawm.schema.json` with the create-only vs managed-file contract, global init creates `~/.config/mawm/prompts/README.md`, and the schema accepts the documented example while rejecting malformed shapes.
- Manual instructions, if needed: None.

## Completion Gate

- Workflow `mawm.json` files can optionally declare `agents` and `phases`, and those fields survive read, write, install, and manifest refresh paths without breaking legacy metadata.
- `mawm list` reads installed manifest entries and prints topology in the stable output format defined in this spec.
- `mawm init -i` creates `.mawm/mawm.json` and `.mawm/mawm.schema.json`, while `mawm update -i` preserves existing `.mawm/mawm.json` content and refreshes the schema asset plus managed planning assets.
- Default global config initialization creates `~/.config/mawm/prompts/` in addition to `manifest.json`.
- Workflow template metadata assets, README documentation, and installed/built asset tests all reflect the new contract.
- Schema tests execute the shipped schema file itself and prove one valid example plus one malformed example behave as documented.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Headless smoke verification passes.
- Run is ready to become one commit on `initiative/project-local-context-config`.

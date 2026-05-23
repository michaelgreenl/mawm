# Workflow Templates - Initiative Spec Sheet

## Source of Truth Rules

- When initiative direction changes, update every affected active doc in the same pass.
- Any run specs created under `runs/active/` must match the run summaries in this spec.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.

## Target State

MAWM has two canonical workflow template assets backed by one shared bundle skeleton: an initiative template and a base template. The canonical source assets live under `src/assets/workflow-templates/{base,initiative,shared}`, the CLI build outputs scaffoldable distributed assets under `dist/assets/workflow-templates/{base,initiative}`, the initiative template matches the installed `coding` workflow contract shape without hardcoding coding-specific prompts, and the base template stays pure LangGraph by default with a minimal `summary`-based output contract.

## Initiative-wide Contracts

- The shared bundle surface for both distributed templates stays consistent: `package.json`, `langgraph.json`, `langgraph.dist.json`, `mawm.json`, `scripts/build.js`, `src/graph/index.ts`, and `test/`.
- The shared layer standardizes install/build shape only. It must not force OpenCode-backed nodes or coding-specific prompts into either template.
- Canonical source assets live under `src/assets/workflow-templates/{base,initiative,shared}`.
- Distributed scaffold assets live under `dist/assets/workflow-templates/{base,initiative}` and must be derived from the canonical source assets instead of from `workflows/examples/coding`.
- `src/assets/workflow-templates/shared` is an authoring-time shared layer; it does not need to ship as a standalone distributed template directory.
- The initiative-run template uses `kind: "initiative-run"`, requires `initiativeSpecPath` and `runSpecPath`, optionally accepts `selectedRunLabel`, requires `targetRepoPath` and `initiativeBranch`, optionally accepts `opencodeBaseUrl` and `parentSessionID`, and sets `supportsResume: true`.
- The standalone template uses `kind: "standalone"`, defaults to empty required/optional input and context arrays, and sets `supportsResume: false` unless a future variant explicitly opts into resume.
- `execute-graph-lib.ts:summarizeRunResult()` must prefer a generic `summary` field before falling back to legacy initiative-run summaries so standalone workflows are first-class citizens.
- `workflows/examples/coding/` remains a reference example, not a second source of truth for shipped template assets.
- `mawm init` flag work, user-facing template scaffold entry points, and README updates belong to the separate `cli-init-cleanup` initiative.

## Branch and PR Plan

- Target repo: `mawm`
- Base branch: `main`
- Initiative branch: `initiative/workflow-templates`
- Branch creation rule: create the initiative branch only when implementation is ready to begin.
- Run commit rule: each clean completed run becomes one commit.
- PR rule: open a PR from `initiative/workflow-templates` to `main` after all runs and initiative gates are complete.

## Execution Plan

### Run 1: Shared template asset skeleton (`coding`)

- [x] complete
- Run spec path: `.mawm/agents/initiatives/active/workflow-templates/runs/active/shared-template-skeleton/spec.md`
- Task: Establish the canonical `src/assets/workflow-templates/{base,initiative,shared}` source tree and the shared workflow bundle skeleton both template variants will reuse.
- Current state:
  - `workflows/examples/coding/` remains the only full workflow package example in the repo.
  - The canonical source tree now exists at `src/assets/workflow-templates/{base,initiative,shared}` with `shared/` owning the reusable bundle/build/test scaffold.
  - `base/` and `initiative/` currently remain thin overlay roots with explicit `overlay.json` ownership markers while CLI-shipped assets under `dist/assets/workflow-templates/*` are still pending later runs.
- Outcome:
  - A canonical `src/assets/workflow-templates/{base,initiative,shared}` source tree exists with one shared bundle skeleton source used by both template variants.
  - The shared layer defines the common bundle/build/test surface without encoding initiative-run or standalone-specific behavior.
- Scope:
  - Create the shared source-asset layout and the reusable bundle/build/test scaffolding both variants will inherit.
  - Capture only the minimum shared helpers, files, and copy/build conventions needed to keep both templates thin.
  - Keep the shared layer neutral about OpenCode, initiative docs, and branch semantics.
- Out of scope:
  - No full initiative-run template behavior.
  - No standalone template behavior.
  - No `mawm init` or README changes.
- Contracts:
  - The shared bundle surface matches the initiative-wide contract exactly.
  - The shared layer exists to remove duplication, not to create a hidden third workflow product.
  - `workflows/examples/coding/` may inform the shape, but `src/assets/workflow-templates/shared` becomes the canonical source for template reuse.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun test`
- Smoke verification: `headless` - run the automated asset/layout checks introduced in this run to prove the shared template skeleton is materialized in the expected source location.

### Run 2: Initiative template asset (`coding`)

- [x] complete
- Run spec path: `.mawm/agents/initiatives/active/workflow-templates/runs/active/initiative-run-template/spec.md`
- Task: Build the generic initiative template asset as a thin variant on the shared skeleton.
- Current state:
  - The installed `coding` workflow proves the initiative-run contract shape but is coding-specific.
  - `src/assets/workflow-templates/initiative` now contains the generic initiative template asset over the shared skeleton, including initiative-run metadata, graph modules, and template-local tests.
  - Source-side smoke coverage now materializes the initiative template into a temp workspace and verifies install, typecheck, build, and test behavior without depending on coding-specific prompts or OpenCode integrations.
- Outcome:
  - A canonical initiative template asset exists under `src/assets/workflow-templates/initiative` with the shared bundle surface and generic initiative-run mechanics.
  - The template includes planning/run-spec materialization flow, implementation placeholder flow, reviewer/gate plumbing, and an interrupt path without shipping coding-specific prompts.
- Scope:
  - Add the initiative template asset and its package/build/test surface.
  - Encode the runtime metadata contract expected by `initiative-manager`.
  - Keep the planning flow responsible for creating or rewriting the run spec from initiative context.
- Out of scope:
  - No base template asset.
  - No CLI entry-point or `init` flag work.
  - No generic standalone `summary` compatibility work beyond what this template already needs.
- Contracts:
  - `mawm.json` matches the installed `coding` contract fields exactly.
  - The template assumes initiative docs exist and that run-spec generation/update is part of the workflow itself.
  - The template must not hardcode coding-specific prompts, verification steps, or repo-language into the initiative asset.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun test`
- Smoke verification: `headless` - materialize `src/assets/workflow-templates/initiative` into a temp workspace, then run that hydrated template's own build and test commands to prove the asset is executable and exposes the expected `initiative-run` metadata and graph entrypoints.

### Run 3: Base template asset and summary compatibility (`coding`)

- [x] complete
- Run spec path: `.mawm/agents/initiatives/active/workflow-templates/runs/active/base-template/spec.md`
- Task: Build the minimal base template asset and make `execute-graph` summary handling generic enough to surface standalone results cleanly.
- Current state:
  - `src/assets/workflow-templates/base` now contains the reusable standalone base template asset with standalone metadata, a minimal LangGraph flow, and template-local tests.
  - `execute-graph-lib.ts:summarizeRunResult()` now prefers generic top-level `summary` output before legacy initiative-run summary fields in both helper copies.
- Outcome:
  - A canonical base template asset exists under `src/assets/workflow-templates/base` as a pure LangGraph base template.
  - `execute-graph` result summarization prefers `summary`, then falls back to legacy initiative-run fields so standalone workflows are first-class.
- Scope:
  - Add the base template asset and its package/build/test surface.
  - Keep the graph minimal: `START -> task -> END`, with only optional reviewer/interrupt examples if they do not expand the base contract.
  - Update `execute-graph-lib.ts` and tests so generic `summary` output is preferred.
- Out of scope:
  - No CLI scaffold command or `init` integration.
  - No install/project/launch smoke suite yet.
  - No README changes.
- Contracts:
  - `mawm.json` uses `kind: "standalone"` and a minimal default execution contract.
  - The base template contains no roadmap, run-spec, branch, or initiative-specific language.
  - The base template stays pure LangGraph by default; OpenCode-backed nodes remain an optional future variant, not the base asset.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun test`
- Smoke verification: `headless` - materialize `src/assets/workflow-templates/base` into a temp workspace, then run that hydrated template's own build and test commands plus automated summary/result checks proving `summary` is surfaced before legacy initiative-run fallbacks.

### Run 4: CLI-shipped template assets and smoke coverage (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/workflow-templates/runs/active/template-smoke-coverage/spec.md`
- Task: Ship the template assets with the CLI and add automated install/launch smoke coverage for the new template bundles.
- Current state:
  - Canonical source template assets now exist under `src/assets/workflow-templates/{base,initiative,shared}`, but the CLI does not yet ship scaffold-ready copies of them under `dist/assets/workflow-templates/{base,initiative}`.
  - The repo does not yet prove global install, project install, and `execute-graph` launch behavior for the new template bundles.
- Outcome:
  - CLI assets include scaffold-ready distributed copies of the canonical base and initiative templates under `dist/assets/workflow-templates/{base,initiative}`.
  - Automated smoke coverage proves global install, project install, and `execute-graph` launch for the template bundles.
- Scope:
  - Add the copy/build plumbing that ships the distributed template assets with the CLI.
  - Add automated smoke coverage for global install, project install, and `execute-graph` launch.
  - Validate both template kinds through `dist/assets/workflow-templates/{base,initiative}`, not just through their canonical source directories.
- Out of scope:
  - No `mawm init -t [type]` user-facing work.
  - No init output cleanup.
  - No README refresh.
- Contracts:
  - Shipped CLI assets under `dist/assets/workflow-templates/{base,initiative}` must be derived from canonical source assets under `src/assets/workflow-templates/{base,initiative,shared}`.
  - `shared/` remains a source-side authoring layer and does not need to be emitted as a standalone distributed template directory.
  - Smoke coverage must exercise install surfaces and launch surfaces headlessly.
  - This run closes the template-distribution gap that the separate CLI cleanup initiative will consume.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun test`
  - `bun run build`
- Smoke verification: `headless` - run the template smoke suite that covers global install, project install, and `execute-graph` launch using `dist/assets/workflow-templates/{base,initiative}`.

## Initiative Verification Gates

- Every run is complete, verified, reviewed, smoke-tested, and committed.
- Canonical `src/assets/workflow-templates/{base,initiative,shared}` sources and the distributed CLI assets under `dist/assets/workflow-templates/{base,initiative}` still match after the final run.
- The initiative-run template contract still matches the installed `coding` workflow metadata shape.
- The base/standalone template surfaces generic `summary` output cleanly through `execute-graph` helpers.
- Headless smoke coverage proves global install, project install, and `execute-graph` launch for the template bundles.
- PR from `initiative/workflow-templates` to `main` is opened with the initiative summary and verification evidence.

# Run Spec: Run 3: Base template asset and summary compatibility

## Assigned Workflow

`coding`

## Task

Build the minimal base template asset and make `execute-graph` summary handling generic enough to surface standalone results cleanly.

## Current State

- `src/assets/workflow-templates/shared/` already owns the neutral package, LangGraph config, build script, and minimal graph skeleton established in Run 1.
- `src/assets/workflow-templates/base/` still only contains `overlay.json` with `mawm.json` marked variant-owned; there is no standalone `mawm.json`, base-owned graph module, or template-local test surface yet.
- The shared skeleton currently points `langgraph.json` at `src/graph/index.ts` and ships a placeholder `finish` node, so the base variant must now take ownership of the minimal standalone graph behavior without turning shared into a third workflow product.
- `summarizeRunResult()` in both `.opencode/tools/execute-graph-lib.ts` and `src/assets/.config/agents/opencode/tools/execute-graph-lib.ts` still derives success summaries from `implementationSummary` and `planningSummary` only, so standalone workflows returning a top-level `summary` are not first-class yet.
- `test/assets/execute-graph-lib.test.ts` currently covers interrupted initiative-shaped output but does not yet lock in generic `summary` precedence for completed or interrupted standalone-style results.
- There is not yet a dedicated standalone smoke test file that composes `src/assets/workflow-templates/shared` with `src/assets/workflow-templates/base`, materializes a temp workspace, and runs the hydrated workspace checks; this run must add and require that coverage explicitly.
- Root `bun run typecheck` still does not typecheck embedded asset TypeScript under `src/assets/**/*.ts`, so this run must rely on targeted asset tests plus hydrated-template smoke coverage to prove the base template itself installs, builds, typechecks, and tests correctly.

## Goal (Run Outcome)

Leave the repo with a canonical standalone workflow template under `src/assets/workflow-templates/base` that stays a thin overlay on the shared skeleton, exposes a minimal pure-LangGraph `standalone` contract, returns a top-level `summary` suitable for generic reporting, and is backed by automated summary-precedence tests plus temp-workspace smoke coverage.

## Scope

- Add the missing base-template asset files under `src/assets/workflow-templates/base/`, including standalone workflow metadata, base-owned graph source, and any template-local tests required to keep the variant self-verifying.
- Keep the base template minimal and generic: one simple graph path from `START` to a task node to `END`, with no initiative-doc, branch, reviewer, or OpenCode-specific behavior.
- Update `base/overlay.json` so every base-owned path introduced by this run is declared explicitly and remains machine-readable.
- Add or refine source-side tests that validate standalone metadata, base graph behavior, overlay ownership, and hydrated temp-workspace execution for the composed shared-plus-base template.
- Update generic run-result summarization so `execute-graph` prefers a top-level `summary` before falling back to legacy initiative-run fields, and keep the live tool copy and scaffolded asset copy aligned.

## Out of Scope

- No CLI shipping or copy/build plumbing for `dist/assets/workflow-templates/{base,initiative}`; that remains Run 4.
- No `mawm init` entry-point work, scaffold selection UX, or README changes.
- No expansion of the base template into an OpenCode-backed, reviewer-driven, or initiative-aware workflow.
- No changes to the initiative template beyond any strictly necessary test or helper alignment caused by the generic summary precedence change.
- No new workflow kinds, resume semantics, or compatibility shims beyond the standalone contract already defined by the initiative spec.

## Contracts

- `src/assets/workflow-templates/base/mawm.json` must use template-generic branding, set `kind` to `"standalone"`, keep `requiredInput`, `optionalInput`, `requiredContext`, and `optionalContext` as empty arrays, and set `supportsResume` to `false`.
- `src/assets/workflow-templates/base` remains a thin overlay on `shared/`; `overlay.json` must list every base-owned path added or retained by this run, including `overlay.json`, `mawm.json`, and each base-owned source or test file.
- The hydrated base template must be self-contained when composed from `shared/` plus `base/`: it must install, typecheck, build, test, and load its graph without depending on `workflows/examples/coding/` or any initiative-specific files.
- The base graph must stay pure LangGraph and minimal by default: `START -> task -> END`, with task behavior limited to producing a generic standalone result shape rather than initiative-run state or control-flow.
- `summarizeRunResult()` must prefer a generic top-level `summary` whenever one exists, then fall back to legacy initiative-run summaries such as `implementationSummary` and `planningSummary`; interrupt payload summaries should still win when the interrupt itself provides a more specific summary.
- The summary-precedence change must stay synchronized between the live tool sources under `.opencode/tools/` and the mirrored scaffold asset sources under `src/assets/.config/agents/opencode/tools/`.
- Error handling and existing `runSpecPath` passthrough behavior in `summarizeRunResult()` must remain intact.
- The standalone hydration smoke coverage for this run must live in `test/assets/base-template.test.ts`, and that file must be the concrete command target used to prove the smoke path before completion.

## Implementation Plan

1. Audit `src/assets/workflow-templates/base/`, the shared workflow-template skeleton, both `execute-graph-lib.ts` copies, and the current tests against the Run 3 entry in `.mawm/agents/initiatives/active/workflow-templates/spec.md`, then remove or rewrite any stale assumptions that still treat the base variant as only an overlay marker.
2. Add the base-owned template files needed for a minimal standalone asset: create `mawm.json`, replace or overlay the shared `src/graph/index.ts` behavior with the base graph implementation, and add template-local tests only where shared tests are no longer sufficient to prove the standalone contract.
3. Update `src/assets/workflow-templates/base/overlay.json` so the base variant explicitly declares every owned path introduced in this run and keeps ownership boundaries between `shared/` and `base/` unambiguous.
4. Add or refine automated asset tests to cover the standalone metadata contract, graph creation and invocation behavior, overlay ownership, and a temp-workspace materialization path in `test/assets/base-template.test.ts` that composes `shared/` plus `base/`, installs dependencies, and runs the hydrated workspace's `bun run typecheck`, `bun run build`, and `bun test` commands.
5. Update `summarizeRunResult()` in both tool-helper copies so completed standalone outputs prefer top-level `summary`, interrupted outputs prefer interrupt-specific summaries then top-level `summary`, and legacy initiative-run fields remain the fallback path.
6. Expand `test/assets/execute-graph-lib.test.ts` to lock in summary precedence for completed standalone outputs, interrupted standalone outputs without interrupt-local summaries, and existing initiative-run-shaped fallback behavior.
7. Keep all work source-side for this run: do not add CLI distribution plumbing, init wiring, or README updates.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`
- `bun run test`
- `bun test test/assets/base-template.test.ts`

## Smoke Verification

- Mode: `headless`
- Method: `bun test test/assets/base-template.test.ts`
- Manual instructions, if needed: None.
- Expected coverage from `test/assets/base-template.test.ts`: materialize `src/assets/workflow-templates/shared` plus `src/assets/workflow-templates/base` into a temp workspace, install the hydrated template, run that workspace's `bun run typecheck`, `bun run build`, and `bun test`, validate the hydrated standalone metadata and graph entrypoint, and include the standalone-specific assertions that prove the smoke path is exercising the composed base template rather than shared files alone.

## Completion Evidence

- Workflow final status: `completed`
- Workflow code review: `No blocking issues found. The implementation matches the Run 3 contracts for the standalone base template, generic summary precedence, overlay ownership, and automated smoke coverage.`
- Fresh verification:
  - `bun run typecheck` -> `$ tsc --noEmit`
  - `bun run lint:all` -> `All matched files use Prettier code style!`
  - `bun run test` -> `60 pass`, `0 fail`
  - `bun test test/assets/base-template.test.ts` -> `4 pass`, `0 fail`

## Completion Gate

- `src/assets/workflow-templates/base` is a complete standalone overlay on the shared skeleton rather than only an ownership marker.
- The base template `mawm.json` matches the standalone contract from the initiative spec: generic branding, empty input and context arrays, and `supportsResume: false`.
- The base graph remains minimal, pure LangGraph, and free of initiative-run or OpenCode-specific behavior.
- `base/overlay.json` explicitly declares every base-owned path introduced by the run.
- `summarizeRunResult()` prefers generic `summary` output first while preserving interrupt specificity, error reporting, and legacy initiative-run fallback behavior.
- The live `.opencode` helper copy and the scaffolded asset helper copy remain behaviorally aligned.
- Source-side tests cover metadata, graph behavior, summary precedence, and hydrated template execution.
- Verification commands pass.
- Smoke verification passes via `bun test test/assets/base-template.test.ts`.
- Run is ready to become one commit on the initiative branch.

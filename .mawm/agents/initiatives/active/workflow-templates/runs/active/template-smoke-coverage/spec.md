# Run Spec: Run 4: CLI-shipped template assets and smoke coverage

## Assigned Workflow

`coding`

## Task

Ship the template assets with the CLI and add automated install/launch smoke coverage for the new template bundles.

## Current State

- Canonical source assets already live under `src/assets/workflow-templates/{shared,base,initiative}`, with `overlay.json` defining the variant-owned paths for `base` and `initiative`.
- `scripts/copy-assets.mjs` already treats `workflow-templates/` as a special build case: it copies `src/assets` into `dist/assets`, deletes the raw copied `dist/assets/workflow-templates` subtree, and materializes only `dist/assets/workflow-templates/base` and `dist/assets/workflow-templates/initiative` from `shared/` plus each variant overlay.
- `test/assets/workflow-template-distribution.test.ts` already exists and exercises the intended Run 4 path end to end: `bun run build`, dist-tree validation, global install from emitted template assets, project install into `.mawm/graphs`, and headless launch of both installed workflows through a LangGraph dev server.
- The current smoke test asserts the key outcome contracts already defined by earlier runs: `base-template` completes with `summary: "Standalone workflow completed."`, and `initiative-template` completes headlessly and writes the requested `runSpecPath` from fixture initiative input.
- CLI install/update surfaces already support both workflow-root installs and dist-root installs via `src/cmd/surface/install.ts` and `src/utils/update/global.ts`, so this run does not need a second install mechanism.
- Root verification still has an important blind spot: `bun run typecheck` does not typecheck embedded asset TypeScript under `src/assets/**/*.ts`, so Run 4 completion still depends on `bun run build` plus the dedicated distribution smoke test rather than on root typecheck alone.
- The run remains active because the source of truth initiative spec still marks Run 4 incomplete, so the implementation-ready plan for this run is to confirm the current code satisfies every Run 4 contract, make only the smallest corrective edits needed, and finish with full verification evidence.

## Goal (Run Outcome)

Leave the repo in a commit-ready state where the CLI ships scaffold-ready workflow template assets under `dist/assets/workflow-templates/{base,initiative}` and automated headless smoke coverage proves those emitted bundles can be globally installed, installed into a target project, and launched successfully using the same practical runtime path as `execute-graph`.

## Scope

- Keep `src/assets/workflow-templates/{shared,base,initiative}` as the canonical source of truth and ensure the shipped CLI assets are derived from that tree only.
- Preserve the build-time materialization path in `scripts/copy-assets.mjs` so only composed `base/` and `initiative/` template roots ship under `dist/assets/workflow-templates/`.
- Keep `shared/` as an authoring-time layer only; do not emit `dist/assets/workflow-templates/shared` as a standalone distributed workflow.
- Keep `test/assets/workflow-template-distribution.test.ts` as the concrete smoke target for this run and ensure it validates build output, global install, project install, and launch coverage against the emitted dist assets.
- Exercise both shipped workflow kinds through the dist outputs themselves, not through direct hydration from `src/assets/workflow-templates/*`.
- Preserve the earlier run contracts already encoded in the shipped assets: standalone `summary` output for `base-template` and initiative-run run-spec materialization for `initiative-template`.

## Out of Scope

- No `mawm init` flag work, template-selection UX, or scaffold cleanup that belongs to the separate `cli-init-cleanup` initiative.
- No README refresh or broader documentation work.
- No new workflow kinds, no new summary-contract work beyond the Run 3 compatibility already landed, and no reintroduction of coding-specific behavior into the shipped templates.
- No source-of-truth shift back to `workflows/examples/coding/`; it remains a reference example only.
- No broad refactor of install/update codepaths beyond the smallest change needed if a Run 4 contract gap is found.

## Contracts

- `dist/assets/workflow-templates/{base,initiative}` must be produced by composing `src/assets/workflow-templates/shared` with the matching variant directory using that variant's `overlay.json` as the explicit ownership contract.
- `dist/assets/workflow-templates/shared` must not exist after `bun run build`.
- Each emitted template root must remain a self-contained scaffoldable workflow workspace containing the shared bundle surface: `package.json`, `langgraph.json`, `mawm.json`, `scripts/build.js`, `src/graph/index.ts`, and `test/`, plus the variant-owned files declared in `overlay.json`.
- The emitted `mawm.json` files must preserve the established workflow identities and execution contracts: `base-template` as `kind: "standalone"` with empty required/optional inputs and contexts and `supportsResume: false`; `initiative-template` as `kind: "initiative-run"` with required input `initiativeSpecPath` and `runSpecPath`, optional input `selectedRunLabel`, required context `targetRepoPath` and `initiativeBranch`, optional context `opencodeBaseUrl` and `parentSessionID`, and `supportsResume: true`.
- Smoke coverage for this run must validate the emitted dist assets themselves, not only the canonical source template directories.
- The launch smoke path must continue to match `execute-graph` runtime expectations in practical terms: resolve the installed workflow root, read `langgraph.json`, resolve an assistant id, ensure workflow runtime dependencies are present, start a local LangGraph dev server, create a thread, submit the run payload, summarize the result, and shut the server down cleanly.
- The base-template smoke assertion must prove a completed headless run with `summary: "Standalone workflow completed."`.
- The initiative-template smoke assertion must use a fixture initiative spec, run headlessly without a manual interrupt, and verify that the workflow writes the requested `runSpecPath`.
- The concrete smoke file for this run is `test/assets/workflow-template-distribution.test.ts`; if Run 4 needs code changes, they should keep that file as the authoritative command target for build-output, install-surface, and launch validation.

## Implementation Plan

1. Audit the current Run 4 implementation in `scripts/copy-assets.mjs` and `test/assets/workflow-template-distribution.test.ts` against the initiative spec and this run spec, treating the existing code as the baseline and identifying only concrete contract mismatches.
2. If the build output diverges from the contracts, make the smallest correction in `scripts/copy-assets.mjs` so `bun run build` emits only the composed `base/` and `initiative/` template roots and never leaves `dist/assets/workflow-templates/shared` behind.
3. If the smoke suite misses a required install or launch guarantee, tighten `test/assets/workflow-template-distribution.test.ts` rather than adding a parallel smoke path; it must remain the single end-to-end proof target for this run.
4. Preserve the existing use of `overlay.json` as the machine-readable ownership contract and fail fast if a declared variant-owned path is missing or the emitted file set no longer matches `shared/` plus the overlay.
5. Preserve the real CLI surfaces already in use: global install from emitted dist assets via `mawm install -g`, project install into `.mawm/graphs`, and launch through the LangGraph dev-server flow exercised in the current smoke test.
6. Keep the initiative smoke fixture minimal and generic so the shipped initiative template proves run-spec generation without depending on coding-specific prompts, repository language, or manual smoke behavior.
7. Avoid unrelated refactors. Any edit in this run must directly support one of three outcomes only: correct dist asset materialization, correct install/update behavior for shipped templates, or correct headless smoke coverage.
8. Finish by running the full verification set, with special weight on `bun run build` and `bun test test/assets/workflow-template-distribution.test.ts`, because those commands are the authoritative evidence for this run.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`
- `bun run test`
- `bun run build`
- `bun test test/assets/workflow-template-distribution.test.ts`

## Smoke Verification

- Mode: `headless`
- Method: `bun test test/assets/workflow-template-distribution.test.ts`
- Manual instructions, if needed: None.

## Completion Evidence

- Workflow final status: `completed`
- Workflow code review: `No scope or contract issues found. Run 4 is accurately marked complete: build materializes only composed dist/assets/workflow-templates/{base,initiative}, the smoke test validates emitted dist assets, global install, project install, base-template completion summary, and initiative-template run-spec creation.`
- Fresh verification:
  - `bun run typecheck` -> `$ tsc --noEmit`
  - `bun run lint:all` -> `All matched files use Prettier code style!`
  - `bun run test` -> `61 pass`, `0 fail`
  - `bun run build` -> `$ tsc && node scripts/copy-assets.mjs`
  - `bun test test/assets/workflow-template-distribution.test.ts` -> `1 pass`, `0 fail`

## Completion Gate

- TDD implementation is complete within scope.
- `bun run build` emits scaffold-ready workflow template assets under `dist/assets/workflow-templates/base` and `dist/assets/workflow-templates/initiative` only.
- The emitted template assets are still derived from `src/assets/workflow-templates/{shared,base,initiative}` rather than from `workflows/examples/coding/`.
- `dist/assets/workflow-templates/shared` is absent after build.
- Both emitted template roots preserve the expected workflow metadata contracts for `base-template` and `initiative-template`.
- Automated smoke coverage proves global install and project install from the emitted dist assets for both template kinds.
- Automated smoke coverage proves headless launch for both installed workflows, including the standalone summary assertion for `base-template` and `runSpecPath` creation for `initiative-template`.
- Existing source-template tests and generic CLI install/update behavior remain passing.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes via `bun test test/assets/workflow-template-distribution.test.ts`.
- Run is ready to become one commit on the initiative branch.

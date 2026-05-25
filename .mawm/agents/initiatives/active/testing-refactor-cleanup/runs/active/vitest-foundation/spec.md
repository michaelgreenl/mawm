# Run Spec: Run 1: Vitest foundation and root test support

## Assigned Workflow

`coding`

## Task

Introduce Vitest for repo-root testing, add shared fixtures/support utilities, and migrate the current root suite under `test/**` off `bun:test` without doing the deeper scope-pruning work yet.

## Current State

- Repo-root `package.json` still runs `bun test ./test`, there is no Vitest dependency or config, and every root test file under `test/**` imports from `bun:test`.
- The root suite still contains Bun-only test-runner assumptions beyond imports: `test/assets/**/*.test.ts` uses `Bun.spawnSync`, `test/assets/workflow-template-skeleton.test.ts` uses `import.meta.dir`, and several asset tests run long install/build/server-launch flows that will exceed Vitest defaults unless configured.
- CLI suites under `test/cli/*.test.ts` duplicate the same temp-root tracking, JSON/path helpers, stdout/stderr capture, and `CommandContext` setup across multiple files.
- The current root entry point stays isolated only because `bun test ./test` scopes collection to `test/**`; a naive `vitest run` would also collect `src/assets/workflow-templates/**/test` and `workflows/examples/coding/test/**`, which this run must leave alone.
- Several root tests depend on built `dist` assets or the built CLI entry point, so the headless repo-root verification path already depends on `bun run build` before `bun run test`.
- Some root asset assertions intentionally still reference generated template workspace `bun test` behavior. Those expectations remain correct until run 3 migrates embedded template tests.

## Goal (Run Outcome)

Repo-root tests execute through a stable Vitest setup from `bun run test`, all files under `test/**` run without `bun:test` or other Bun-only root test-runner dependencies, and the current root suite uses shared support helpers instead of repeating the same temp-workspace and output-capture setup in each file.

## Scope

- Add repo-root Vitest dependency/configuration and update repo-root test scripts so `bun run test` executes the root suite through Vitest.
- Keep Vitest collection limited to `test/**` and configure it for a Node environment, serial file execution, and timeouts that support the current long-running asset smoke tests.
- Add minimal shared support under `test/` for tracked temp paths/workspaces, output capture, JSON/file helpers, command-context creation, and Node-based subprocess execution/assertion used repeatedly by the root suite.
- Migrate every file under `test/**` from `bun:test` to explicit `vitest` imports and replace remaining Bun-only test helpers with Node-compatible equivalents.
- Update root tests to consume the shared support where duplication is currently highest, especially the CLI command suites and the reusable root asset smoke/setup flows.

## Out of Scope

- Do not audit or prune stale, backward-compatibility, or implementation-detail coverage beyond edits required to make the Vitest migration pass.
- Do not migrate `src/assets/workflow-templates/**/test` or change template package test scripts away from `bun test` in this run.
- Do not modify `workflows/examples/coding/test/**` or any example-workflow prompt text that intentionally references `bun:test`.
- Do not broaden product behavior, CLI contracts, or workflow-template behavior just to simplify the test migration.

## Contracts

- `bun run test` from the repo root must execute Vitest against `test/**` only; it must not accidentally collect `src/assets/workflow-templates/**/test` or `workflows/examples/coding/test/**`.
- Root tests must run under Node-compatible Vitest execution. Replace Bun-only root test APIs such as `bun:test`, `Bun.spawnSync`, and `import.meta.dir` with Vitest or Node equivalents instead of depending on Bun runtime behavior.
- Because several suites patch `process.stdout` and `process.stderr`, manage shared temp roots, and launch subprocesses, the Vitest setup must avoid cross-file parallelism and provide timeouts high enough for the current asset flows.
- Preserve current asserted behavior during the runner migration. Root asset tests may continue asserting that generated template workspaces run `bun test` until run 3 changes that contract.
- Keep the migration small and explicit: prefer imported Vitest APIs over global test globals, and keep production code changes limited to what is strictly required to support the new root test runner and shared test support.

## Implementation Plan

1. Add `vitest` as a repo-root dev dependency and create a repo-root Vitest config that uses the Node environment, includes only `test/**/*.test.ts`, disables cross-file parallelism, and raises test and hook timeouts for the asset smoke tests.
2. Update the repo-root `test` script in `package.json` to invoke Vitest through Bun, preserving `bun run test` as the headless repo-root test entry point.
3. Add a small `test/support/` layer for reusable root-test helpers covering tracked temp directory/workspace creation and cleanup, JSON read/write and existence helpers, stdout/stderr capture, shared `CommandContext` construction, and Node-based subprocess execution/assertion.
4. Migrate all root tests under `test/**` from `bun:test` to explicit `vitest` imports, and replace Bun-only runtime helpers with the new shared support or direct Node equivalents, including the `import.meta.dir` path handling in `test/assets/workflow-template-skeleton.test.ts`.
5. Consolidate the duplicated inline helpers in `test/cli/*.test.ts` and the reusable subprocess/workspace helpers in `test/assets/*.test.ts`, while keeping assertions and case coverage materially unchanged except where the Vitest runner requires direct adaptation.
6. Verify the full repo-root sequence with `bun run typecheck`, `bun run lint:all`, `bun run build`, and `bun run test`, and confirm the final test run is Vitest-driven and scoped to the root suite only.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`
- `bun run build`
- `bun run test`

## Smoke Verification

- Mode: `headless`
- Method: From the repo root, run the verification sequence through `bun run build` and `bun run test`, then confirm the final test run reports Vitest execution for the root suite only while the generated template workspace smoke checks inside root asset tests still use their current `bun test` scripts.
- Manual instructions, if needed: None.

## Completion Gate

- TDD implementation is complete within scope.
- Code review is clear or all findings have been resolved.
- Repo-root Vitest configuration exists and `bun run test` executes only `test/**`.
- No file under `test/**` imports from `bun:test` or depends on Bun-only root test-runner APIs.
- Shared root-test support replaces the duplicated temp-workspace, output-capture, and helper patterns in the current CLI suites and applicable root asset smoke helpers.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

# Testing Refactor and Cleanup - Initiative Spec Sheet

## Source of Truth Rules

- When initiative direction changes, update every affected active doc in the same pass.
- Any run specs created under `runs/active/` must match the run summaries in this spec.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.
- Run specs are intentionally not prewritten for this initiative; the assigned workflow creates each run spec at the listed path when that run begins.

## Target State

- Repo-root tests and workflow-template asset tests run through Vitest instead of `bun:test`.
- Test support code provides shared fixtures/helpers for temp workspaces, output capture, and repeated filesystem assertions instead of duplicating that setup across suites.
- The retained suite covers only current, legitimate project behavior now that the repo is still v0; backward-compatibility, regression-only, and implementation-detail tests are removed.
- `workflows/examples/coding/test/**` remains outside this initiative and is left unchanged.

## Initiative-wide Contracts

- This initiative refactors test infrastructure and test coverage boundaries; it does not intentionally expand product behavior.
- Repo-root tests under `test/**` and workflow-template asset tests under `src/assets/workflow-templates/**/test` move to Vitest as part of this initiative.
- `workflows/examples/coding/test/**` and example-workflow prompt expectations that intentionally reference `bun:test` are out of scope for this initiative.
- Remove tests that exist only for backward compatibility, regression preservation, authoring-style enforcement, or internal implementation structure unless they correspond to a current supported contract.
- Current supported contracts for this initiative are user-visible CLI behavior, shipped workflow metadata/runtime behavior, generated template workspace behavior, and other externally observable results that the project still claims today.
- Each run must leave the repo in a headless-verifiable state from the repo root.

## Branch and PR Plan

- Target repo: `mawm`
- Base branch: `main`
- Initiative branch: `initiative/testing-refactor-cleanup`
- Branch creation rule: create the initiative branch from `main` only when implementation is ready to begin.
- Run commit rule: each clean completed run becomes one commit.
- PR rule: open a PR from the initiative branch to `main` after all runs and initiative gates are complete.

## Execution Plan

### Run 1: Vitest foundation and root test support (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/testing-refactor-cleanup/runs/active/vitest-foundation/spec.md`
- Task:
  - Introduce Vitest for repo-root testing, add shared fixtures/support utilities, and migrate the current root suite under `test/**` off `bun:test` without doing the deeper scope-pruning work yet.
- Current state:
  - The repo root currently uses `bun test ./test`, has no Vitest dependency/config, and root tests import `bun:test`.
  - CLI tests duplicate temp workspace, output-capture, and filesystem helpers across multiple files.
  - Root asset smoke tests rely on Bun subprocess helpers, but there is no shared support layer that makes the suite easy to maintain.
- Outcome:
  - Repo-root tests run through a stable Vitest setup with shared test support/fixtures and a headless repo-root verification path.
- Scope:
  - Add the root Vitest dependency/configuration and update repo-root test scripts as needed.
  - Add shared support/fixture helpers for repeated temp workspace, output capture, JSON/path, and filesystem assertions used by root tests.
  - Migrate repo-root test files under `test/**` from `bun:test` to Vitest-compatible imports/setup.
- Out of scope:
  - Do not do the main stale-test audit yet beyond changes required to complete the runner migration.
  - Do not migrate `src/assets/workflow-templates/**/test` in this run.
  - Do not change `workflows/examples/coding/test/**`.
- Contracts:
  - Preserve current asserted behavior during the runner migration unless a case is explicitly deferred to a later cleanup run.
  - Keep production code changes limited to what is required to support the new test runner and shared test support.
  - The post-run repo-root verification path must stay fully headless.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run build`
  - `bun run test`
- Smoke verification: `headless` - Run the repo-root automated suite and confirm the root test entry point now executes through Vitest.

### Run 2: Root supported-behavior suite cleanup (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/testing-refactor-cleanup/runs/active/root-supported-behavior-suite-cleanup/spec.md`
- Task:
  - Audit and trim the repo-root suite so retained non-template tests assert only current supported behavior and use the shared fixtures/support from run 1.
- Current state:
  - The root suite still includes legacy/backward-compatibility and stale-install style cases, plus assertions that mirror implementation details instead of supported behavior.
  - Shared support exists after run 1, but current root coverage boundaries still reflect pre-cleanup assumptions.
- Outcome:
  - Repo-root CLI and non-template helper tests cover current legitimate behavior only, with stale backward-compatibility/regression-only/implementation-detail cases removed or rewritten.
- Scope:
  - Audit `test/cli/**` and other repo-root tests whose subject is current root behavior rather than workflow-template assets.
  - Rewrite retained tests to assert external outcomes/contracts instead of internal file layout or migration-specific details.
  - Consolidate any remaining duplicated repo-root support code when it directly serves the retained suite.
- Out of scope:
  - Do not clean up workflow-template asset coverage in `test/assets/**` when the primary subject is template behavior; that belongs to run 3.
  - Do not preserve backward-compatibility or regression-only cases just because they existed before.
  - Do not change `workflows/examples/coding/test/**`.
- Contracts:
  - For v0, tests should not be kept solely to preserve historical behavior or migration paths.
  - Retained root coverage must map to behavior users can still trigger today.
  - This run should reduce stale assertions without widening product scope.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run build`
  - `bun run test`
- Smoke verification: `headless` - Run the repo-root suite and confirm the retained non-template tests only describe current supported behavior.

### Run 3: Workflow-template test cleanup and Vitest migration (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/testing-refactor-cleanup/runs/active/workflow-template-test-cleanup-and-vitest-migration/spec.md`
- Task:
  - Clean up workflow-template coverage, migrate workflow-template asset tests to Vitest, and keep only current supported template behavior while leaving excluded example workflow tests unchanged.
- Current state:
  - Workflow-template coverage spans root tests under `test/assets/**` plus embedded template tests under `src/assets/workflow-templates/**/test`, and those tests currently rely on `bun:test`/`bun test`.
  - Some workflow-template tests enforce overlay ownership, authoring/maintainability rules, or other internal implementation details rather than current supported behavior.
  - `workflows/examples/coding/test/**` intentionally remains Bun-based and is outside this initiative.
- Outcome:
  - Workflow-template asset coverage keeps only supported template/runtime/distribution behavior, and template-owned tests run through Vitest without touching the excluded example workflow suite.
- Scope:
  - Audit workflow-template-facing tests in `test/assets/**` and retain only cases that validate supported template behavior or distribution/runtime contracts.
  - Remove workflow-template tests that only assert implementation structure, authoring-style rules, or historical expectations that the project no longer needs.
  - Migrate `src/assets/workflow-templates/**/test` and related template package test scripts/setup from Bun test runner usage to Vitest.
  - Update retained template smoke tests so generated template workspaces still install, build, typecheck, and test successfully after the migration.
- Out of scope:
  - Do not modify `workflows/examples/coding/test/**`.
  - Do not change example coding prompts that intentionally reference `bun:test`.
  - Do not broaden workflow-template feature scope beyond what is needed to align testing with current supported behavior.
- Contracts:
  - Supported workflow-template contracts are metadata shape, generated workspace install/build/typecheck/test behavior, and observable graph/runtime behavior.
  - Internal overlay ownership, file-size/JSDoc authoring policies, and similar implementation-detail checks should not survive unless they are promoted to an actual supported contract.
  - Root workflow-template coverage and embedded template tests must agree on the same supported behavior after cleanup.
- Verification commands:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run build`
  - `bun run test`
- Smoke verification: `headless` - Run the repo-root suite and confirm generated template workspaces still install, build, typecheck, and test successfully with the Vitest-based template test setup, while the excluded example workflow tests remain unchanged.

## Initiative Verification Gates

- Every run is complete, verified, reviewed, smoke-tested, and committed.
- Repo-root verification passes after the final run:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run build`
  - `bun run test`
- Repo-root tests and workflow-template asset tests no longer depend on `bun:test`; any remaining Bun-based test coverage is only in the explicitly excluded `workflows/examples/coding/test/**` path.
- The retained suite matches current supported behavior only and does not preserve backward-compatibility, regression-only, or implementation-detail coverage just because it existed historically.
- Initiative-wide contracts still match the current codebase after the final run.
- PR from `initiative/testing-refactor-cleanup` to `main` is opened with the initiative summary and verification evidence.

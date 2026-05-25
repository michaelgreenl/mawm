# Run Spec: Run 2: Root supported-behavior suite cleanup

## Assigned Workflow

`coding`

## Task

Audit and trim the repo-root suite so retained non-template tests assert only current supported behavior and use the shared fixtures/support from run 1.

## Current State

- Repo-root testing already runs through Vitest, and shared helpers exist under `test/support/`, but the retained non-template suite is still concentrated in `test/cli/*.test.ts` with inconsistent helper usage and command-invocation styles.
- `test/cli/arguments.test.ts` and `test/cli/user-config.test.ts` still assert internal parser and config-helper functions directly (`parseCommandInputs`, `resolveHomeDirectory`, `resolveUserConfigRoot`) instead of current user-visible CLI behavior.
- Several CLI tests still seed legacy partial `mawm.json` or `manifest.json` fixtures and then assert normalized default metadata after `remove` or `update`, which keeps backward-compatibility and stale-install expectations alive inside the root suite.
- `test/cli/init.test.ts` still mixes current CLI flows with legacy migration behavior (`manager.md` replacement), exact copied asset and file-content checks, prompt-callback path assertions, file `mtime` assertions, and `-t` cases whose primary subject is generated template content rather than root CLI contracts.
- `test/cli/install.test.ts` still includes `no longer exposes the register command`, and `test/cli/update.test.ts` still includes the broken-global-manifest `missing absolutePath` repair path; both are regression-only or stale-install coverage rather than current supported behavior.
- The CLI suite still repeats the same temp-root cleanup, workflow metadata fixtures, and local helper logic across `init`, `install`, `remove`, and `update`, including a local `pathExists` helper in `test/cli/init.test.ts`.

## Goal (Run Outcome)

Repo-root non-template tests cover only current supported CLI and root workflow behavior, internal/helper and legacy/regression-only cases are removed, template-content assertions are left for run 3, and the retained CLI suite uses small shared helpers instead of repeating temp-workspace and fixture boilerplate.

## Scope

- Audit `test/cli/*.test.ts` as the root supported-behavior suite for `init`, `install`, `update`, `remove`, and `list`.
- Delete direct internal-helper suites `test/cli/arguments.test.ts` and `test/cli/user-config.test.ts`; keep grouped-short and `-t` parsing coverage only where it is exercised through real command tests.
- Remove explicit backward-compatibility and stale-install coverage from the CLI suite, including the removed `register` command check, the `manager.md` rename migration case, and the broken-global-manifest `missing absolutePath` update case.
- Rewrite retained `init`, `install`, `remove`, and `update` tests to assert exit codes, stdout or stderr, installed or removed files, and current manifest or metadata outcomes without pinning internal copy layout, prompt callback arguments, exact asset file contents, or `mtime` preservation unless the behavior itself is part of the user-visible contract.
- Keep `init -t` coverage in run 2 limited to CLI-surface parsing, flag validation, and minimal success or failure behavior; any detailed assertions about generated template workspace contents or template-owned runtime behavior stay in run 3.
- Consolidate remaining repeated root-test support that directly serves the retained suite, especially temp-root tracking and cleanup, current normalized workflow metadata fixtures, and a consistent CLI invocation helper.

## Out of Scope

- Do not audit or change `test/assets/**`, `src/assets/workflow-templates/**/test`, or `workflows/examples/coding/test/**` in this run.
- Do not turn run 2 into workflow-template cleanup; detailed template scaffold-content assertions and generated workspace smoke flows belong to run 3.
- Do not preserve tests solely because they document a removed command, legacy manifest shape, stale install repair path, or migration-only asset rename.
- Do not change production CLI or runtime behavior just to satisfy old tests or to create broader parser or helper unit coverage.

## Contracts

- Retained root coverage must map to behavior users can trigger today through the published repo-root CLI surface: `init`, `install`, `update`, `remove`, `list`, their declared aliases, current error handling, and current on-disk install, update, remove, and list results.
- Internal utilities such as `parseCommandInputs`, `resolveHomeDirectory`, and `resolveUserConfigRoot` are not standalone contracts in this run. If coverage is still needed, exercise it through command-level tests rather than direct helper suites.
- Seed retained install, update, and remove fixtures with the current normalized `mawm.json` and `manifest.json` shape by default. Do not keep cases that only prove normalization of legacy partial metadata or missing `absolutePath` repair guidance.
- `init -t` cases in run 2 may verify command parsing, flag conflicts, unknown template type errors, and successful top-level invocation, but they must not remain the main place that asserts template-owned scaffold contents; that belongs to run 3.
- Helper consolidation must stay small and explicit under `test/support/`; prefer one narrow helper per repeated concern over introducing a broader custom testing framework.

## Implementation Plan

1. Remove `test/cli/arguments.test.ts` and `test/cli/user-config.test.ts`, and delete the legacy-only cases from `test/cli/install.test.ts`, `test/cli/init.test.ts`, and `test/cli/update.test.ts` (`register`, `manager.md`, and `missing absolutePath`).
2. Tighten `test/cli/init.test.ts`: replace the local `pathExists` helper with shared support, update stale case names, keep current `-g`, `-i`, `-a`, overwrite-confirmation, and idempotency coverage, and limit `-t` cases to CLI-surface behavior instead of deep template-content assertions.
3. Tighten `test/cli/install.test.ts`, `test/cli/remove.test.ts`, `test/cli/update.test.ts`, and `test/cli/list.test.ts`: use current fixture shapes, assert current install, remove, update, and list outcomes plus required runtime artifacts, and stop pinning legacy normalization side effects or internal helper details.
4. Add the smallest shared support needed under `test/support/` for tracked temp roots or workspaces, canonical current workflow metadata or manifest builders, and consistent CLI execution; keep injected-overwrite helpers local only where `createInitCommand` requires them.
5. Normalize retained command tests to exercise the public CLI surface consistently, preferring `parseCommand(...)` or a shared wrapper instead of mixing direct `.run` calls unless direct invocation is required for injected dependencies.
6. Verify the full repo-root sequence with `bun run typecheck`, `bun run lint:all`, `bun run build`, and `bun run test`, then confirm the remaining non-template root suite no longer contains direct parser or user-config helper tests or regression-only legacy cases.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`
- `bun run build`
- `bun run test`

## Smoke Verification

- Mode: `headless`
- Method: From the repo root, run the verification sequence through `bun run build` and `bun run test`, then confirm the retained `test/cli/*.test.ts` coverage is limited to current CLI behavior, no root CLI test imports `parseCommandInputs` or `resolveUserConfigRoot`, and no retained case asserts the removed `register` command, the legacy `manager.md` migration, or the broken `missing absolutePath` repair path.
- Manual instructions, if needed: None.

## Completion Gate

- TDD implementation is complete within scope.
- Code review is clear or all findings have been resolved.
- `test/cli/arguments.test.ts` and `test/cli/user-config.test.ts` are removed, and remaining CLI parsing coverage is command-level only.
- Regression-only or stale-install cases for `register`, legacy `manager.md`, and missing `absolutePath` are removed from the root non-template suite.
- Retained `init -t` coverage asserts CLI-surface behavior only and does not duplicate workflow-template scaffold-content coverage reserved for run 3.
- Remaining repeated temp-root, metadata-fixture, and CLI-run boilerplate in the retained suite is consolidated into small shared support where it materially reduces duplication.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

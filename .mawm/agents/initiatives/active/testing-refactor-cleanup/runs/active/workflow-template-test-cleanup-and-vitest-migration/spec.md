# Run Spec: Run 3: Workflow-template test cleanup and Vitest migration

## Assigned Workflow

`coding`

## Task

Clean up workflow-template coverage, migrate workflow-template asset tests to Vitest, and keep only current supported template behavior while leaving excluded example workflow tests unchanged.

## Current State

- Repo-root testing already runs through Vitest, but `vitest.config.ts` intentionally collects only `test/**/*.test.ts`; embedded template-owned tests under `src/assets/workflow-templates/**/test` are therefore outside the repo-root runner today.
- Every embedded workflow-template test still imports from `bun:test`, and the only template package manifest at `src/assets/workflow-templates/shared/package.json` still defines `"test": "bun test"`. Because `base` and `initiative` inherit that shared package, both generated template workspaces still depend on Bun's test runner.
- Workflow-template-facing root coverage is currently split across `test/assets/base-template.test.ts`, `test/assets/initiative-template.test.ts`, `test/assets/workflow-template-distribution.test.ts`, `test/assets/workflow-template-skeleton.test.ts`, and `test/assets/workflow-template-maintainability.test.ts`.
- `test/assets/workflow-template-maintainability.test.ts` enforces file-length and JSDoc policies, and `test/assets/workflow-template-skeleton.test.ts` asserts exact overlay ownership lists, banned shared-layer strings, and shared script details. Those are authoring or implementation-structure checks rather than current supported behavior.
- `test/assets/base-template.test.ts` and `test/assets/initiative-template.test.ts` still duplicate temp-workspace copy and cleanup setup and still run generated workspace tests with `spawnSync(["bun", "test"], ...)`, which preserves Bun-runner assumptions inside otherwise current smoke flows.
- `test/assets/workflow-template-distribution.test.ts` covers real distribution and runtime behavior, but it also still derives an exact dist file list from `overlay.json` and seeds fixture verification text with `bun test`, which is broader and more runner-specific than the supported contract requires.
- `workflows/examples/coding/test/**` still intentionally uses `bun:test` and includes prompt expectations that reference Bun-based testing; that excluded suite must remain unchanged.

## Goal (Run Outcome)

Repo-root workflow-template coverage keeps only supported metadata, distribution, runtime, and generated-workspace behavior; embedded template tests run under Vitest via `bun run test`; and no retained workflow-template suite preserves Bun-only runner assumptions or authoring-policy checks.

## Scope

- Audit and tighten workflow-template-facing root asset tests in `test/assets/base-template.test.ts`, `test/assets/initiative-template.test.ts`, `test/assets/workflow-template-distribution.test.ts`, `test/assets/workflow-template-skeleton.test.ts`, and `test/assets/workflow-template-maintainability.test.ts`.
- Remove workflow-template root tests that only assert authoring rules, internal overlay ownership, shared-layer neutrality text bans, exact file-layout mirroring, or other implementation-detail expectations that are not current supported contracts.
- Migrate `src/assets/workflow-templates/shared/test/graph.test.ts`, `src/assets/workflow-templates/base/test/workflow.test.ts`, and `src/assets/workflow-templates/initiative/test/*.test.ts` from `bun:test` to explicit `vitest` imports.
- Update the shared template package setup in `src/assets/workflow-templates/shared/package.json` so generated template workspaces run tests through Vitest via `bun run test`, without widening repo-root test collection.
- Update retained root template smoke tests to validate generated workspace `bun install`, `bun run typecheck`, `bun run build`, and `bun run test` flows and consolidate duplicated template-workspace setup where it materially serves the retained suite.

## Out of Scope

- Do not modify `workflows/examples/coding/test/**` or example coding prompts that intentionally reference `bun:test`.
- Do not expand repo-root `vitest.config.ts` to collect `src/assets/workflow-templates/**/test` directly.
- Do not preserve or replace maintainability, file-size, JSDoc, banned-string, or exact overlay-ownership checks just because they existed before.
- Do not widen workflow-template product behavior beyond metadata, runtime, distribution, and generated-workspace contracts required today.

## Contracts

- The shared template `package.json` is the single test-runner contract for generated base and initiative workspaces. After this run, it must expose `vitest run` through `bun run test` and stop depending on `bun:test` or Bun's test runner.
- Repo-root `bun run test` must remain scoped to root `test/**` coverage only. Embedded template tests are validated by the template package's own `bun run test` execution inside generated workspaces, not by broadening root collection.
- Retained workflow-template coverage must map to supported observable behavior only: template metadata shape, required distributed assets to install and launch the workflows, observable graph, gate, and run-spec behavior, and generated workspace install, typecheck, build, and test success paths.
- Exact `overlay.json` path ownership lists, shared-layer wording bans, per-file line limits, JSDoc authoring enforcement, and similar implementation-detail assertions are not supported contracts and should be removed rather than rewritten.
- When retained tests need fixture verification summaries or example initiative specs, use current `bun run test` wording or runner-neutral placeholder commands; do not keep Bun-runner-specific strings unless the string itself is the behavior under test.
- Root workflow-template tests and embedded template-owned tests must describe the same supported behavior boundaries after cleanup; do not keep duplicate coverage that only repeats internal structure checks.

## Implementation Plan

1. Remove `test/assets/workflow-template-maintainability.test.ts` and `test/assets/workflow-template-skeleton.test.ts` entirely. Any contract-level assertion worth keeping must live in a retained metadata, distribution, or runtime suite instead of a dedicated authoring-policy suite.
2. Update `src/assets/workflow-templates/shared/package.json` to add `vitest` as the template test dependency and change the shared `test` script to `vitest run`, relying on default Vitest discovery for the existing `*.test.ts` files inside template workspaces rather than widening repo-root configuration.
3. Migrate every embedded workflow-template test file under `src/assets/workflow-templates/**/test` from `bun:test` to explicit `vitest` imports, and update fixture strings in initiative-template tests so retained expectations no longer encode Bun-only test-runner assumptions.
4. Tighten `test/assets/base-template.test.ts`, `test/assets/initiative-template.test.ts`, and `test/assets/workflow-template-distribution.test.ts`: keep metadata, graph invocation, run-spec generation, gate behavior, installability, distribution, and runnable workspace assertions; replace generated-workspace `bun test` execution with `bun run test`; and remove exact overlay or file-list checks that only mirror authoring structure.
5. Add a narrow helper under `test/support/` for assembling and cleaning up temp template workspaces from `shared` plus one variant, then reuse the existing subprocess helpers so the retained template smoke tests stop duplicating setup logic.
6. Verify the repo-root sequence with `bun run typecheck`, `bun run lint:all`, `bun run build`, and `bun run test`, then confirm the retained workflow-template coverage no longer includes `bun:test` imports under `src/assets/workflow-templates/**/test`, no retained root template smoke test runs `["bun", "test"]`, and `workflows/examples/coding/test/**` remains unchanged.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`
- `bun run build`
- `bun run test`

## Smoke Verification

- Mode: `headless`
- Method: From the repo root, run the verification sequence through `bun run build` and `bun run test`, then confirm the retained workflow-template root asset tests exercise generated workspaces with `bun run test`, the shared template package now exposes `vitest run`, no embedded template test imports `bun:test`, and the excluded `workflows/examples/coding/test/**` suite still remains Bun-based and untouched.
- Manual instructions, if needed: None.

## Completion Gate

- TDD implementation is complete within scope.
- Code review is clear or all findings have been resolved.
- `test/assets/workflow-template-maintainability.test.ts` and `test/assets/workflow-template-skeleton.test.ts` are removed.
- `src/assets/workflow-templates/shared/package.json` runs tests with Vitest, and no file under `src/assets/workflow-templates/**/test` imports from `bun:test`.
- Retained root template smoke tests use `bun run test` for generated workspaces and no longer assert exact overlay path lists, file-size or JSDoc policies, banned shared strings, or other implementation-detail rules.
- Root `vitest.config.ts` remains scoped to `test/**`, and `workflows/examples/coding/test/**` plus its Bun-based prompt expectations are unchanged.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

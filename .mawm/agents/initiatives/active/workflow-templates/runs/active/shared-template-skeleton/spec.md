# Run Spec: Run 1: Shared template asset skeleton

## Assigned Workflow

`coding`

## Task

Establish the canonical `src/assets/workflow-templates/{base,initiative,shared}` source tree and the shared workflow bundle skeleton both template variants will reuse.

## Current State

- `workflows/examples/coding/` is still the only full workflow package example in the repo and remains the reference shape for the bundle surface this initiative is extracting.
- A source-side template tree already exists at `src/assets/workflow-templates/{shared,base,initiative}` with shared scaffold files plus thin variant directories.
- `src/assets/workflow-templates/shared/` already contains the common bundle paths this run is responsible for: `package.json`, `langgraph.json`, `langgraph.dist.json`, `scripts/build.js`, `src/graph/index.ts`, and `test/`.
- `src/assets/workflow-templates/base/overlay.json` and `src/assets/workflow-templates/initiative/overlay.json` already mark variant ownership for `mawm.json`, and `test/assets/workflow-template-skeleton.test.ts` already checks the canonical source layout and shared-layer neutrality.
- Root build plumbing still just copies `src/assets/` to `dist/assets/` through `scripts/copy-assets.mjs`; there is no template materialization or variant-overlay shipping logic yet.
- Root `tsconfig.json` includes `src/assets/**/*` but excludes `src/assets/**/*.ts`, so repo-level typecheck does not validate embedded template TypeScript directly. This run therefore relies on source-layout assertions and the shared template's own minimal test/build surface rather than on root typecheck coverage alone.

## Goal (Run Outcome)

Leave the repo with a canonical source-of-truth workflow-template skeleton under `src/assets/workflow-templates/{shared,base,initiative}` where `shared/` owns the reusable package/build/test scaffold, `base/` and `initiative/` remain thin overlay roots for later runs, and source-side tests prove the shared layer stays neutral and variant boundaries stay explicit.

## Scope

- Refine or trim the existing `src/assets/workflow-templates/{shared,base,initiative}` tree so it matches the initiative contracts exactly.
- Keep `shared/` responsible only for the reusable bundle/build/test scaffold both template variants will inherit.
- Keep `base/` and `initiative/` as thin variant overlay roots with explicit ownership metadata for files that cannot live in `shared/`.
- Maintain or tighten source-side automated checks for required shared files, missing shared `mawm.json`, explicit variant ownership, and shared-layer neutrality.
- Keep this run strictly source-side. Later runs will add template-specific behavior and CLI-shipped distribution copies.

## Out of Scope

- No full initiative-run template behavior.
- No full standalone/base template behavior.
- No changes to `execute-graph-lib.ts` summary handling.
- No changes to `mawm init`, workflow install entry points, or other user-facing scaffold behavior.
- No changes to root distribution/build plumbing for `dist/assets/workflow-templates/{base,initiative}`.
- No README refresh or broader docs cleanup.

## Contracts

- `src/assets/workflow-templates/shared` is an authoring-time shared layer only. It must not become a third installable workflow product.
- The shared bundle surface for this run is fixed to `package.json`, `langgraph.json`, `langgraph.dist.json`, `scripts/build.js`, `src/graph/index.ts`, and `test/`.
- The shared layer stays neutral. It must not encode OpenCode integrations, coding-specific prompts, initiative-doc semantics, branch semantics, or standalone-result semantics beyond generic scaffold-safe placeholders.
- `mawm.json` is variant-owned and must not live under `src/assets/workflow-templates/shared`.
- The source composition rule established in this run is: materialize files from `src/assets/workflow-templates/shared`, then overlay variant-specific files from either `src/assets/workflow-templates/base` or `src/assets/workflow-templates/initiative` on matching relative paths.
- `overlay.json` is the explicit source-side ownership contract for this initiative's thin variant roots. `base/overlay.json` and `initiative/overlay.json` must each declare the variant id and list `mawm.json` in `variantOwnedPaths`.
- `workflows/examples/coding/` may inform the scaffold shape, but `src/assets/workflow-templates/*` is the canonical source of truth after this run.
- Verification for this run is source-side only. Do not claim or depend on final `dist/assets/workflow-templates/*` behavior yet.

## Implementation Plan

1. Audit the existing `src/assets/workflow-templates/{shared,base,initiative}` tree against the initiative contracts and remove or rewrite any stale source-side content that exceeds Run 1 scope.
2. Keep `src/assets/workflow-templates/shared/` limited to the reusable workflow package skeleton at the final relative paths for the common surface: `package.json`, `langgraph.json`, `langgraph.dist.json`, `scripts/build.js`, `src/graph/index.ts`, and `test/`.
3. Preserve `mawm.json` as variant-owned by keeping the explicit overlay metadata in `src/assets/workflow-templates/base/overlay.json` and `src/assets/workflow-templates/initiative/overlay.json`, updating those markers only if needed to keep ownership machine-readable and unambiguous.
4. Maintain or tighten `test/assets/workflow-template-skeleton.test.ts` so it proves the canonical source directories exist, the required shared skeleton paths exist, `src/assets/workflow-templates/shared/mawm.json` does not exist, both overlay markers exist and declare `mawm.json` as variant-owned, and the shared layer does not reference initiative-only inputs or OpenCode-specific strings.
5. Keep all work confined to source assets and source-side tests. Do not modify CLI shipping, install/init flows, workflow manifests for the final variants, or `execute-graph` helpers in this run.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`
- `bun test`

## Smoke Verification

- Mode: `headless`
- Method: `bun test test/assets/workflow-template-skeleton.test.ts`
- Manual instructions, if needed: None.

## Completion Evidence

- Workflow final status: `completed`
- Workflow code review: `No findings. The implementation stays in scope for the shared-template-skeleton run, preserves the shared/overlay ownership contract, and tightens the source-side assertion so the shared template's typecheck script is scoped to owned source files.`
- Fresh verification:
  - `bun run typecheck` -> `$ tsc --noEmit`
  - `bun run lint:all` -> `All matched files use Prettier code style!`
  - `bun test` -> `75 pass`, `0 fail`
  - `bun test test/assets/workflow-template-skeleton.test.ts` -> `6 pass`, `0 fail`

## Completion Gate

- The canonical source tree exists at `src/assets/workflow-templates/{shared,base,initiative}`.
- `shared/` is the only source-side owner of duplicated bundle/build/test scaffold for the template assets.
- `shared/` does not contain `mawm.json` and does not embed coding-specific or initiative-specific behavior.
- `base/overlay.json` and `initiative/overlay.json` explicitly declare `mawm.json` as variant-owned.
- Source-side tests prove the shared skeleton exists and stays neutral.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

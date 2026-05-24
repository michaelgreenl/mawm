# Run Spec: Run 2: Initiative template asset

## Assigned Workflow

`coding`

## Task

Build the generic initiative template asset as a thin variant on the shared skeleton.

## Current State

- `src/assets/workflow-templates/{shared,base,initiative}` exists from Run 1, and `src/assets/workflow-templates/initiative/` now already contains initiative-owned sources instead of only an overlay marker.
- The initiative variant currently owns `mawm.json`, `overlay.json`, `src/graph/{index,state,gates,planning,implementing}.ts`, and template-local tests under `src/assets/workflow-templates/initiative/test/`.
- `test/assets/initiative-template.test.ts` already composes `shared/` plus the initiative overlay into a temp workspace and exercises metadata, run-spec materialization, gate behavior, and hydrated-template execution.
- The shared layer still owns the neutral package/build/test scaffold under `src/assets/workflow-templates/shared/` and remains the canonical source for common bundle structure.
- The installed initiative-run contract is still defined by `.mawm/graphs/coding/mawm.json`: `kind: "initiative-run"`, required input `initiativeSpecPath` and `runSpecPath`, optional input `selectedRunLabel`, required context `targetRepoPath` and `initiativeBranch`, optional context `opencodeBaseUrl` and `parentSessionID`, and `supportsResume: true`.
- This run is still active. The remaining work is to reconcile the existing initiative asset with the initiative contracts exactly, keep it template-generic, and leave verification/review coverage in a commit-ready state.

## Goal (Run Outcome)

Leave the repo with a canonical initiative workflow template under `src/assets/workflow-templates/initiative` that is fully aligned with the Run 2 contracts: the asset stays a thin overlay on the shared skeleton, exposes valid generic `initiative-run` metadata, creates or rewrites the selected run spec from initiative context, preserves placeholder implementation and review-gate flow including `manual_smoke` resume behavior, and is proven by source-side tests and temp-workspace smoke coverage without depending on coding-specific prompts or OpenCode integrations.

## Scope

- Audit and tighten the existing initiative template files in place so the current asset matches the initiative spec and installed contract exactly.
- Keep initiative-owned behavior confined to the initiative overlay: workflow metadata, graph/state modules, run-spec materialization logic, implementation placeholder flow, and review-gate plumbing.
- Update `initiative/overlay.json` if needed so every initiative-owned path remains declared explicitly and accurately.
- Maintain or refine automated tests for metadata shape, graph loading, run-spec creation or rewrite, interrupt handling, `manual_smoke` resume behavior, and hydrated temp-workspace build/test execution.
- Keep the shared layer neutral and only override shared paths when initiative-run behavior actually requires variant-owned logic.

## Out of Scope

- No standalone/base template asset work.
- No `execute-graph-lib.ts` summary compatibility changes; those belong to Run 3.
- No CLI shipping or copy plumbing for `dist/assets/workflow-templates/{base,initiative}`; those belong to Run 4.
- No `mawm init` entry-point work, README changes, or broader CLI cleanup.
- No OpenCode-backed nodes, coding-specific prompts, language-specific verification snippets, or repo-specific implementation instructions inside the initiative template asset.

## Contracts

- `src/assets/workflow-templates/initiative/mawm.json` must keep the same `kind` and `executionContract` shape as `.mawm/graphs/coding/mawm.json`: required input `initiativeSpecPath` and `runSpecPath`, optional input `selectedRunLabel`, required context `targetRepoPath` and `initiativeBranch`, optional context `opencodeBaseUrl` and `parentSessionID`, and `supportsResume: true`.
- Template-specific metadata such as `id` and `displayName` must stay generic to the template and must not reuse `coding` branding.
- The hydrated initiative template must remain self-contained: everything required to install, build, test, load the graph, and generate or rewrite the run spec must come from the composed template asset plus standard package installation, not from `workflows/examples/coding/`.
- The planning phase is responsible for creating or rewriting the run spec at `runSpecPath` from the initiative spec, selected run label, and current repository context before implementation proceeds.
- The generated run spec must use the MAWM run-spec section shape: assigned workflow, task, current state, goal, scope, out of scope, contracts, implementation plan, verification commands, smoke verification, and completion gate.
- The implementation phase may stay placeholder-oriented, but it must preserve the initiative-run control-flow shape: implementation summary output, reviewer or gate decision handling, a `manual_smoke` interrupt path, and `finalStatus: "completed"` only after acceptance or successful manual-smoke confirmation.
- Success and interrupt results must continue to surface `runSpecPath` plus human-readable planning or implementation summaries so `initiative-manager` and `execute-graph` can report progress truthfully.
- `src/assets/workflow-templates/initiative/overlay.json` must list every initiative-owned path added or retained by this run; shared files remain the canonical neutral skeleton.

## Implementation Plan

1. Audit the existing initiative asset under `src/assets/workflow-templates/initiative/` against the Run 2 entry in `.mawm/agents/initiatives/active/workflow-templates/spec.md` and the installed contract in `.mawm/graphs/coding/mawm.json`, then remove or rewrite any stale behavior that no longer matches the initiative requirements.
2. Keep `mawm.json` and `overlay.json` as the initiative-owned contract surface, updating them only as needed so metadata stays template-generic and overlay ownership stays explicit and machine-readable.
3. Tighten the initiative graph modules in place so `src/graph/index.ts` plus `state.ts`, `planning.ts`, `implementing.ts`, and `gates.ts` provide only the minimum generic initiative-run behavior: run-spec materialization, placeholder implementation flow, review routing, interrupts, and resume handling.
4. Ensure the planning path reads the initiative spec, selects the requested run, writes or rewrites `runSpecPath`, includes current repository context in the generated run spec, and blocks with a structured planning interrupt when the selected run cannot produce an implementation-ready spec.
5. Ensure the implementation and gate path consumes the generated run spec, produces a truthful implementation summary, supports accept, revise, and `manual_smoke` decisions, and records verification output without embedding coding-specific instructions.
6. Maintain or refine initiative-template tests so they cover metadata contract shape, graph loading, planning output, planning-blocked interrupts, implementation revise loops, `manual_smoke` resume handling, and the hydrated temp-workspace build and test path.
7. Keep all work source-side for this run. Do not add final CLI distribution assets, standalone-template behavior, or generic summary-surface changes in this run.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`
- `bun test`

## Smoke Verification

- Mode: `headless`
- Method: Run the automated temp-workspace smoke coverage in `test/assets/initiative-template.test.ts`, which composes `src/assets/workflow-templates/shared` with `src/assets/workflow-templates/initiative`, installs the hydrated workspace, runs that workspace's `bun run typecheck`, `bun run build`, and `bun test`, and validates the hydrated `mawm.json` and `langgraph.json` contract.
- Manual instructions, if needed: None.

## Completion Evidence

- Workflow final status: `completed`
- Workflow code review: `No blocking issues found. src/assets/workflow-templates/initiative/overlay.json now explicitly declares the full initiative-owned surface, including overlay.json, the graph modules, and template-local tests, which satisfies the Run 2 ownership contract.`
- Fresh verification:
  - `bun run typecheck` -> `$ tsc --noEmit`
  - `bun run lint:all` -> `All matched files use Prettier code style!`
  - `bun test` -> `85 pass`, `0 fail`
  - `bun run test` -> `53 pass`, `0 fail`
  - `bun test test/assets/initiative-template.test.ts` -> `5 pass`, `0 fail`

## Completion Gate

- `src/assets/workflow-templates/initiative` is a complete initiative-owned overlay on the shared skeleton and contains only template-generic initiative-run behavior.
- The initiative template `mawm.json` matches the installed `coding` workflow's initiative-run contract shape without reusing coding-specific branding.
- `initiative/overlay.json` explicitly declares every initiative-owned path in the variant.
- Planning logic creates or rewrites the selected run spec from initiative inputs and repository context before implementation proceeds.
- The generated run spec uses the MAWM run-spec section shape required by this initiative.
- Implementation and gate logic support accept, revise, and `manual_smoke` flows and continue to surface `runSpecPath` plus human-readable summaries.
- Source-side tests cover metadata, graph behavior, interrupts, resume handling, and hydrated template execution.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

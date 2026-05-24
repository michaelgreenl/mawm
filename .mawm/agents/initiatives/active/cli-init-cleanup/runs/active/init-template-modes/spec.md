# Run Spec: Run 1: Template init modes

## Assigned Workflow

`coding`

## Task

Add `-t [type]` support to `mawm init` so it can scaffold the shipped workflow templates into the current directory without regressing the existing local, global, and agent-init flows.

## Current State

- `src/cmd/surface/init.ts` currently exposes `init [-g] [-i] [-a <agent>]` and only routes between project-local `.mawm` scaffolding, global MAWM config scaffolding, and agent asset installs.
- Default local init always copies `.mawm/graphs` from the bundled project-local assets and calls `initializeUserConfig`; bare `-i` additionally copies `.mawm/agents`.
- Agent asset installs already resolve bundled assets, preserve the `-ia <agent>` flow, and prompt before overwriting existing bundled agent files.
- The shared CLI option parser currently requires a value for every non-boolean option in `src/utils/parsers/option-value.ts`, so `-t` cannot mean "option present with omitted value defaults to base" without a small parser change.
- `src/assets/workflow-templates/{base,initiative}` are overlay fragments, not self-contained scaffold roots. `scripts/copy-assets.mjs` is the step that materializes runnable template directories under `dist/assets/workflow-templates/{base,initiative}`.
- Current `init` tests run against source imports from `src/cmd/surface/init.ts`; that pattern is fine for existing `.mawm` and agent assets but is not sufficient to prove template mode is consuming the materialized `dist` assets.

## Goal (Run Outcome)

`mawm init -t` and `mawm init -t base` scaffold the base workflow template into the current working directory, `mawm init -t initiative` scaffolds the initiative workflow template into the current working directory, unsupported template types fail clearly, and all existing non-template init flows keep their current behavior when `-t` is absent.

## Scope

- Add `-t [type]` parsing and routing to `mawm init`.
- Add the minimum shared parser support needed for a non-boolean option whose value may be omitted and defaulted.
- Resolve template assets from the CLI-shipped `dist/assets/workflow-templates/{base,initiative}` directories.
- Enforce the template-mode exclusivity matrix with `-g`, `-a`, and `-i`.
- Update usage text and automated tests for the new flag matrix, including omitted-type behavior.

## Out of Scope

- No README changes.
- No workflow-template asset authoring changes under `src/assets/workflow-templates`.
- No broad init output-message rewrite beyond the minimal wording needed for template-mode success or failure paths.
- No behavior changes to existing non-template init flows other than rejecting combinations that are newly invalid because `-t` was requested.

## Contracts

- `-t` accepts only `base` or `initiative`.
- Omitting the type after `-t` defaults that run to `base`; bare `mawm init` must continue to mean the current local MAWM scaffold flow.
- Template mode is local-only and mutually exclusive with `-g`, `-a <agent>`, and bare `-i`, regardless of option ordering or grouped short-option spelling.
- Template mode copies into `context.cwd`, not into `.mawm/`, and must not call the existing local/global init branches that scaffold `.mawm`, initialize `~/.config/mawm`, or install agent assets.
- Template mode must copy from `dist/assets/workflow-templates/{base,initiative}` and must not read from `workflows/examples/coding` or from the overlay-fragment source roots under `src/assets/workflow-templates/{base,initiative}`.
- The copy behavior for template mode remains non-destructive in this run: use the existing copy-missing behavior rather than introducing overwrite prompts or forced replacement.
- Existing flows remain intact when `-t` is absent: `init`, `init -i`, `init -a <agent>`, `init -ia <agent>`, `init -g`, and `init -g -a <agent>` keep their current targets and overwrite behavior.
- Usage/help text and test assertions must stay aligned with the implemented CLI surface.

## Implementation Plan

1. Add an explicit asset-materialization/build prerequisite for template-mode test coverage.
   - Use `bun run build` as the canonical pre-test build step for this run.
   - Treat that command as the source of truth for materializing `dist/assets/workflow-templates/{base,initiative}` because it runs `node scripts/copy-assets.mjs` after TypeScript compilation.
   - Keep the built-path template tests dependent on this step so they run against deterministic shipped assets instead of whichever source files happen to be present.
2. Extend the CLI option parser narrowly for `-t [type]`.
   - Add a small option-definition capability for "value may be omitted" on non-boolean options.
   - Preserve current behavior for required value-bearing options such as `-a <agent>`; only options that explicitly opt in may omit their value.
   - Treat `-t` with no following value, or with the next token starting a different option, as "template option present with no explicit type", allowing the default `base` value to apply.
   - Add parser-level tests in `test/cli/arguments.test.ts` that cover `-t`, `-t initiative`, and regression coverage for existing grouped short-option parsing.
3. Add template-mode routing to `src/cmd/surface/init.ts`.
   - Introduce a `template` option with alias `t`, omitted-value support, and a default of `base` when the option is present without an explicit type.
   - Update `INIT_USAGE` to include `[-t [type]]`.
   - Add template asset root resolution alongside the existing asset constants, but point the template-mode source at the materialized `dist/assets/workflow-templates` tree rather than the source overlay roots.
   - Validate the template value before any filesystem mutation and emit a clear error for unsupported values.
   - Validate template-mode exclusivity before any filesystem mutation and emit clear errors for `-t` combined with `-g`, `-a`, or `-i`.
   - In the template branch, copy the selected variant root into `context.cwd` with the existing copy-missing helper, then return without running the project-local `.mawm`, global-config, or agent-install logic.
4. Keep non-template behavior stable.
   - Leave the existing local/global/agent init branches structurally intact when `-t` is absent.
   - Preserve the current overwrite-prompt behavior for agent assets and the current `-g` plus existing-global-config protection.
   - Keep `-ia <agent>` working exactly as it does today when `-t` is not present.
5. Add `init` command coverage that proves the built-asset contract.
   - Keep the existing source-level `init` tests for non-template paths.
   - Add template-mode tests that exercise a built command path only after `bun run build` has materialized `dist/assets/workflow-templates/{base,initiative}` so the assertions prove `init` is consuming the shipped template directories rather than the source overlay fragments.
   - Cover `-t`, `-t base`, `-t initiative`, invalid template type, and mutually exclusive combinations.
   - Assert that template mode creates expected root-level template files for each variant and leaves `.mawm`, `~/.config/mawm`, and agent-asset directories untouched.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`
- `bun run build`
- `bun test test/cli/init.test.ts test/cli/arguments.test.ts`

## Smoke Verification

- Mode: `headless`
- Method: First run `bun run build` so `node scripts/copy-assets.mjs` materializes `dist/assets/workflow-templates/{base,initiative}` and the built CLI entry exists. Then run the targeted CLI tests for `-t`, `-t base`, `-t initiative`, invalid template type, and invalid `-t` combinations. Confirm template-mode assertions prove the scaffold came from the materialized template variant and that no `.mawm`, `~/.config/mawm`, or agent assets were created as side effects. Confirm the existing non-template init cases still pass.
- Manual instructions, if needed: `n/a`

## Completion Gate

- TDD implementation is complete within scope.
- `mawm init` accepts `-t`, defaults omitted template type to `base`, and rejects unsupported or incompatible combinations with clear errors.
- Template mode copies only from `dist/assets/workflow-templates/{base,initiative}` into the current directory and does not trigger `.mawm`, global-config, or agent-install side effects.
- Existing non-template init flows remain covered and passing.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

## Completion Evidence

- Code review was accepted with no findings.
- Verification completed:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run build`
  - `bun test test/cli/init.test.ts test/cli/arguments.test.ts` → `25 pass, 0 fail`
- Headless smoke verification passed via built-CLI tests covering `-t`, `-t base`, `-t initiative`, invalid template type, and invalid `-t` combinations while asserting no `.mawm`, `~/.config/mawm`, or agent assets were created as side effects.

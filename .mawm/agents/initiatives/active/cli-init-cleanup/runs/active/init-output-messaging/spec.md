# Run Spec: Run 2: Init output messaging

## Assigned Workflow

`coding`

## Task

Make `mawm init` output reflect what actually changed across local, global, template, project-initiative-workspace, and agent-asset flows without changing the flag semantics introduced in run 1.

## Current State

- `src/cmd/surface/init.ts` still ends every non-template success path with one generic message: `Initialized .mawm scaffold.` for local flows or `Initialized ${globalConfigRoot} scaffold.` for global flows.
- That final message is emitted after several different side-effect combinations, so it can over-claim: for example, `init -g -a opencode` can report the MAWM config path even when only global Opencode assets were written, and local re-runs can report `.mawm` even when only `.opencode` files changed.
- Template mode already has separate success output for `-t`, `-t base`, and `-t initiative`, but those message assertions currently live in the same `test/cli/init.test.ts` matrix as the other init flows.
- When agent overwrite is declined, `createInitCommand` currently returns `0` immediately and emits no stdout at all, which reads like silent success instead of an explicit no-op.
- The current filesystem helpers do not report whether `copyMissing` actually created files, so the command cannot currently tell whether `.mawm/graphs` or the project initiative workspace under `.mawm/agents` changed during a rerun.

## Goal

`mawm init` emits accurate, action-based success output for each init path, emits a deterministic zero-change rerun message when a successful invocation makes no filesystem changes, and emits an explicit no-op message when overwrite is declined, while preserving the existing init side effects and error behavior.

## Scope

- Replace the generic success output in `src/cmd/surface/init.ts` with category-based success/no-op messaging.
- Add the minimum change-tracking plumbing needed to know which init surfaces actually changed during a run.
- Keep template-mode output covered in the same message matrix so `-t`, `-t base`, and `-t initiative` remain asserted alongside the other init flows.
- Update automated tests in `test/cli/init.test.ts` to assert representative success and no-op output for local, global, template, project-initiative-workspace, and agent-asset combinations.

## Out of Scope

- No new flag parsing or routing changes beyond the `-t` behavior already implemented in run 1.
- No README or docs changes.
- No change to overwrite-prompt or error behavior except for adjacent explanatory copy that must stay aligned with the actual init behavior.
- No broader CLI-wide message refactor outside `mawm init`.

## Contracts

- Success output must describe only the surfaces that changed during that invocation.
- Success output must avoid unnecessary absolute paths; use action/category labels such as local MAWM graphs scaffold, project initiative workspace, global MAWM config, project agent assets, global agent assets, or template scaffold rather than raw filesystem paths.
- Errors and overwrite prompts may continue to include concrete paths when they are required for safety or diagnosis.
- A successful rerun that makes zero filesystem changes and does not involve an overwrite decline must emit exactly `No changes required.\n` on stdout.
- Declining an overwrite prompt remains a zero-exit no-op, but it must emit exactly `No changes made; existing agent assets were left in place.\n` on stdout instead of silent stdout.
- Messages must never claim `.mawm` changed when only agent assets changed, and must never claim `~/.config/mawm` changed when only global agent assets changed.
- Messages must never describe the project initiative workspace as agent assets, and must never describe agent-asset installs as initiative workspace changes.
- Existing init side effects stay the same: local non-template flows still initialize missing project `.mawm/graphs` and missing global MAWM config, `-i` still adds the project initiative workspace under `.mawm/agents`, `-a <agent>` still installs agent assets, `-g` still targets user config, and template mode stays local-only.
- Message generation must handle representative combinations explicitly:
  - `init`
  - `init -i`
  - `init -a opencode`
  - `init -ia opencode`
  - `init -g`
  - `init -g -a opencode`
  - `init -t`, `init -t base`, and `init -t initiative`
  - successful reruns of `init`, `init -i`, `init -a opencode`, and `init -g -a opencode` that produce zero changes without a declined overwrite
  - overwrite-declined agent flows

## Implementation Plan

1. Add explicit change tracking for copy-missing branches.
   - Update the narrowest shared helper needed so `copyMissing` reports whether it created any files while preserving its non-overwrite behavior.
   - Thread that signal through the init command paths that need accurate output, especially project-local `.mawm/graphs` and the project initiative workspace under `.mawm/agents`.
   - Keep `copyRecursive` behavior unchanged; confirmed overwrite flows can be treated as changed because the command intentionally rewrites the target tree.
2. Make MAWM-config initialization report whether it changed anything.
   - Return a boolean from `initializeUserConfig` so `init` can distinguish "config already existed" from "config scaffolded now".
   - Preserve `scaffoldUserConfig`'s existing overwrite refusal semantics; global `-g` without `-a` still succeeds only when the config root was absent.
3. Replace the single generic success write in `src/cmd/surface/init.ts` with category-based message assembly.
   - Collect change flags for each surface the command can mutate: project MAWM graphs, project initiative workspace, global MAWM config, project agent assets, global agent assets, and template scaffold.
   - After side effects complete, build stdout from the categories that actually changed.
   - When no categories changed and there was no overwrite decline, emit exactly `No changes required.\n` and return `0`.
   - When no categories changed because overwrite was declined, emit exactly `No changes made; existing agent assets were left in place.\n` and return `0`.
   - Keep the template branch accurate and concise; it may remain a single template-scaffold success line as long as it follows the same "report only what changed" rule.
4. Keep prompts and errors precise while reducing success-path path leakage.
   - Leave overwrite prompts and overwrite-refusal errors path-specific.
   - Ensure success and no-op copy does not print raw absolute paths except where the existing contract already requires them for errors.
5. Expand the init message assertions in `test/cli/init.test.ts`.
   - Update existing tests that currently only assert exit code or side effects so they also assert the new stdout for representative local/global/project-initiative-workspace/agent flows.
   - Preserve the built-CLI template tests and update their stdout assertions if wording changes.
   - Add coverage for rerun cases where all targeted surfaces already exist and no overwrite is declined, and assert exact stdout equality with `No changes required.\n`.
   - Add or update overwrite-declined assertions so stdout contains exactly `No changes made; existing agent assets were left in place.\n` and filesystem state remains unchanged.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`
- `bun run build`
- `bun test test/cli/init.test.ts`

## Smoke Verification

- Mode: `headless`
- Method: Run `bun run build` first so the built CLI and materialized template assets exist for the template-path assertions. Then run `bun test test/cli/init.test.ts` and confirm the message matrix covers local, local-plus-project-initiative-workspace, local-plus-agent, local-plus-project-initiative-workspace-plus-agent, global, global-plus-agent, template, exact `No changes required.\n` rerun output, and exact overwrite-declined no-op output.
- Manual instructions, if needed: `n/a`

## Completion Gate

- TDD implementation is complete within scope.
- `mawm init` success output is category-based and accurate for local, global, template, project-initiative-workspace, and agent-asset flows.
- Successful zero-change reruns emit exactly `No changes required.\n`.
- Declined overwrite exits still return `0` but now emit exactly `No changes made; existing agent assets were left in place.\n`.
- Success-path messaging avoids unnecessary absolute paths while prompt/error precision remains intact.
- Automated coverage proves representative init combinations report only the surfaces they changed and that the two zero-change stdout contracts are distinct and deterministic.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

## Completion Evidence

- Code review was accepted after resolving one `src/utils/fs.ts` finding so confirmed-overwrite reruns no longer rewrite identical files while reporting `No changes required.\n`.
- Verification completed:
  - `bun run typecheck`
  - `bun run lint:all`
  - `bun run build`
  - `bun test test/cli/init.test.ts` → `23 pass, 0 fail`
- Headless smoke verification passed via the `test/cli/init.test.ts` message matrix covering local, project-initiative-workspace, project agent, global agent, template, exact zero-change rerun output, and exact overwrite-declined no-op output.

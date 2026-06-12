# Run Spec: execute-graph global-resolution smoke-test probe

## Assigned Workflow

`coding`

## Task

Finish the `execute-graph` global-resolution run by tightening the existing headless smoke-test probe around the shipped tool and closing only the smallest remaining runtime-dir contract gap that probe exposes.

## Current State

- `.opencode/tools/execute-graph.ts:192-711` and `src/assets/.config/agents/opencode/tools/execute-graph.ts:192-711` already resolve workflows from `~/.config/mawm/<workflow>`, derive `<target-project>/.mawm/logs/<workflow>`, generate `langgraph.runtime.json`, spawn `langgraph dev` with `--config <runtime-dir>/langgraph.runtime.json --port <free-port> --no-browser --no-reload`, and return `logPath` from the runtime dir. `diff -u` between the repo-local and shipped tool copies is currently empty.
- `prepareRuntimeDir` writes the runtime-dir root `.gitignore` with `*` before server startup (`.opencode/tools/execute-graph.ts:227-293`), but `ensureLangGraphServer` can then start or reuse a server without any later normalization step for that file (`.opencode/tools/execute-graph.ts:459-545`).
- `test/assets/execute-graph-lib.test.ts:60-227` already covers home-dir precedence, project-root resolution, runtime-dir derivation, and supported `langgraph.json` path normalization for `env`, `graphs`, `auth.path`, `http.app`, and `ui`.
- `package.json:59-76` still does not depend on `@opencode-ai/plugin`, while `.opencode/package.json:1-4` provides it for the OpenCode runtime. The repo test seam therefore remains the existing minimal mock in `test/assets/execute-graph-tool.test.ts:143-163`.
- `test/assets/execute-graph-tool.test.ts:172-253` already stages a temp global install and temp target project, imports the shipped tool through that mock, runs the real `execute` path end-to-end, asserts runtime artifact placement, and shuts down the spawned LangGraph pid during cleanup.
- The current probe still allows the runtime-dir root `.gitignore` to contain extra content after the run: `test/assets/execute-graph-tool.test.ts:223-225` checks that it starts with `*` and contains `.langgraph_api` instead of enforcing the initiative contract that the file content is exactly `*`.
- `test/assets/workflow-template-distribution.test.ts:326-357` and the CLI suites still encode the older `.mawm/graphs` install model, but those changes belong to later initiative runs and must not be pulled into this follow-up.

## Goal (Run Outcome)

- The targeted probe remains the smoke-verification path for Run 1, but it now fails unless `<project>/.mawm/logs/<workflow>/.gitignore` ends as exactly `*` after a successful run.
- If fresh startup or server reuse mutates that file or any other runtime-dir invariant, the smallest paired tool fix is applied so the final on-disk state matches the initiative contract on both paths.
- The probe continues to prove global workflow resolution, project-local runtime-state placement, global `node_modules`, absence of `<project>/.mawm/graphs/<workflow>`, and the existing JSON result contract.
- Repo-local and shipped `execute-graph` copies remain text-identical at the end.

## Scope

- `test/assets/execute-graph-tool.test.ts`
- `.opencode/tools/execute-graph.ts`
- `src/assets/.config/agents/opencode/tools/execute-graph.ts`
- `test/assets/execute-graph-lib.test.ts`, `.opencode/tools/execute-graph-lib.ts`, and `src/assets/.config/agents/opencode/tools/execute-graph-lib.ts` only if a tiny shared helper or pure-function assertion is clearly the smallest way to close the probe gap

## Out of Scope

- CLI workflow command or test rewrites in `install`, `update`, `remove`, `list`, or `init`
- Reworking `test/assets/workflow-template-distribution.test.ts` into the global-only model
- Prompt, template, or README updates
- Deleting this repo's committed `.mawm/graphs/` tree
- Depending on, mutating, or validating the developer's real `~/.config/mawm` contents outside temp test sandboxes
- Backward-compatibility or migration behavior for stale project-local installs
- Larger `execute-graph` refactors that are not required by the tightened probe

## Contracts

- The probe must keep driving the real `execute` path from `src/assets/.config/agents/opencode/tools/execute-graph.ts`; do not regress to helper-only coverage.
- Keep the existing minimal `@opencode-ai/plugin` mock seam unless it becomes impossible to close the gap without a smaller alternative.
- Stage the workflow fixture under a temp home at `<temp-home>/.config/mawm/<workflow>` using existing workflow-template contents, and use a separate temp target project root. Do not rely on or inspect the developer's actual global install.
- Let the tool create `<project>/.mawm/logs/<workflow>` itself. Do not precreate `.mawm/graphs/<workflow>` or any runtime files.
- The runtime-dir root `.gitignore` contract for this run is exact: after the tool returns successfully, `<project>/.mawm/logs/<workflow>/.gitignore` must equal `*` with no extra lines beyond an optional trailing newline.
- The final `.gitignore` normalization must hold for both fresh server startup and server reuse; a previously mutated file is not acceptable just because the server was already alive.
- Shared dependencies must remain under the global workflow root. The project runtime dir must never gain `node_modules`.
- Assertions must keep covering the returned JSON contract (`assistantID`, `logPath`, `status`, `summary`, `threadID`, `workflowRoot`, and `output`/`runSpecPath` when present) plus on-disk side effects under the runtime dir.
- Inspect `langgraph.runtime.json` only as JSON. Never read env-file contents or print env values.
- The probe must stop any spawned LangGraph dev server before teardown by reading the runtime-dir state file and terminating the recorded pid. Temp-directory cleanup alone is not sufficient.
- If the tightened probe exposes a real bug, fix it in the smallest possible place and keep `.opencode/tools/execute-graph*.ts` and `src/assets/.config/agents/opencode/tools/execute-graph*.ts` text-identical at the end.
- If the probe surfaces stale `.mawm/graphs` references elsewhere in the repo, do not expand this run into CLI or doc cleanup. Leave those to the later initiative runs already defined in the parent spec.

## Implementation Plan

1. Re-read the current `execute-graph` probe and tool flow with focus on when the runtime-dir root `.gitignore` is written, when LangGraph can mutate it, and how the fresh-start versus server-reuse paths differ.
2. Tighten `test/assets/execute-graph-tool.test.ts` so the smoke probe asserts the final runtime-dir root `.gitignore` content is exactly `*` while preserving the existing end-to-end checks for global resolution, project-local runtime artifacts, global `node_modules`, and no `.mawm/graphs/<workflow>` creation.
3. Run the targeted probe. If it fails because the runtime-dir `.gitignore` drifts after startup or reuse, patch both `execute-graph.ts` copies in the smallest spot so the file is normalized back to `*` before the tool returns.
4. Only if the smallest fix clearly belongs in shared helper logic, mirror the change in both `execute-graph-lib.ts` copies and extend `test/assets/execute-graph-lib.test.ts`; otherwise leave helper coverage unchanged.
5. Re-run the targeted probe and helper suite, then the repo verification commands, and finish with empty diffs between the repo-local and shipped tool-file pairs.

## Verification Commands

- `bun run test -- test/assets/execute-graph-tool.test.ts`
- `bun run test -- test/assets/execute-graph-lib.test.ts`
- `bun run build`
- `bun run typecheck`
- `bun run lint:all`
- `bun run test`
- `diff -u ".opencode/tools/execute-graph.ts" "src/assets/.config/agents/opencode/tools/execute-graph.ts"`
- `diff -u ".opencode/tools/execute-graph-lib.ts" "src/assets/.config/agents/opencode/tools/execute-graph-lib.ts"`

## Smoke Verification

- Mode: `headless`
- Method: the targeted Vitest probe stages a temp global workflow install and temp target project, runs the shipped `execute-graph` tool end-to-end, and fails unless runtime artifacts stay under `.mawm/logs/<workflow>` and the runtime-dir root `.gitignore` ends as exact `*`.
- Manual instructions, if needed: none

## Completion Gate

- In-scope implementation is complete and the probe enforces the exact runtime-dir contract rather than permissive `.gitignore` behavior.
- Any probe-driven code changes keep the repo-local and shipped tool copies text-identical.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes.
- Run is ready to become one commit on the initiative branch.

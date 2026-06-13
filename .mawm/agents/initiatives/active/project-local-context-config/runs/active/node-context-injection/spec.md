# Run Spec: Run 1: Execution-time prompt assembly and context-bundle injection

## Assigned Workflow

`coding`

## Task

Move the final OpenCode `system` prompt assembly into the node's per-invocation path and add the runtime-context seam that lets later runs append per-agent prompt context at execution time, without changing submitted prompt bytes when no bundle applies.

## Current State

- Target repo path: `/Users/michaelgreen/Documents/Projects/ai/maw-management/workflows/coding`
- Initiative branch: `initiative/project-local-context-config`
- Requested run spec path: `/Users/michaelgreen/Documents/Projects/ai/maw-management/mawm/.mawm/agents/initiatives/active/project-local-context-config/runs/active/node-context-injection/spec.md`
- `createOpenCodeNode` currently resolves `model`, `variant`, `system`, and `tools` once in the constructor closure, then forwards the captured `system` value directly to `session.promptAsync`, so prompt text cannot vary per invocation today (`src/integrations/opencode/node.ts:395-399`, `src/integrations/opencode/node.ts:456-463`).
- `getRuntimeContextValue` only reads trimmed string values from `runtime.context` first and `runtime.configurable` second, so it cannot carry an object-valued prompt bundle without a separate access path (`src/shared/runtime-context.ts:13-37`).
- `OpenCodeRuntimeContext` currently documents only `targetRepoPath`, `initiativeBranch`, `opencodeBaseUrl`, and `parentSessionID`; there is no typed field for injected prompt context yet (`src/integrations/opencode/types.ts:35-40`).
- Workflow agents already pass static prompt text through `definition.prompt` into `createOpenCodeNode`, so this run only needs to augment existing system prompts rather than invent a new prompt source (`src/agents/definitions.ts:37-49`, `src/agents/prompts.ts:31-35`).
- `test/opencode-sdk.test.ts` already mocks `session.promptAsync` and asserts the submitted payload, making it the correct verification seam for prompt injection behavior (`test/opencode-sdk.test.ts:206-248`, `test/opencode-sdk.test.ts:322-462`).

## Goal

`createOpenCodeNode` assembles the `system` value at prompt time from the existing static prompt plus an optional runtime `agentContextBundle` for the current kebab agent name. The bundle contract is a map of agent name to ordered arrays of already-prepared prompt blocks. When the bundle is absent, the current agent key is absent, or the current agent array is empty, the `system` string sent to `session.promptAsync` is byte-identical to current behavior. `model`, `variant`, `tools`, message serialization, session reuse, polling, and provider connectivity remain unchanged.

## Scope

- `src/integrations/opencode/types.ts`
- `src/integrations/opencode/node.ts`
- `test/opencode-sdk.test.ts`

## Out of Scope

- Reading or validating `.mawm/mawm.json`
- Building the context bundle from workflow topology, phases, or file contents
- Graph entry wiring or graph-level runtime-context population; that lands in Run 3
- Changes to `WorkflowContextAnnotation`, planning bootstraps, or implementing bootstraps
- Model or variant overrides
- Prompt asset rewrites under `src/agents/assets/`
- Session-memory, transport, polling, reconnection, or message-serialization changes outside final `system` assembly

## Contracts

- Add a runtime-context field named `agentContextBundle` to `OpenCodeRuntimeContext` with shape `Readonly<Record<string, readonly string[]>>`; keys are exact kebab agent names such as `planner`, `plan-reviewer`, `coder`, and `code-reviewer`.
- The node must read `agentContextBundle` with the same precedence as existing runtime context values: `runtime.context` wins over `runtime.configurable` when both provide the field.
- Do not route `agentContextBundle` through `getRuntimeContextValue`; that helper is intentionally string-only. Read the object directly, or through a small node-local helper that preserves the same precedence.
- Bundle lookup is keyed only by the node's existing `name` argument. Bundles for other agents are ignored.
- Final prompt assembly happens inside `invoke`: start from the existing base system prompt source, then append each string from `agentContextBundle[name]` in array order with the literal separator `\n\n---\n\n` between blocks.
- The node treats bundle entries as already-prepared prompt blocks. It must not deduplicate, reorder, reinterpret, or otherwise normalize them.
- `model` and `variant` stay resolved exactly as they are today; this run only changes how the final `system` string is prepared before `promptAsync`.
- If `agentContextBundle` is absent, the current agent key is absent, or the current agent array is empty, `session.promptAsync` must receive the same `system` value it receives on `main` today.
- No other `session.promptAsync` payload fields change: `parts`, `tools`, `agent`, session IDs, message cursors, and polling behavior remain as-is.

## Implementation Plan

1. Extend `OpenCodeRuntimeContext` in `src/integrations/opencode/types.ts` with the `agentContextBundle` field so later runs can populate the seam without widening the node API again.
2. Update `src/integrations/opencode/node.ts` so the final `system` value is assembled inside `invoke`, while connection loading, `model`, `variant`, and `tools` stay on their current code path.
3. Add the smallest possible bundle-reader in `node.ts` that checks `runtime.context.agentContextBundle` first, falls back to `runtime.configurable.agentContextBundle`, and returns the entry for the current agent name without changing any other runtime-context behavior.
4. Append matching-agent bundle entries to the base system prompt with the shared `\n\n---\n\n` separator, leaving the no-bundle path byte-identical to today's payload.
5. Extend `test/opencode-sdk.test.ts` with focused cases that prove: a matching-agent bundle from `runtime.context` appends in order, a bundle for another agent does not leak into the current prompt, `runtime.context` wins over `runtime.configurable` when both supply a bundle, and the absent-bundle path preserves the submitted `system` string exactly.
6. Finish by running the targeted node test and the repo-wide verification commands required by the initiative.

## Verification Commands

- `bun test test/opencode-sdk.test.ts`
- `bun run typecheck`
- `bun run lint:all`
- `bun run test`
- `bun run build`

## Smoke Verification

- Mode: `headless`
- Method: `test/opencode-sdk.test.ts` proves that `agentContextBundle.planner` is appended to the submitted planner system prompt in order, that a non-matching bundle is ignored, that `runtime.context` takes precedence over `runtime.configurable`, and that omitting the bundle keeps the submitted system prompt unchanged.
- Manual instructions, if needed: None.

## Completion Gate

- Implementation stays within `src/integrations/opencode/types.ts`, `src/integrations/opencode/node.ts`, and `test/opencode-sdk.test.ts`.
- The runtime-context seam is named `agentContextBundle` and is documented by passing tests.
- Matching-agent bundle entries append in order, non-matching bundles are ignored, `runtime.context` wins over `runtime.configurable`, and missing bundles leave the `system` prompt unchanged.
- Graph-level runtime-context population remains untouched for Run 3.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Headless smoke verification passes.
- Run is ready to become one commit on `initiative/project-local-context-config`.

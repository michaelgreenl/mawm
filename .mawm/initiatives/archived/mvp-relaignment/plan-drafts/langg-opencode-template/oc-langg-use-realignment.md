# Refactor Plan: createNode → Workflow Step Engine

## Goal

Replace the LangChain model-invocation pattern (`ChatOpenAI.invoke()` inside graph nodes) with an opencode SDK-backed step execution engine. LangGraph orchestrates **who runs when and what state flows between them**. Opencode handles **each agent's execution** (model, tools, prompt, permissions). Nodes become declarative step definitions with composable hooks for context injection, mandatory actions, and state extraction.

---

## What Gets Deleted

- `createModel()` and the `Model` interface (`createNode.ts:33-39`)
- `ChatOpenAI` import (`graph.ts:3`)
- `DEFAULT_MODEL` constant (`graph.ts:17`) — model comes from agent config, not graph config
- `withSystem()` helper (`createNode.ts:3-11`) — system prompt injection moves to `injectContext`
- `prompt()` helper (`createNode.ts:23-31`) — prompt resolution moves to agent config + context injection
- `handoffText()` helper (`createNode.ts:13-21`) — extraction moves to `extractState`
- The `Runtime` / `RuntimeAgent` types from `graph.ts` — replaced by step config
- The commented-out node variants at the bottom of `createNode.ts` (lines 58-103) — dead code
- `contentPart()` and `contentText()` helpers in `graph.ts` (lines 78-104) — move to extraction module

## What Gets Replaced

| Current | Replacement |
|---|---|
| `createNode(runtime, model)` | `createNode(step)` where `step: StepDefinition` |
| `model.invoke(withSystem(...), config)` | `runAgent(step.agent, context, config)` via opencode SDK |
| Hardcoded system prompt assembly | `injectContext(step.inject, state)` pipeline |
| Inline `handoffText()` extraction | `extractState(step.extract, result, state)` |
| `loadRuntime(cfg)` reading `opencode.json` | Step config loaded per-node from agent definitions |

---

## New Types

### `src/graph/step.ts`

```ts
import type { typeof StateAnnotation } from './state.js';

// --- Context Injection ---
type ContextSource =
  | { prompt: string }                                              // raw text injection
  | { skill: string }                                               // opencode skill by name
  | { openviking: { query: string; targetUri?: string } }           // OpenViking retrieval
  | { state: keyof typeof StateAnnotation.State }                  // prior graph state

// --- Required Actions ---
type RequiredAction =
  | { tool: string; input?: unknown }                               // mandatory tool call
  | { verify: string }                                              // run verification command
  | { extract: keyof typeof StateAnnotation.State }                 // must produce this state field

// --- State Extraction ---
type StateExtractor =
  | 'handoff'                                                        // extract handoff text
  | 'messages'                                                       // append response messages
  | { field: string; parse: (response: string) => unknown }          // custom extraction

// --- Agent Config ---
interface AgentConfig {
  name: string;
  model: string;           // e.g. 'openai/gpt-5.4'
  prompt: string;          // system prompt (file path or inline text)
  mode: 'primary' | 'subagent';
  hidden?: boolean;
  permissions: Record<string, string>;
}

// --- Step Definition ---
interface StepDefinition {
  agent: AgentConfig;
  inject?: ContextSource[];
  required?: RequiredAction[];
  extract?: StateExtractor[];
}

export type { ContextSource, RequiredAction, StateExtractor, AgentConfig, StepDefinition };
```

---

## New/Modified Files

### `src/graph/nodes/createNode.ts` — Rewrite

Current: factory that takes `(runtime, model)` and returns a LangGraph node function that calls `ChatOpenAI`.

New: factory that takes a `StepDefinition` and returns a LangGraph node function that:
1. Injects context via `injectContext(step.inject, state)`
2. Executes the agent via `runAgent(step.agent, context, config)`
3. Enforces mandatory actions via `enforceRequired(step.required, result)`
4. Extracts state updates via `extractState(step.extract, result, state)`

```ts
export const createNode = (step: StepDefinition) => {
    return async (
        state: typeof StateAnnotation.State,
        config: RunnableConfig,
    ): Promise<typeof StateAnnotation.Update> => {
        const context = await injectContext(step.inject ?? [], state);
        const result = await runAgent(step.agent, context, config);
        await enforceRequired(step.required ?? [], result);
        return extractState(step.extract ?? ['messages'], result, state);
    };
};
```

The node function signature (`(state, config) => Promise<Update>`) is unchanged, so `graph.ts` registration (`.addNode(...)`) works as-is.

### `src/graph/inject.ts` — New

Handles context injection before agent execution.

```ts
export const injectContext = async (
    sources: readonly ContextSource[],
    state: typeof StateAnnotation.State,
): Promise<InjectResult> => {
    const parts: InjectPart[] = [];

    for (const source of sources) {
        if ('prompt' in source) {
            parts.push({ role: 'system', content: source.prompt });
        } else if ('skill' in source) {
            parts.push({ role: 'system', content: await loadSkill(source.skill) });
        } else if ('openviking' in source) {
            parts.push({ role: 'system', content: await queryOpenViking(source.openviking) });
        } else if ('state' in source) {
            const value = state[source.state];
            if (typeof value === 'string' && value.length > 0) {
                parts.push({ role: 'system', content: value });
            }
        }
    }

    return { parts };
};
```

OpenViking queries go through the existing `OpenVikingClient.find()` API. Skill loading reads from `.opencode/skills/`. State injection pulls from prior graph state (handoffs, prompts).

### `src/graph/execute.ts` — New

Wraps the opencode SDK `session.prompt()` call.

```ts
import { createOpencodeClient } from '@opencode-ai/sdk';

const getClient = () => createOpencodeClient({ baseUrl: 'http://localhost:4096' });

export const runAgent = async (
    agent: AgentConfig,
    context: InjectResult,
    config: RunnableConfig,
): Promise<AgentResult> => {
    const client = getClient();
    const session = await client.session.create({ body: { title: agent.name } });

    // Inject system prompt + context as the first message(s)
    const parts: Part[] = [
        { type: 'text', text: agent.prompt },
        ...context.parts.map((p) => ({ type: 'text' as const, text: p.content })),
    ];

    const result = await client.session.prompt({
        path: { id: session.data.id },
        body: {
            model: parseModel(agent.model),
            parts,
        },
    });

    return { sessionId: session.data.id, response: result.data };
};
```

The `parseModel()` helper splits `'openai/gpt-5.4'` into `{ providerID: 'openai', modelID: 'gpt-5.4' }`.

Extraction of the response text or structured output happens in `extractState`, not here. This function is responsible only for: create session → inject context → prompt → return raw result.

### `src/graph/extract.ts` — New

Maps opencode response back into LangGraph state.

```ts
export const extractState = (
    extractors: readonly StateExtractor[],
    result: AgentResult,
    state: typeof StateAnnotation.State,
): typeof StateAnnotation.Update => {
    const update: Record<string, unknown> = {};

    for (const extractor of extractors) {
        if (extractor === 'messages') {
            update.messages = [toBaseMessage(result.response)];
        } else if (extractor === 'handoff') {
            update.handoff = extractHandoff(result.response);
        } else if ('field' in extractor) {
            update[extractor.field] = extractor.parse(responseText(result.response));
        }
    }

    return update as typeof StateAnnotation.Update;
};
```

The `extractHandoff` and `responseText` helpers move here from the current `contentText`/`handoffText` in `graph.ts` and `createNode.ts`.

### `src/graph/nodes/planner/node.ts` — Rewrite

Current: imports `createNode` from the old API, defines `ocConf` with inline object.

New: exports a `StepDefinition`.

```ts
import { createNode } from '../createNode.ts';
import type { StepDefinition } from '../../step.ts';

const step: StepDefinition = {
    agent: {
        name: 'planner',
        model: 'openai/gpt-5.4',
        prompt: './prompt.md',
        mode: 'primary',
        permissions: {
            edit: 'allow',
            task: { explore: 'allow', general: 'allow' },
        },
    },
    inject: [
        { state: 'handoff' },
    ],
    extract: ['messages', 'handoff'],
};

export default createNode(step);
```

### `src/graph/nodes/manager/node.ts` — Rewrite

Same pattern as planner, with its own agent config, inject, and extract.

```ts
const step: StepDefinition = {
    agent: {
        name: 'manager',
        model: 'openai/gpt-5.4',
        prompt: './prompt.md',
        mode: 'primary',
        permissions: {
            edit: 'allow',
            bash: 'allow',
            task: { '*': 'deny', coder: 'allow', explore: 'allow', general: 'allow' },
        },
    },
    inject: [
        { state: 'handoff' },
    ],
    extract: ['messages'],
};
```

### `src/graph/nodes/coder/node.ts` — Rewrite

```ts
const step: StepDefinition = {
    agent: {
        name: 'coder',
        model: 'openai/gpt-5.4',
        prompt: './prompt.md',
        mode: 'subagent',
        hidden: true,
        permissions: {
            edit: 'allow',
            bash: 'allow',
        },
    },
    inject: [
        { state: 'handoff' },
    ],
    extract: ['messages'],
};
```

### `src/graph/nodes/index.ts` — Rewrite

Current: empty object with a TODO comment.

New: assemble node map from step definitions.

```ts
import planner from './planner/node.ts';
import manager from './manager/node.ts';
import coder from './coder/node.ts';

const nodes = { planner, manager, coder };

export default nodes;
```

### `src/graph/graph.ts` — Simplify

Remove:
- `ChatOpenAI` import
- `DEFAULT_MODEL` constant
- `RuntimeAgent` type
- `Runtime` interface
- `loadRuntime()` function
- `contentPart()`, `contentText()` helpers
- Commented-out `withSystem`, `prompt` code

Keep:
- `GraphConfig` (may need `root` and `openviking` fields added)
- `createGraph()` (uses the node map from `index.ts`)
- `route()` conditional edge
- Graph wiring

The graph factory itself barely changes — it still calls `.addNode('planner', nodes.planner)` etc. The difference is that each node function is now a step engine, not a model call.

### `src/graph/state.ts` — Unchanged

`StateAnnotation`, `MAW_SYSTEM_ID`, `GraphState`, `GraphUpdate` stay as-is. The pinning and reducer logic is still needed for LangGraph state management.

---

## Dependency Changes

### Add

- `@opencode-ai/sdk` — for `createOpencodeClient`, session creation, prompts, and structured output

### Remove

- `@langchain/openai` — `ChatOpenAI` no longer needed since opencode handles model invocation

### Keep

- `@langchain/langgraph` — still needed for `StateGraph`, `Annotation`, and graph orchestration
- `@langchain/core/messages` — still needed for `BaseMessage` types in state (unless we decouple state from LangChain message types in a future step)

---

## Execution Order

These steps should be done in order. Each one leaves the project in a compilable state.

### Step 1: Create type definitions

**File**: `src/graph/step.ts`

Define `ContextSource`, `RequiredAction`, `StateExtractor`, `AgentConfig`, `StepDefinition`. Pure types, no runtime code. This is the contract everything else depends on.

**Verification**: `bun run typecheck` passes (or `tsc --noEmit` if no typecheck script).

### Step 2: Create the extraction module

**File**: `src/graph/extract.ts`

Move `contentText`, `contentPart`, and `handoffText` logic here. Adapt them to work with the opencode SDK response shape instead of `BaseMessage`. Export `extractState()` and `extractHandoff()`.

**Verification**: Unit tests for extraction logic pass.

### Step 3: Create the injection module

**File**: `src/graph/inject.ts`

Implement `injectContext()` with the four source types: `prompt`, `skill`, `openviking`, `state`. Wire OpenViking through the existing `OpenVikingClient` interface. Skill loading reads from `.opencode/skills/`. State injection reads from `StateAnnotation.State`.

**Verification**: Unit tests for each source type pass.

### Step 4: Create the execution module

**File**: `src/graph/execute.ts`

Implement `runAgent()`: create opencode session, inject context, send prompt, return raw result. Add `@opencode-ai/sdk` dependency. Implement `parseModel()` helper that splits `'provider/model'` into the SDK's `{ providerID, modelID }` shape.

**Verification**: Integration test against a running opencode server (or mock the SDK for unit level).

### Step 5: Rewrite `createNode.ts`

Replace the current factory with the step engine. Wire `injectContext` → `runAgent` → `enforceRequired` → `extractState`.

Delete: `Model` interface, `createModel()`, `withSystem()`, `prompt()`, `handoffText()`, all commented-out code.

**Verification**: Graph still compiles and wires correctly. Existing graph flow is not yet broken since node files haven't changed.

### Step 6: Rewrite each node file

Update `planner/node.ts`, `manager/node.ts`, `coder/node.ts` to export `createNode(step)` calls with `StepDefinition` objects instead of inline `ocConf` objects.

Update `nodes/index.ts` to export assembled node map.

**Verification**: Graph wires up correctly with the new node functions.

### Step 7: Clean up `graph.ts`

Remove dead imports and utilities: `ChatOpenAI`, `DEFAULT_MODEL`, `RuntimeAgent`, `Runtime`, `loadRuntime`, `contentPart`, `contentText`, commented-out code.

Simplify `GraphConfig` if needed (may want to add `openviking` config field).

**Verification**: `bun run typecheck` passes. Graph still compiles.

### Step 8: Remove `@langchain/openai`

Remove from `package.json` dependencies. Verify nothing else imports it.

**Verification**: `bun install && bun run typecheck && bun run test` all pass.

---

## Out of Scope (Future Work)

- **`enforceRequired()` implementation** — currently stubbed. The `RequiredAction` type is defined but enforcement logic will be added when the first real use case exists.
- **Skill loading** — `{ skill: string }` context source is defined but `loadSkill()` is stubbed. Implement when opencode skill discovery API is available.
- **Structured output extraction** — `{ field, parse }` extractor is defined but custom parse functions will be added per-workflow.
- **Decoupling state from `BaseMessage`** — currently state still uses LangChain message types. A future step could replace with opencode-native types.
- **Streaming** — SDK supports SSE events; wiring streaming through LangGraph is a separate concern.
- **Workflow installation system** — making step definitions installable as packages is a future concern after the core engine is stable.

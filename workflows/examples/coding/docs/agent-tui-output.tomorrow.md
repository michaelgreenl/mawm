# Agent TUI Output

## Goal

Show the live progress of an OpenCode-backed inner agent run inside the main OpenCode TUI while a LangGraph node is executing, without waiting for the final summarized `AIMessage`.

## Constraints

- The current LangGraph wrapper in `src/utils/nodes/opencode-sdk.ts` only returns one final `AIMessage` per node invocation.
- That wrapper preserves raw OpenCode `parts` in metadata, but it does not stream them into LangGraph or the TUI.
- OpenCode TUI plugins are implemented and can render custom UI, but the built-in session transcript renderer is not currently pluggable at the per-message or per-tool render level.
- `showToast` is only an ephemeral notification mechanism, not a transcript insertion API.
- For any live TUI view to work, the node must use the same OpenCode server instance as the visible TUI. If it starts its own server, the TUI plugin will not see those events.

## Recommended Architecture

Use a shared OpenCode server plus a child session for the inner run, then render that child session live in a TUI plugin-owned surface.

### Pieces

1. LangGraph node

- Reuse a shared OpenCode client or `baseUrl` instead of calling `createOpencode()` per node.
- Create the inner session with `parentID` set to the visible parent session.
- Keep returning the final summarized `AIMessage` for graph compatibility.

2. Server-side coordination

- Add a small OpenCode server plugin.
- This plugin tracks which child session belongs to which parent session and node name.
- It can optionally emit lightweight TUI events or expose metadata for the TUI plugin.

3. TUI plugin

- Add a TUI plugin package using `@opencode-ai/plugin/tui`.
- Subscribe to live events with `api.event.on(...)`.
- Render a live child-session panel in a supported slot such as `app_bottom`, `app`, or `sidebar_content`.
- Alternatively, register a custom route for a dedicated live-view screen.

## Why This Shape

This matches the current OpenCode extension points.

- TUI plugins can register routes, slots, dialogs, and event listeners.
- TUI plugins can use the SDK client directly.
- The built-in transcript renderer is hardcoded, so inline native transcript injection is not the lowest-risk path.
- Child sessions are already a first-class OpenCode concept and already map well to subagent-like work.

## Implementation Steps

### 1. Reuse the visible OpenCode server

Update the LangGraph side so the node connects to the same OpenCode instance the user is already viewing.

- Preferred input: inject `client` into `createOpenCodeNode(...)`.
- Acceptable fallback: pass `baseUrl` to connect to an already-running server.
- Avoid `createOpencode()` inside the node for this use case.

Result:

- The node-created session and the TUI share one event bus.
- Plugins and the TUI can observe `message.part.updated`, `message.updated`, `session.status`, and `session.idle` for the inner run.

### 2. Make the inner run a child session

When creating the session, set `parentID` to the user-visible parent session.

- The existing wrapper already supports `parentID` in `OpenCodeNodeOptions`.
- This makes the inner run show up as a real session relationship instead of opaque background work.

Store at least:

- `parentSessionID`
- `childSessionID`
- `nodeName`
- optional label such as `title`

## 3. Add a server plugin for session mapping

Create a server plugin module that keeps a simple registry of live child runs.

Suggested responsibilities:

- Observe session creation or node-triggered metadata.
- Track parent-to-child relationships for live agent runs.
- Optionally expose node labels and statuses.
- Optionally publish TUI-friendly events using the shared bus via existing session/message events, or keep the TUI plugin purely pull-based.

Keep this minimal. Do not try to rewrite transcript storage in the first version.

### 4. Add a TUI plugin for live rendering

Create a TUI plugin package with a `./tui` entrypoint.

Use these APIs:

- `api.event.on(type, handler)` for live updates
- `api.client` for fetching session data
- `api.route.register(...)` if a full-screen view is needed
- `api.slots.register(...)` for embedding a panel into the existing app layout
- `api.ui.toast(...)` only for small milestone notifications

Recommended first UI:

- Slot: `app_bottom`
- Behavior: when the current parent session has an active tracked child session, show a compact live panel below the main view
- Contents:
  - child agent label
  - current status: busy, retry, idle
  - latest text chunk
  - latest tool activity
  - latest subtask or agent switch if present

This gives live visibility without fighting the built-in transcript renderer.

### 5. Render child-session content from real parts

Use the child session's real message stream instead of inventing a new format.

Focus on these part types:

- `text`
- `reasoning`
- `tool`
- `step-start`
- `step-finish`
- `subtask`
- `agent`

Practical rendering policy:

- Show text progressively.
- Collapse reasoning by default.
- Show tool calls as one-line status rows.
- Show completed tools with trimmed output.
- Show subtask and agent parts as labels or badges.

This mirrors how OpenCode already thinks about message structure.

### 6. Add navigation affordances

Support quick navigation from the live panel into the actual child session.

Good options:

- click or keybind to `api.route.navigate("session", { sessionID: childSessionID })`
- optional custom route that aggregates parent plus child activity

This keeps the panel lightweight while still allowing deep inspection.

## What Not To Do First

Avoid these in the first implementation:

- injecting fake assistant transcript blocks into the built-in session view
- mutating stored messages to impersonate native tool or subagent transcript entries
- relying on `showToast` for anything beyond brief notifications
- starting a separate hidden OpenCode server for the child run

These paths either fight current OpenCode boundaries or lose the shared live event stream.

## Notes On Existing OpenCode Surfaces

Relevant upstream areas confirmed during investigation:

- TUI toast event and UI:
  - `packages/opencode/src/server/routes/instance/httpapi/handlers/tui.ts`
  - `packages/opencode/src/server/routes/instance/httpapi/groups/tui.ts`
  - `packages/opencode/src/cli/cmd/tui/event.ts`
  - `packages/opencode/src/cli/cmd/tui/ui/toast.tsx`

- TUI plugin runtime and API:
  - `packages/opencode/src/cli/cmd/tui/plugin/runtime.ts`
  - `packages/opencode/src/cli/cmd/tui/plugin/api.tsx`
  - `packages/opencode/src/cli/cmd/tui/plugin/slots.tsx`
  - `packages/plugin/src/tui.ts`
  - `packages/opencode/specs/tui-plugins.md`

- Built-in session rendering:
  - `packages/opencode/src/cli/cmd/tui/app.tsx`
  - `packages/opencode/src/cli/cmd/tui/routes/session/index.tsx`

- Server plugin hooks affecting prompt construction:
  - `packages/opencode/src/plugin/index.ts`
  - `packages/opencode/src/session/prompt.ts`
  - `packages/opencode/src/session/processor.ts`

## Minimal Viable Version

Ship this first:

1. shared OpenCode server
2. child session creation via `parentID`
3. TUI plugin in `app_bottom`
4. live child-session text and tool status rows
5. open-child-session action

This is enough to make inner agent work readable live with a small, reversible change set.

## Future Upgrade Path

If the MVP is useful, consider a core OpenCode contribution to add one of these:

- transcript slots around message rendering
- pluggable renderers for `tool` and `subtask` parts
- a first-class "linked live child session" UI primitive

That would make true inline subagent-style rendering much cleaner than a plugin-owned side panel.

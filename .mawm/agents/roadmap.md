# MAWM - Initiative Roadmap

## Source of Truth Rules

- This roadmap must match the current codebase, the current strategy, and every linked active spec.
- When roadmap direction changes, update every affected active doc in the same pass.
- Remove or rewrite superseded statements instead of adding contradictory notes elsewhere in the active set.
- Never treat queued, archived, or completed docs as current execution truth unless an active spec explicitly says to inspect them.

## Direction

### Strategic Outcomes

- Workflow installs and updates can be reproduced from either local workflow paths or explicit Git URLs recorded in the global manifest.
- Project-local `.mawm/` holds planning docs (`agents/`), project execution config (`mawm.json`), and ignored runtime logs (`logs/`); no executable workflow copies live in target projects.
- CLI surface, shipped agent prompts, templates, and README all describe the global install model with no dual-mode (`-g`) remnants.
- Workflow templates and installed workflows expose a versioned `mawm.json` contract that declares execution requirements, phase/agent topology, and configurable runtime surfaces.
- Project-local and per-run context and model config are resolved by deterministic MAWM-authored runtime code in the shared `@mawm/core` layer that workflows consume, not interpreted ad hoc by manager-agent prose. Execution-only values such as target repo, initiative branch, and sessions still arrive from the launcher through LangGraph runtime context.
- OpenCode-backed workflows can receive stacked context and per-agent model overlays while OpenCode remains responsible for provider connectivity and credential handling.

## State Model

- `queued/` contains not-yet-started initiatives, draft plans, or ideas that still need decisions. It is planning input, not the active source of truth.
- `active/` contains approved initiatives with a current `spec.md` and active execution path. These docs must stay aligned with this roadmap and the current codebase.

## Horizon Definitions

- `Now` - work that should proceed immediately or remain first in the active/ad-hoc execution sequence.
- `Next` - approved implementation-ready specs that should start after the current active/ad-hoc dependency clears.
- `Later` - approved implementation-ready specs sequenced after the `Next` initiative clears.

## Initiative Ledger

| Initiative | State | Horizon | Why it matters | Depends on | Working doc |
| ---------- | ----- | ------- | -------------- | ---------- | ----------- |
| `Project-local context config` | `active` | `Now` | Lets a target project inject scoped context (global/workflow/agent/phase) into workflow agents at execution time, stacking project-local context into prompts while OpenCode owns providers. Establishes the workflow `mawm.json` agent/phase topology contract. | Current `Now` sequence (ad-hoc run, `Git URL workflow sources`) | `.mawm/agents/initiatives/active/project-local-context-config/spec.md` |
| `Per-run config` | `active` | `Next` | Adds planner-authored per-run context (stacked on project-local) and per-agent model overrides, and lifts the OpenCode execution layer into shared `@mawm/core` so model toggling is reasonable with OpenCode owning providers. | `Project-local context config` | `.mawm/agents/initiatives/active/per-run-config/spec.md` |

## Now

### Project-local context config

- State: `active`
- Goal: Add `.mawm/mawm.json` project-local context configuration that the coding workflow reads at runtime and injects (stacked) into agent prompts, plus the workflow `mawm.json` agent/phase topology contract and schema it validates against.
- Exit signal: with a `.mawm/mawm.json` present in a target project, the coding workflow injects the configured global/workflow/agent/phase context into the right agents (stacked, duplicates retained) at execution time, validated against the workflow's declared kebab agent and phase topology; with no config, prompts are unchanged.
- Working doc: `.mawm/agents/initiatives/active/project-local-context-config/spec.md`
- Notes: Multi-repo initiative — one initiative branch and PR per repo (`mawm`, `coding`). Foundation runs are the node injection seam (`coding`) and the topology/schema/scaffold contract (`mawm`); the config reader is the final `coding` run. Sequenced after the current `Now` / ad-hoc work.

## Next

### Per-run config

- State: `active`
- Goal: Add a planner-authored per-run `run.config.json` sidecar for per-run context (stacked on project-local) and per-agent model/variant overrides, and lift the OpenCode execution and config layer into a shared `@mawm/core` package exposed at `@mawm/core/opencode`.
- Exit signal: a `run.config.json` next to a run `spec.md` stacks per-run context on top of project-local context and toggles per-agent models/variants at execution time via `@mawm/core`, with OpenCode owning provider connectivity; the coding workflow consumes `@mawm/core/opencode` and holds no private OpenCode copy.
- Working doc: `.mawm/agents/initiatives/active/per-run-config/spec.md`
- Notes: Multi-repo initiative. Prerequisite run lifts OpenCode into `@mawm/core` (`mawm`) and the coding workflow consumes it (`coding`); per-run context and model runs land in `@mawm/core`. Depends on `Project-local context config`.

## Later

- No additional initiatives are currently committed.


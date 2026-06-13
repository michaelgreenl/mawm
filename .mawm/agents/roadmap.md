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
- Project/run config is resolved by deterministic MAWM code before workflow execution, then injected through LangGraph runtime context instead of being interpreted ad hoc by manager-agent prose.
- OpenCode-backed workflows can receive context and model overlays while OpenCode remains responsible for provider connectivity and credential handling.

## State Model

- `queued/` contains not-yet-started initiatives, draft plans, or ideas that still need decisions. It is planning input, not the active source of truth.
- `active/` contains approved initiatives with a current `spec.md` and active execution path. These docs must stay aligned with this roadmap and the current codebase.

## Horizon Definitions

- `Now` - work that should proceed immediately or remain first in the active/ad-hoc execution sequence.
- `Next` - approved implementation-ready specs that should start after the current active/ad-hoc dependency clears.
- `Later` - no additional initiatives are currently committed beyond the active set below.

## Initiative Ledger

| Initiative | State | Horizon | Why it matters | Depends on | Working doc |
| ---------- | ----- | ------- | -------------- | ---------- | ----------- |
| `Git URL workflow sources` | `active` | `Now` | Lets workflow installs and updates be reproduced directly from Git remotes, including reinstalling `coding` from `git@github.com:michaelgreenl/coding-workflow.git`. | `Global workflow install model` | `.mawm/agents/initiatives/active/git-url-workflow-sources/spec.md` |
| `Workflow schema runtime contracts` | `active` | `Next` | Gives templates, installed workflows, and the coding-workflow pattern a deterministic contract for topology and configurable surfaces. | `Git URL workflow sources` | `.mawm/agents/initiatives/active/workflow-schema-runtime-contracts/spec.md` |
| `Project and run config overlays` | `active` | `Next` | Lets projects and initiative runs inject validated context and OpenCode model choices at execution time. | `Workflow schema runtime contracts` | `.mawm/agents/initiatives/active/project-run-config-overlays/spec.md` |

## Now

### Git URL workflow sources

- State: `active`
- Goal: Add explicit Git URL support to `mawm install` and Git-backed source replay to `mawm update`, while keeping existing local `absolutePath` installs working.
- Exit signal: `mawm install git@github.com:michaelgreenl/coding-workflow.git` installs `coding` into `~/.config/mawm/coding`, records the Git URL as the update source, and `mawm update coding` can reinstall from that recorded Git source after cloning/building in a temp checkout.
- Working doc: `.mawm/agents/initiatives/active/git-url-workflow-sources/spec.md`
- Notes: Kept ahead of the new schema/config initiatives per user direction. Tests should use local temporary Git repositories and the private GitHub URL is reserved for HITL manual smoke.

## Next

### Workflow schema runtime contracts

- State: `active`
- Goal: Add schema-v0 workflow metadata so MAWM can validate workflow identity, execution contracts, phase/agent topology, and configurable runtime surfaces before install, check, or execution.
- Exit signal: bundled workflow templates use `schemaVersion: "mawm.workflow.v0"`; topology/configurable-surface validation is implemented; a coding-workflow contract fixture matches the current OpenCode-backed workflow pattern; `mawm check <workflow-id-or-path>` validates workflows without launching them; install/update/docs/prompts align with the schema contract.
- Working doc: `.mawm/agents/initiatives/active/workflow-schema-runtime-contracts/spec.md`
- Notes: Depends on `Git URL workflow sources` because the user asked the new initiatives to come after that active/ad-hoc work. The sibling `../workflows/coding` repo is reference input only for this initiative; MAWM-owned contracts/assets are the implementation target.

### Project and run config overlays

- State: `active`
- Goal: Resolve `.mawm/mawm.json` project config and per-run config overlays before workflow launch, inject the effective config through LangGraph context as `mawmConfig`, and let MAWM-owned OpenCode workflow agents consume context/model overrides at invocation time.
- Exit signal: project config and per-run overlay schemas (`mawm.project.v0`, `mawm.run.v0`) are validated against workflow schema-v0 metadata; `execute-graph` persists/audits `effective-config.json`; OpenCode model/variant overrides are proven with mocked SDK tests; docs/templates/prompts describe merge order and provider-boundary limits.
- Working doc: `.mawm/agents/initiatives/active/project-run-config-overlays/spec.md`
- Notes: Do not start until `Workflow schema runtime contracts` is merged or otherwise available as the base; config validation depends on declared workflow/phase/agent IDs and configurable-surface flags.

## Later

- No additional initiatives are currently committed.

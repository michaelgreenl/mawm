# MAWM - Initiative Roadmap

## Source of Truth Rules

- This roadmap must match the current codebase, the current strategy, and every linked active spec.
- When roadmap direction changes, update every affected active doc in the same pass.
- Remove or rewrite superseded statements instead of adding contradictory notes elsewhere in the active set.
- Never treat queued, archived, or completed docs as current execution truth unless an active spec explicitly says to inspect them.

## Direction

### North Star

MAWM should ship reusable workflow templates and a truthful CLI surface so teams can scaffold initiative-run or standalone workflows, install them, and understand exactly what the CLI changed without relying on stale examples or misleading output.

### Strategic Outcomes

- Canonical workflow template source assets exist under `src/assets/workflow-templates/{base,initiative,shared}` and ship distributed template assets under `dist/assets/workflow-templates/{base,initiative}`.
- `mawm init` can clearly scaffold local MAWM state, workflow templates, and agent assets with accurate mode handling and output.
- The README matches the real package name, command surface, and shipped workflow model, while also carrying a clearly labeled post-v0.1.0 direction section covering global workflow execution with project-local customization, expansion of the root config directory into a broader asset hub, and broader agentic-dev tool integrations.

## State Model

- `queued/` contains not-yet-started initiatives, draft plans, or ideas that still need decisions. It is planning input, not the active source of truth.
- `active/` contains approved initiatives with a current `spec.md` and active execution path. These docs must stay aligned with this roadmap and the current codebase.

## Horizon Definitions

- `Now` - work that should proceed immediately because it unblocks the next layer of CLI and docs changes.
- `Next` - approved follow-on work that should start after the current dependency clears.
- `Later` - no additional initiatives are currently committed beyond the active set below.

## Initiative Ledger

| Initiative            | State    | Horizon | Why it matters                                                                 | Depends on             | Working doc                                                            |
| --------------------- | -------- | ------- | ------------------------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------- |
| `CLI init cleanup`    | `active` | `Now`  | Exposes the template scaffolds through `mawm init` and fixes truthful init output. | `none`   | `.mawm/agents/initiatives/active/cli-init-cleanup/spec.md`             |

## Now

### CLI init cleanup

- State: `active`
- Goal: expose `mawm init -t [type]` template initialization and clean up `mawm init` messaging.
- Exit signal: `mawm init` can scaffold the new templates with accurate messaging and representative verification coverage.
- Working doc: `.mawm/agents/initiatives/active/cli-init-cleanup/spec.md`
- Notes: do not start execution until the workflow-templates initiative has produced the CLI-consumable template assets under `dist/assets/workflow-templates/{base,initiative}`. The README work has been split out of this initiative into the queued ad-hoc run at `.mawm/agents/adhoc/queued/readme-refresh/spec.md`; leave that run queued until the user promotes it after the next approved initiative lands.

## Next

- No additional initiatives are currently committed.

## Later

- No additional initiatives are currently committed.

## Review Triggers

- Any change to workflow metadata contracts, template asset layout, or `execute-graph` result handling.
- Any change to the `init` command surface, shipped agent assets, or public support claims in the README.

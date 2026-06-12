# MAWM - Initiative Roadmap

## Source of Truth Rules

- This roadmap must match the current codebase, the current strategy, and every linked active spec.
- When roadmap direction changes, update every affected active doc in the same pass.
- Remove or rewrite superseded statements instead of adding contradictory notes elsewhere in the active set.
- Never treat queued, archived, or completed docs as current execution truth unless an active spec explicitly says to inspect them.

## Direction

### North Star

- Publish v0.1.0  

### Strategic Outcomes

- Workflows have one canonical installed location (`~/.config/mawm/<workflow-id>`) that is both managed by the CLI and executed by `execute-graph`.
- Project-local `.mawm/` holds only planning docs (`agents/`) and ignored runtime logs (`logs/`); no executable workflow copies live in target projects.
- CLI surface, shipped agent prompts, templates, and README all describe the global install model with no dual-mode (`-g`) remnants.

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
| `Global workflow install model` | `active` | `Now`   | Collapses the dual project/global install model so workflows are managed and executed from one global location. | `none` | `.mawm/agents/initiatives/active/global-workflow-install-model/spec.md` |

## Now

### Global workflow install model

- State: `active`
- Goal: Make globally installed workflows (`~/.config/mawm/<workflow-id>`) the single executable source; project-local `.mawm/` keeps only planning docs and ignored runtime logs.
- Exit signal: `execute-graph` resolves global workflows, generates a project-local runtime config under `.mawm/logs/<workflow>/`, and runs with all per-project runtime state there; `install`/`update`/`remove`/`list` are global-only with `-g` removed (`update` defaults to today's `-g` behavior); `init` no longer scaffolds `.mawm/graphs/`; prompts/templates/README match; this repo's committed `.mawm/graphs/` is deleted.
- Working doc: `.mawm/agents/initiatives/active/global-workflow-install-model/spec.md`
- Notes: `init -i` / `update -i` planning-asset behavior is unchanged. v0 pre-release: no migration shims for existing project-local installs.

## Next

- No additional initiatives are currently committed.

## Later

- No additional initiatives are currently committed.

## Review Triggers

- Any change to workflow metadata contracts, template asset layout, or `execute-graph` result handling.
- Any change to the `init` command surface, shipped agent assets, or public support claims in the README.

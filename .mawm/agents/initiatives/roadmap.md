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

- Root CLI and asset tests only encode behavior the project currently supports in v0.
- Repo and workflow-template asset tests share a Vitest-based path that can run headlessly from the repo root.
- Example workflow coverage stays isolated from repo-level test cleanup unless a separate initiative explicitly expands scope.

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
| `Testing refactor and cleanup` | `active` | `Now`   | Replaces stale test coverage with a Vitest-based suite that matches current supported behavior. | `none` | `.mawm/agents/initiatives/active/testing-refactor-cleanup/spec.md` |

## Now

### Testing refactor and cleanup

- State: `active`
- Goal: Move repo and workflow-template asset coverage to Vitest and keep only tests for current legitimate behavior.
- Exit signal: Repo-root and workflow-template asset coverage pass headlessly on the new stack, stale legacy/implementation-detail tests are removed, and `workflows/examples/coding/test/**` remains untouched.
- Working doc: `.mawm/agents/initiatives/active/testing-refactor-cleanup/spec.md`
- Notes: This initiative applies to workflow-template asset tests, but explicitly excludes `workflows/examples/coding/test/**`.

## Next

- No additional initiatives are currently committed.

## Later

- No additional initiatives are currently committed.

## Review Triggers

- Any change to workflow metadata contracts, template asset layout, or `execute-graph` result handling.
- Any change to the `init` command surface, shipped agent assets, or public support claims in the README.

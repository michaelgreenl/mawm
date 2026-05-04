> This template is for a project's `roadmap.md` file:
> `.mawm/initiatives/roadmap.md`

> Planner notes
> - This file is for long-range initiative direction, sequencing, and tradeoffs. Do not turn it into a phase plan or task list.
> - Treat this roadmap and every linked active plan as one current-state source of truth. When strategy changes, update them together and delete stale text instead of layering corrections.
> - `archived/` initiatives and `phases/complete/` docs are historical only. Reference them from active planning only when absolutely necessary.
> - Every initiative listed here should point at its current working doc in `active/`, `queued/`, or `archived/`.
> - Keep `Now` limited to initiatives that are actually staffed or ready to staff. Future horizons may hold hypotheses, but current commitments must be clear.
> - Update this file when initiative state, sequencing, or strategy changes.

<!-- Delete sections that do not apply. Replace placeholders with project-specific language before finalizing. Remove or rewrite superseded active text instead of stacking contradictory notes. -->

# <Project Name> - Initiative Roadmap

## Planning Window

<state the planning horizon this roadmap covers, for example the next 6-12 months, the next 3 release cycles, or the current product era>

## Status Reset

<optional: only when needed, state which earlier active assumptions or priorities are no longer valid. Keep historical detail to the minimum required to prevent conflicting reads>

## Source of Truth Rules

- This roadmap must match the current codebase, the current strategy, and every linked active plan.
- When roadmap direction changes, update every affected active doc in the same pass.
- Remove or rewrite superseded statements instead of adding contradictory notes elsewhere in the active set.
- Use historical references only when needed to explicitly retire or invalidate a stale assumption.

## Direction

### North Star

<1 short paragraph describing the project state this roadmap is trying to create>

### Strategic Outcomes

- <outcome the roadmap should produce>
- <outcome the roadmap should produce>
- <outcome the roadmap should produce>

### Guardrails

- <scope boundary, non-goal, or rule>
- <capacity, staffing, or dependency constraint>
- <quality, rollout, or architecture constraint>

## State Model

- `queued/` contains not-yet-started initiatives, draft plans, or ideas that still need decisions. It is planning input, not the active source of truth.
- `active/` contains approved initiatives with a committed `plan.md` and active execution path. These docs must stay aligned with this roadmap and the current codebase.
- `archived/` contains completed, retired, or superseded initiatives kept for history only.
- `phases/complete/` docs inside initiatives are historical handoff or logging records only.

## Horizon Definitions

- `Now` - <current focus window; only initiatives that are active or ready to activate>
- `Next` - <initiatives expected to start after current blockers or dependencies clear>
- `Later` - <long-range direction, future bets, or intentionally deferred work>

## Initiative Ledger

| Initiative | State | Horizon | Why it matters | Depends on | Working doc |
| --- | --- | --- | --- | --- | --- |
| `<initiative name>` | `active` | `Now` | <why this matters now> | `<dependency or none>` | `.mawm/initiatives/active/<initiative-slug>/plan.md` |
| `<initiative name>` | `queued` | `Next` | <why this matters next> | `<dependency or none>` | `.mawm/initiatives/queued/<initiative-slug>/plan-drafts/<draft>.md` |
| `<initiative name>` | `queued` | `Later` | <future opportunity or reason to keep visible> | `<dependency or none>` | `<optional draft path or note>` |

## Now

### <initiative or theme>

- State: `active`
- Goal: <directional goal for the current window>
- Why now: <why this belongs in the current focus window>
- Exit signal: <observable condition that lets this leave the current horizon>
- Working doc: `.mawm/initiatives/active/<initiative-slug>/plan.md`
- Notes: <key dependency, risk, or scope boundary>

### <initiative or theme>

- State: `ready` or `blocked`
- Goal: <directional goal for the current window>
- Why now: <why this should stay visible now even if blocked>
- Exit signal: <observable condition that resolves the block or closes the work>
- Working doc: `.mawm/initiatives/active/<initiative-slug>/plan.md`
- Notes: <key dependency, risk, or scope boundary>

## Next

### <initiative or theme>

- State: `queued`
- Goal: <what this initiative should unlock once started>
- Why next: <why it is important but not the current top priority>
- Promotion gate: <what must be true before this moves into `Now`>
- Working doc: `.mawm/initiatives/queued/<initiative-slug>/plan-drafts/<draft>.md`
- Notes: <main dependency, open decision, or staffing assumption>

### <initiative or theme>

- State: `queued`
- Goal: <what this initiative should unlock once started>
- Why next: <why it follows the current window instead of competing with it>
- Promotion gate: <what must be true before this moves into `Now`>
- Working doc: `.mawm/initiatives/queued/<initiative-slug>/plan-drafts/<draft>.md`
- Notes: <main dependency, open decision, or staffing assumption>

## Later

### <initiative or theme>

- State: `future` or `parked`
- Opportunity: <future value this initiative could unlock>
- Why later: <why it is not a near-term commitment>
- Not before: <dependency, maturity gate, or strategic precondition>
- Working doc: `<optional draft path, note, or research placeholder>`
- Notes: <largest uncertainty, risk, or missing decision>

### <initiative or theme>

- State: `future` or `parked`
- Opportunity: <future value this initiative could unlock>
- Why later: <why it is intentionally deferred>
- Not before: <dependency, maturity gate, or strategic precondition>
- Working doc: `<optional draft path, note, or research placeholder>`
- Notes: <largest uncertainty, risk, or missing decision>

## Dependency Order

```text
<initiative A>
   -> <initiative B>
      -> <initiative C>
```

## Capacity and Tradeoffs

- <what cannot reasonably be pursued at the same time>
- <shared owner, system, or architecture bottleneck>
- <why one initiative stream wins over another>

## Promotion Rules

- Move an initiative into `active/` only when scope, ownership, and MVP are clear enough for an initiative `plan.md`.
- When active direction changes, update `roadmap.md` plus every impacted active initiative or phase doc in the same pass.
- Rewrite or delete stale statements in active docs; do not stack corrective notes below outdated guidance.
- Keep unresolved or exploratory work in `queued/` until the major architecture and sequencing questions are cleared.
- Split large efforts into separate initiatives when they no longer share the same MVP, owner, or execution window.
- Archive completed or retired initiatives once follow-on work has been queued separately or removed from the active direction.

## Review Triggers

- <time cadence such as monthly, per release, or per milestone>
- <strategy change, architecture reset, or staffing change that should force a roadmap update>

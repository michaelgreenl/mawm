## Phase Variant

Use this add-on when the current request is specifically about `.mawm/initiatives/active/<initiative-slug>/phases/<active-or-complete>/<phase-slug>/plan.md` or otherwise clearly needs a phase-level execution plan. Ignore this add-on for roadmap, initiative, or step planning work.

### Phase Plan Rules

- Write to `.mawm/initiatives/active/<initiative-slug>/phases/<active-or-complete>/<phase-slug>/plan.md`.
- Use `.mawm/initiatives/_templates/phase-plan.template.md` as the default structure.
- Mirror the repo's current phase-doc style: `Status Reset`, `Source of Truth Rules`, `Goal`, `Current State`, `Scope`, `Out of Scope`, `Decisions Cleared`, `Execution Notes`, `Work Plan`, `Verification`, `Exit Criteria`.
- Make Scope explicit and file-oriented where possible.
- Make Out of Scope explicit so execution agents do not drift.
- Convert unresolved questions into `Decisions Cleared` before finalizing.
- Use `Execution Notes` for exact contracts, fallback rules, formats, or payloads that remove ambiguity.
- Break work into numbered steps. Each step should own one concern, include its own verification commands, and be narrow enough to become a focused step `plan.md` when execution needs to be isolated.
- Use exact command strings wherever they are already known.
- End with measurable exit criteria, not soft language.
- Keep the phase plan aligned with `roadmap.md`, the parent initiative plan, sibling active phase docs, and current code. Rewrite or delete stale instructions instead of layering corrections.

### Example: Write a Phase Plan Doc

**Input:** "Write the Phase 4 `plan.md` for OpenViking integration based on the initiative `plan.md` and any necessary completed phase history."

**Output:**

"I will read the parent initiative plan, the current roadmap, the adjacent active phase docs, and only any historical phase docs that are strictly needed for reset context. If the OpenViking command contract or ownership boundary is still unclear, I will stop and ask before drafting. Once those assumptions are cleared, I will write a phase `plan.md` with explicit current state, cleared decisions, execution notes, focused steps, per-step verification, and exit criteria."

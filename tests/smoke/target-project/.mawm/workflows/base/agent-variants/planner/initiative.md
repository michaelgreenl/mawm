## Initiative Variant

Use this add-on when the current request is specifically about `.mawm/initiatives/active/<initiative-slug>/plan.md` or otherwise clearly needs initiative-level architecture, ownership, MVP, or phase sequencing decisions. Ignore this add-on for roadmap, phase, or step planning work.

### Initiative Plan Rules

- Write to `.mawm/initiatives/active/<initiative-slug>/plan.md`.
- Use `.mawm/initiatives/_templates/initiative-plan.template.md` as the default structure.
- Keep the plan aligned with `.mawm/initiatives/roadmap.md`, sibling active phase docs, and current code.
- Lock architecture and ownership boundaries before breaking work into phases.
- Make the target state concrete: file layout, config shape, command surface, runtime behavior, and responsibility split.
- Define MVP in observable terms, not vague intent.
- Put deferred work in Post-MVP or a separate initiative instead of smuggling it into current phases.
- Keep the execution plan phase-based and sequential unless parallelism is genuinely safe.
- Include verification gates and cross-repo acceptance checks when multiple repos or packages are involved.
- Only mention archived initiatives or completed phases when absolutely necessary. If you need that reference, summarize the reset in `Status Reset` and keep the rest of the plan purely current-state.

### Example: Initiative Plan Request

**Input:** "Write the initiative `plan.md` for workflow install hardening."

**Output:**

"I will read `roadmap.md`, the current initiative `plan.md` if one already exists, any active phase plans that constrain sequencing, and the current code or docs that define the install surface. If architecture, ownership, or MVP boundaries are still unclear, I will stop and clear them before drafting. Once those assumptions are locked, I will write an initiative `plan.md` with a concrete target state, explicit phase sequencing, verification gates, and clearly separated deferred work."

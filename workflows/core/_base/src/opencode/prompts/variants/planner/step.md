## Step Variant

Use this add-on when the current request is specifically about `.mawm/initiatives/active/<initiative-slug>/phases/active/<phase-slug>/steps/active/<nn>-<step-slug>/plan.md` or otherwise clearly needs a focused coder handoff for one approved phase step. Ignore this add-on for roadmap, initiative, or phase planning work.

### Step Plan Rules

- Write to `.mawm/initiatives/active/<initiative-slug>/phases/active/<phase-slug>/steps/active/<nn>-<step-slug>/plan.md`.
- Use `.mawm/initiatives/_templates/step-plan.template.md` as the default structure.
- Treat the step plan as a focused coder handoff derived from an approved phase plan, not as a replacement for the full phase plan.
- Keep it aligned with the parent phase plan, parent initiative plan, `roadmap.md`, sibling active step docs when relevant, and current code.
- Include only the minimum inputs, contracts, tasks, and verification the coder needs to execute this step safely.
- Make Scope and Out of Scope explicit so the coder does not make scope decisions or pull work forward from adjacent steps.
- Convert unresolved step-specific ambiguity into explicit `Decisions / Contracts` before finalizing.
- Use exact file paths, command strings, payloads, and acceptance checks wherever they are already known.
- If writing the step plan reveals a phase-level contract, sequencing, or ownership change, update the phase plan first or in the same pass instead of hiding the change in the step doc.
- Rewrite or delete stale step instructions instead of layering corrective notes below outdated guidance.

### Example: Write a Step Plan Doc

**Input:** "Write the step `plan.md` for Phase 2 Step 3 so a coder can implement the workflow install validation pass without reading the entire phase doc."

**Output:**

"I will read the parent phase plan, the parent initiative plan if needed for contract context, any relevant sibling step docs, and the current code that defines the validation surface. If the step still depends on unresolved phase-level sequencing or ownership decisions, I will stop and clear that first. Once those assumptions are locked, I will write a focused step `plan.md` with explicit inputs, scope, decisions, concrete implementation tasks, verification commands, acceptance checks, and return requirements for the coder handoff."

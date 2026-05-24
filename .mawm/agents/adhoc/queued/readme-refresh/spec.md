> Queued ad-hoc run. Per `.mawm/agents/adhoc/README.md`, ad-hoc runs do not require an assigned workflow until execution is explicitly requested.

# Run Spec: README refresh

## Assigned Workflow


## Task

Refresh the README in a dedicated follow-on pass after the next approved initiative lands so the published docs match the then-current package name, CLI surface, shipped assets, and approved future-facing roadmap language.

## Current State

- `cli-init-cleanup` no longer owns README finalization; that initiative now stops after the `mawm init` CLI work.
- The current README still needs a cleanup pass because it contains stale package, command-surface, and project-story copy.
- Another initiative will be planned and implemented before this work executes, so this run must be re-grounded against the current codebase and roadmap when it is promoted.
- This run is intentionally queued and must not move to `adhoc/active/` until the user explicitly asks for it after the intervening initiative is complete.

## Goal (Run Outcome)

The README is refreshed against the then-current codebase and roadmap: it uses the correct package name and command surface, reflects the real init/install/list flows that exist at execution time, and includes clearly labeled post-v0.1.0 direction language without overstating shipped integrations or behavior.

## Scope

- Rewrite the README quick start, usage guidance, and high-level project description to match `package.json`, `src/cmd/surface/index.ts`, and the shipped assets at execution time.
- Remove stale package, command, and support claims that remain by the time this run is promoted.
- Add or update the clearly labeled post-v0.1.0 direction section so it matches the current roadmap at execution time.
- Keep OpenCode, Codex, and Claude Code support language explicitly future-facing or plausible-support unless the codebase and roadmap have changed enough to justify stronger wording by then.

## Out of Scope

- No `src/` or `test/` behavior changes.
- No new CLI features.
- No versioning, release-automation, or changelog work.
- No assumption that the current pre-follow-on-initiative README plan can be applied unchanged; this run must re-ground itself against current reality when promoted.

## Contracts

- Leave `## Assigned Workflow` blank while this run stays queued under `adhoc/`.
- Do not promote or execute this run until the user explicitly requests it after the next approved initiative lands.
- README claims must align with `package.json`, `src/cmd/surface/index.ts`, and the shipped assets at execution time.
- Quick start must not mention commands that do not exist at execution time.
- Any post-v0.1.0 direction section must be clearly labeled as future-facing roadmap language, not shipped behavior.
- If the roadmap still includes them at execution time, the future-facing direction section must cover global workflow execution with project-local customization, root config hub expansion, and broader agentic-dev integrations including Codex and Claude Code.
- Codex and Claude Code language must remain aspirational/plausible unless shipped behavior has changed by the time this run executes.

## Implementation Plan

1. Re-read the roadmap, the active initiative set, `README.md`, `package.json`, and `src/cmd/surface/index.ts` after the intervening initiative lands so the doc pass starts from current truth rather than today's assumptions.
2. Rewrite the README sections that still carry stale package names, stale command examples, or outdated positioning.
3. Reconcile future-facing language with the then-current roadmap so shipped behavior and roadmap direction are clearly separated.
4. Run the verification commands and perform manual rendered-README smoke review before marking the ad-hoc run ready.

## Verification Commands

- `bun run typecheck`
- `bun run lint:all`

## Smoke Verification

- Mode: `manual`
- Method: Review the rendered README diff in a Markdown preview after the next initiative lands and confirm the quick start, command list, support language, and any post-v0.1.0 direction section all match the then-current codebase and roadmap.
- Manual instructions, if needed: Compare the rendered README against `package.json`, `src/cmd/surface/index.ts`, and the current shipped asset layout before approving the run.

## Completion Gate

- The run has been re-grounded against the current codebase and roadmap after the intervening initiative.
- README claims match the then-current package name, CLI surface, and shipped assets.
- Future-facing language is clearly labeled and does not overstate shipped support.
- Verification commands pass.
- HITL confirms the manual smoke review was completed.
- Run is ready for user-assigned workflow execution and later promotion to one commit if implemented.

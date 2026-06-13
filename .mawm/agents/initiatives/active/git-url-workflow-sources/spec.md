# Git URL Workflow Sources - Initiative Spec Sheet

## Source of Truth Rules

- When initiative direction changes, update every affected active doc in the same pass.
- Any run specs created under `runs/active/` must match the run summaries in this spec.
- Remove or rewrite superseded text instead of appending contradictory follow-up notes.

## Target State

MAWM can install and update globally installed workflows from explicit Git URLs as well as local filesystem paths.

- `mawm install git@github.com:michaelgreenl/coding-workflow.git` clones the repository, prepares build artifacts, installs the `coding` workflow into `~/.config/mawm/coding`, and records the Git URL as the update source in `~/.config/mawm/manifest.json`.
- `mawm update coding` uses the recorded Git source for `coding` to clone the latest source again, rebuild/install the workflow, and leave the existing global install untouched if clone/build/install preparation fails.
- Existing local-path installs remain supported with the current `absolutePath`-based update behavior.
- The CLI, tests, and README explain that install/update sources can be local workflow paths or explicit Git URLs.

## Initiative-wide Contracts

- Installed workflow root remains `~/.config/mawm/<workflow-id>/`; project-local `.mawm/` remains planning docs plus runtime logs only.
- Local-path install/update behavior stays compatible with the current global-only model: local installs continue to record `absolutePath` in the global manifest and `update` can still reinstall from that path.
- Git source support is explicit source support, not package-manager shorthand. Accepted Git inputs are SSH/scp-style Git URLs such as `git@github.com:michaelgreenl/coding-workflow.git`, `ssh://` Git URLs, `https://`/`http://` Git URLs ending in `.git`, and `git+https://`/`git+ssh://` forms after stripping the `git+` prefix for Git commands.
- Git installs rely on the user's existing Git credentials, SSH agent, known-hosts setup, and network access. MAWM does not manage credentials or retry interactive authentication prompts.
- Git source preparation uses a temporary checkout outside the target repo and outside `~/.config/mawm/<workflow-id>/`. No persistent Git checkout cache is required for v1 of this support.
- Git source preparation must complete before replacing the existing installed workflow directory, so a failed clone, dependency install, build, or metadata validation does not destroy the currently installed workflow.
- For Git sources, if the cloned repository has a `package.json` with a `build` script, run `bun install --ignore-scripts` and then `bun run build` from the clone root before resolving install artifacts. If no build script exists, install from the checkout as-is.
- For Git sources, after build preparation, prefer `<clone>/dist` as the install artifact root when it contains `langgraph.json`; otherwise use the workflow root resolved from the checkout.
- Manifest entries remain the single update registry. A workflow entry must have at most one update source: top-level `absolutePath` for local-path sources or top-level `gitUrl` for Git sources. Missing source metadata keeps the current repair-style error.
- Git manifest entries persist the original Git input string as `gitUrl`. `git+` prefixes are stripped only when invoking `git`, not when writing the manifest.
- Git support must not read, parse, print, or otherwise inspect `.env` file contents. Any process output surfaced by failed Git/Bun commands must avoid adding extra environment-value logging.
- Repo verification commands for this initiative: `bun run typecheck`, `bun run lint:all`, `bun run test`, and `bun run build`.

## Branch and PR Plan

- Target repo: `mawm` (`/Users/michaelgreen/Documents/Projects/ai/maw-management/mawm`)
- Base branch: `main`
- Initiative branch: `initiative/git-url-workflow-sources`
- Branch creation rule: create the initiative branch from `main` only when implementation is ready to begin.
- Run commit rule: the completed run becomes one clean commit.
- PR rule: open a PR from the initiative branch to `main` after the run and initiative gates are complete.

## Execution Plan

### Run 1: Install and update workflows from Git URLs (`coding`)

- [ ] complete
- Run spec path: `.mawm/agents/initiatives/active/git-url-workflow-sources/runs/active/git-url-install-update/spec.md` (created by the assigned workflow when this run starts)
- Task: Add Git URL source support to the global workflow install/update path, then use the new support as the planned manual smoke path for reinstalling the `coding` workflow from `git@github.com:michaelgreenl/coding-workflow.git`.
- Current state: `src/cmd/surface/install.ts` treats `[workflow-or-path]` as a filesystem path by resolving it against `context.cwd`, then `stat`s it and rejects non-path inputs. It copies from the resolved local workflow root or dist directory into `~/.config/mawm/<workflow-id>/` and writes `absolutePath` to the global manifest. `src/utils/update/global.ts` requires `workflow.absolutePath`, verifies that local source exists, resolves metadata from that local path, then replaces the installed workflow. `src/config/workflow/manifest.ts` validates only `path` plus optional `absolutePath` as update source metadata. `test/cli/install.test.ts` and `test/cli/update.test.ts` cover local source paths only. `README.md` documents local `workflow-or-path` install/update behavior. The currently installed `coding` manifest entry points at `/Users/michaelgreen/Documents/Projects/ai/maw-management/workflows/coding/dist`, not at the requested Git URL.
- Outcome: `mawm install <git-url>` detects explicit Git URL inputs before path `stat`, clones the URL into a temp directory, prepares artifacts with the initiative-wide Git build contract, resolves workflow metadata from the prepared artifact root, installs into `~/.config/mawm/<workflow-id>/`, and writes Git source metadata to the manifest instead of `absolutePath`. `mawm update [workflow]` dispatches local-path entries through the existing path behavior and Git entries through the clone/build/install behavior. Updating all workflows handles mixed local and Git manifest entries and reports per-workflow failures without corrupting successful or untouched installs. README/help text and tests cover Git installs and Git-backed updates. Manual smoke can reinstall `coding` from `git@github.com:michaelgreenl/coding-workflow.git` and then update it from the recorded Git source.
- Scope: `src/cmd/surface/install.ts`, `src/utils/update/global.ts`, `src/config/workflow/manifest.ts`, a focused helper module for Git source detection/clone/build/install preparation if needed, tests under `test/cli/install.test.ts`, `test/cli/update.test.ts`, test support helpers for local temp Git repositories if needed, and README command/docs text for workflow installation and update sources.
- Out of scope: `execute-graph` behavior, workflow execution runtime layout, project-local `.mawm/agents` planning-asset behavior, package-registry or npm-style workflow source support, persistent Git checkout caches, credentials management, branch/tag selection flags, migration tooling for existing manifests beyond accepting the current `absolutePath` shape, and any direct edit to `~/.config/mawm/manifest.json` outside manual smoke.
- Contracts: Local path installs keep the existing `absolutePath` manifest contract. Git manifest entries record the original Git URL in top-level `gitUrl` and do not also record `absolutePath`. `readManifest` validates `gitUrl` as an optional string and rejects entries that contain both update source fields. `refreshManifest` can write either `absolutePath` or `gitUrl`, never both for one entry. Git clone/build happens in a temp directory and must succeed before the existing `~/.config/mawm/<workflow-id>/` directory is removed or overwritten. The installed artifact root for the coding workflow is expected to be its built `dist/` directory after `bun run build`. Tests must avoid network and private credentials by using local temporary Git repositories. CLI errors should clearly distinguish invalid filesystem paths, unsupported Git URL forms, Git clone failures, build failures, missing `langgraph.json`, invalid workflow metadata, and workflow id mismatches.
- Verification: `bun run typecheck`; `bun run lint:all`; `bun run test -- test/cli/install.test.ts test/cli/update.test.ts`; `bun run test`; `bun run build`.
- Smoke verification: `manual` - After the implementation is built/linked in the developer environment, HITL runs `mawm install git@github.com:michaelgreenl/coding-workflow.git`, confirms `mawm list` includes `coding`, confirms `~/.config/mawm/manifest.json` records the Git URL for `coding` rather than the old local `absolutePath`, runs `mawm update coding`, and confirms `~/.config/mawm/coding` still contains a valid installed workflow (`mawm.json`, `langgraph.json`, built graph artifact, and copied workflow assets as applicable). If desired, invoke `execute-graph` against `coding` from this repo afterward to confirm the globally installed workflow still starts with runtime state under `.mawm/logs/coding/`.

## Initiative Verification Gates

- The planned run is complete, verified, reviewed, smoke-tested, and committed.
- `bun run typecheck`, `bun run lint:all`, `bun run test`, and `bun run build` pass at the initiative head.
- Automated tests cover Git installs and Git-backed updates using local temporary Git repositories rather than the private GitHub URL.
- HITL manual smoke records the result of reinstalling and updating `coding` from `git@github.com:michaelgreenl/coding-workflow.git`.
- The manifest contract still supports existing local `absolutePath` entries and new `gitUrl` entries without ambiguous mixed-source records.
- PR from `initiative/git-url-workflow-sources` to `main` is opened with the implementation summary, verification evidence, and manual smoke result.

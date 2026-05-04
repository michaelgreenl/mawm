# Plan: Build-Time OpenCode Config Validation

## Goal

Validate generated `opencode.json` assets against the official OpenCode config schema before `tsc` runs, while also generating reusable local types and schemas from that same upstream source so the repo does not rely on hand-maintained config types.

## Outcome

After this work:

- the repo vendors the upstream OpenCode JSON Schema graph used for validation
- build scripts generate local TypeScript and Zod artifacts from the vendored schema
- every assembled OpenCode config is validated in a pre-build step
- agent-level config fragments are typed from generated artifacts instead of ad hoc object literals
- scaffolded `opencode.json` output is guaranteed to match the same schema used by validation

## Core Answer

Yes: if schema sync, code generation, and config validation all run before `tsc`, the repo can fail the build before compilation completes when an OpenCode config is invalid.

That only works cleanly if the pipeline is ordered like this:

1. sync upstream schema
2. generate local artifacts from that schema
3. assemble config objects
4. validate assembled config objects
5. run `tsc`

`tsc` itself is not the validator. The validator is a required pre-build stage that must exit non-zero on schema mismatch.

## Recommended Shape

Use a two-track system sourced from the same vendored schema graph:

1. authoritative validation with `ajv` against the vendored official JSON Schema
2. generated local developer artifacts for typed composition and local validation helpers

This keeps the actual pass/fail gate tied to the official schema while still giving the codebase generated, extendable types for pieces like `agent`, `permission`, and `command`.

## Source Of Truth

Primary schema:

- `https://opencode.ai/config.json`

Referenced external schemas must also be vendored, not ignored. The current config schema references at least:

- `https://models.dev/model-schema.json`

The implementation should fetch the root schema plus any external `$ref` targets it depends on and store them locally in a stable schema directory.

## Decisions

### 1. Vendor the schema graph into the repo

Do not fetch the schema fresh during every normal build.

Reason:

- builds stay deterministic
- CI does not depend on network availability
- generated files remain in lockstep with the exact schema revision used by validation

Recommended layout:

```text
schemas/
  opencode/
    config.schema.json
    model.schema.json
    manifest.json
```

`manifest.json` should record:

- source URL
- fetch timestamp
- upstream ETag or checksum if available
- local rewritten ref map

### 2. Generate code from the vendored schema, not from hand-written mirrors

The repo should not maintain a manual Zod schema for OpenCode config.

Instead, add a generator that reads the vendored schema graph and emits a generated TypeScript module with:

- `OpencodeConfigSchema`
- `AgentConfigSchema`
- `PermissionConfigSchema`
- `CommandConfigSchema`
- derived TS types for each exported schema

The generator may be custom and targeted to the actual schema patterns used by OpenCode. That is preferable to hand-maintained mirrors.

### 3. Keep `ajv` as the authoritative gate

Even if the generated Zod output is used locally, the final build gate should validate the assembled config with `ajv` against the vendored JSON Schema graph.

Reason:

- `ajv` validates the actual official schema format directly
- generated Zod output is a convenience layer, not the final authority
- this avoids subtle drift introduced by imperfect schema-to-Zod translation

### 4. Generate artifacts before `tsc`

The build pipeline should treat schema sync and code generation as required prerequisites.

Recommended script order:

```text
schema:sync -> schema:gen -> opencode:validate -> typecheck/build
```

## Implementation Phases

## Phase 1: Schema Sync

Add a script that fetches and vendors the upstream schema graph.

New script:

- `scripts/opencode/schema-sync.ts`

Responsibilities:

- fetch `https://opencode.ai/config.json`
- inspect external `$ref` values
- fetch required external schemas such as `https://models.dev/model-schema.json`
- rewrite remote refs to local schema paths for deterministic offline validation
- write schema files under `schemas/opencode/`
- write `manifest.json` describing the fetched graph

Important behavior:

- fail loudly on unreachable required refs
- do not silently replace unresolved refs with permissive placeholders
- preserve the original source URL in metadata comments or manifest

## Phase 2: Generated Artifacts

Add a generator that reads the vendored schema graph and emits a generated TS module.

New script:

- `scripts/opencode/schema-gen.ts`

Generated file:

- `src/opencode/schema.gen.ts`

Exports to generate:

- `OpencodeConfigSchema`
- `AgentConfigSchema`
- `PermissionConfigSchema`
- `CommandConfigSchema`
- `type OpencodeConfig`
- `type AgentConfig`
- `type PermissionConfig`
- `type CommandConfig`

Generator requirements:

- consume the vendored local schema graph, not the network
- support the OpenCode schema patterns actually used today
- preserve strictness where `additionalProperties: false` is present
- translate repeated `anyOf` permission patterns into equivalent Zod unions
- emit generated file banners stating the source schema and that manual edits are not allowed

If the generator cannot faithfully represent a specific branch of the schema as Zod, that limitation must be explicit in code comments and the `ajv` pass remains the authoritative final check.

## Phase 3: Validation Entry Point

Add a build-time validator for assembled config objects.

New script:

- `scripts/opencode/validate.ts`

Responsibilities:

- import or build the repo's final OpenCode config object
- validate it with `ajv` against the vendored schema graph
- optionally validate it with the generated `OpencodeConfigSchema` for better local errors
- print clear failure output including the failing path and constraint
- exit non-zero on any validation failure

Validation scope:

- final assembled config object
- optional per-node fragment validation during config assembly for earlier failure points

## Phase 4: Wire The Repo To Generated Types

Replace ad hoc OpenCode config objects with generated schema-derived types.

Targets already visible in the repo:

- `src/graph/nodes/planner/node.ts`
- `src/graph/nodes/manager/node.ts`
- `src/graph/nodes/coder/node.ts`
- `src/opencode/config.ts`
- `src/scaffold/index.ts`
- `src/scaffold/assets/opencode.json.ts`

Work in this phase:

1. type each node's `ocConf` from generated agent config artifacts
2. validate those fragments close to source if practical
3. assemble the final config object through a single `buildOpencodeConfig()` entry point
4. make scaffold generation use that same typed config path
5. remove the existing `TODO: validate against a opencode agent config schema` comments once replaced

## Phase 5: Fix Existing Repo Breakage Around Config Assembly

There are existing issues that need to be corrected while wiring this in:

### `src/opencode/config.ts`

Current issues:

- broken import path: `../../agent/nodes` does not exist in source
- undefined `agents` identifier in the assembled config object
- untyped mutable config assembly

Planned fix:

- point config assembly at the actual graph node source
- export a single typed config builder
- validate that builder's output in the pre-build step

### `src/scaffold/index.ts`

Current issues:

- references `workflowOpencodeSchema` but does not define it
- appears partially implemented around scaffold parsing

Planned fix:

- replace the missing schema with generated OpenCode-derived exports where appropriate
- keep scaffold-specific schema separate from raw OpenCode config if they represent different concerns

### `src/scaffold/assets/opencode.json.ts`

Current issue:

- empty file

Planned fix:

- make it either a generated asset template or remove it if the scaffold should emit serialized JSON from code instead of storing a static asset stub

## Phase 6: Script Integration

Update `package.json` so schema sync, generation, and validation run before build/typecheck.

Recommended scripts:

```json
{
  "schema:sync": "bun run scripts/opencode/schema-sync.ts",
  "schema:gen": "bun run scripts/opencode/schema-gen.ts",
  "opencode:validate": "bun run scripts/opencode/validate.ts",
  "opencode:prepare": "bun run schema:sync && bun run schema:gen",
  "typecheck": "bun run opencode:prepare && bun run opencode:validate && tsc --noEmit",
  "build": "bun run opencode:prepare && bun run opencode:validate && tsc"
}
```

Possible refinement:

- normal CI build uses vendored schemas only
- a separate maintenance command refreshes schemas when explicitly requested

If build speed becomes a problem, split refresh from generation:

- `schema:refresh` fetches upstream
- `schema:gen` regenerates from vendored files only
- `build` depends on `schema:gen` and `opencode:validate`, not `schema:refresh`

That keeps daily builds stable while still supporting upstream updates.

## Verification

The implementation is not complete until the following are demonstrated:

1. valid assembled config passes `ajv`
2. intentionally invalid assembled config fails the validator with a useful error
3. generated types are consumed by at least one node config and the root config builder
4. scaffold output path uses the same validated config source
5. `bun run typecheck` and `bun run build` both gate on config validation before `tsc`

Recommended verification commands:

- `bun run schema:gen`
- `bun run opencode:validate`
- `bun run typecheck`
- `bun run build`
- `bun run test`
- `bun run lint`

Acceptance check beyond a unit test:

- run the scaffold flow that emits `opencode.json`, then validate the emitted asset through the same pre-build validator path

## Risks

### Schema-to-Zod fidelity

The main risk in option C is imperfect schema-to-Zod translation.

Mitigation:

- keep `ajv` as the final authority
- vendor all referenced schemas
- make the generator targeted and explicit instead of hand-wavy or permissive

### Upstream schema changes

The upstream schema may add fields or change nested structures.

Mitigation:

- keep schema sync explicit and reviewable
- regenerate artifacts from the vendored schema graph
- fail generation if an unsupported schema pattern appears

### Build determinism

Fetching remote schemas inside normal builds makes CI flaky.

Mitigation:

- vendor schema inputs
- separate schema refresh from ordinary build validation

## Small, Safe Execution Order

When implementing, keep the work split into small PR-sized steps:

1. vendor schema sync scripts and files
2. generate `schema.gen.ts`
3. add build-time validator
4. fix config assembly path and node typing
5. wire scaffold output into the same validated path

## Final Position

Option C is viable here, with one constraint:

- the repo should treat generated Zod/types as derived convenience artifacts
- the actual build gate should still be `ajv` against the vendored official schema graph

That gives you the no-hand-maintained-drift property you want, while still letting the repo compose `agent`, `permission`, and related config pieces from generated local types before `tsc` runs.

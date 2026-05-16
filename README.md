<div align="center">

# MAWM

**Multi-Agent Workflow Management for project-level AI engineering workflows.**

[![npm: @mawm/cli](https://img.shields.io/npm/v/%40mawm%2Fcli?label=%40mawm%2Fcli&color=111827&labelColor=CB3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@mawm/cli)
[![npm: @mawm/utils](https://img.shields.io/npm/v/%40mawm%2Futils?label=%40mawm%2Futils&color=111827&labelColor=CB3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@mawm/utils)
[![Status](https://img.shields.io/badge/status-active_development-f59e0b)](#status)

</div>

MAWM packages repeatable, project-local agent workflows into a `.mawm/` workspace. The CLI scaffolds workflow state, installs bundled workflows, and runs interactive LangGraph flows that can attach OpenCode sessions when a workflow needs hands-on coding work.

## What It Provides

| Area          | Status   | Notes                                                                           |
| ------------- | -------- | ------------------------------------------------------------------------------- |
| `@mawm/cli`   | Active   | Scaffold `.mawm/`, install workflows, list workflows, and run workflow threads. |
| `@mawm/utils` | Active   | Shared LangGraph, OpenCode, prompt, plugin, and tool utilities.                 |
| Base workflow | Bundled  | A starter workflow shipped with the CLI as `base`.                              |
| Public API    | Evolving | Early development; expect contracts to tighten as workflows mature.             |

## Quick Start

Install the CLI globally:

```sh
npm install -g @mawm/cli
```

Initialize MAWM inside a project and run the bundled base workflow:

```sh
mawm init
mawm install base
mawm list
mawm run base
```

Or run it without a global install:

```sh
npx @mawm/cli init
npx @mawm/cli install base
npx @mawm/cli run base
```

Install the shared utilities package for workflow development:

```sh
npm install @mawm/utils
```

## Tech Stack

<p>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-111827?style=for-the-badge&logo=typescript&logoColor=white&labelColor=3178c6"></a>
  <a href="https://langchain-ai.github.io/langgraph/"><img alt="LangGraph" src="https://img.shields.io/badge/LangGraph-1.x-111827?style=for-the-badge&logo=langgraph&logoColor=0B1220&labelColor=7FC8FF"></a>
  <a href="https://opencode.ai/"><img alt="OpenCode" src="https://img.shields.io/badge/OpenCode-agent-4B4646?style=for-the-badge&labelColor=211E1E&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzEzMTAxMCIvPjxwYXRoIGQ9Ik0zMjAgMjI0djEyOEgxOTJWMjI0aDEyOFoiIGZpbGw9IiM1QTU4NTgiLz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zODQgNDE2SDEyOFY5NmgyNTZ2MzIwWk0zMjAgMTYwSDE5MnYxOTJoMTI4VjE2MFoiIGZpbGw9IiNmZmYiLz48L3N2Zz4%3D"></a>
  <a href="https://nodejs.org/"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-runtime-111827?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=5FA04E"></a>
  <a href="https://bun.sh/"><img alt="Bun" src="https://img.shields.io/badge/Bun-workspace_tooling-24292e?style=for-the-badge&logo=bun&logoColor=white&labelColor=000000"></a>
</p>

Built with TypeScript, LangGraph, LangChain Core, OpenCode integration, Node-compatible package outputs, and Bun workspace tooling.

## Development

```sh
bun install
bun run typecheck
bun run lint
```

## Status

MAWM is in active development. The direction is stable enough to explore, but workflow contracts and package APIs may change before the first stable release.

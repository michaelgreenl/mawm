<div align="center">

# MAWM 

[![npm: mawm](https://img.shields.io/npm/v/mawm?label=mawm&color=111827&labelColor=CB3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/mawm)
[![License](https://img.shields.io/badge/License-MIT_+_Commons_Clause-DBC897)](https://github.com/michaelgreenl/mawm?tab=License-1-ov-file)
[![Status](https://img.shields.io/badge/Status-Active_Development-f59e0b)](#status)

</div>

> Multi-Agent Workflow Management (MAWM) is a TypeScript CLI for packaging and installing LangGraph workflows with the purpose of agent execution and orchestration.

## What It Provides
  
| Area               | Notes                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Project workspace  | `mawm init` creates project-local workflow state under `.mawm/`.       |
| Workflow installs  | Install, list, update, and remove workflows globally or per project.   |
| Workflow templates | `mawm init -t base` and `mawm init -t initiative` scaffold workflows.  |
| Agent assets       | `mawm init -a opencode` copies bundled OpenCode agents and tools.      |

## Stack

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/docs/)
[![LangGraph](https://img.shields.io/badge/LangChain-7FC8FF?logo=langgraph&logoColor=0B1220)](https://docs.langchain.com/) 
[![Node](https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white)](https://nodejs.org/) 
[![OpenCode](https://img.shields.io/badge/OpenCode-Workflow_Orchestration-5A5A5A?labelColor=120F0F&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzEzMTAxMCIvPjxwYXRoIGQ9Ik0zMjAgMjI0djEyOEgxOTJWMjI0aDEyOFoiIGZpbGw9IiM1QTU4NTgiLz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zODQgNDE2SDEyOFY5NmgyNTZ2MzIwWk0zMjAgMTYwSDE5MnYxOTJoMTI4VjE2MFoiIGZpbGw9IiNmZmYiLz48L3N2Zz4%3D)](https://opencode.ai/docs)

## Quick Start

Install the CLI:

```sh
npm install -g mawm
```

Initialize MAWM inside a project:

```sh
mawm init
```

Or run it without a global install:

```sh
npx mawm init
```

Add the project initiative workspace when you want MAWM's project-local planning docs and templates:

```sh
mawm init -i
```

Install the bundled OpenCode agent assets into the current project:

```sh
mawm init -a opencode
```

Scaffold a new workflow package from a template:

```sh
mawm init -t base
mawm init -t initiative
```

## Workflow Management

MAWM separates reusable workflow installation from project-local workflow use.

Install a workflow into the user-level MAWM config from a workflow package or built workflow directory:

```sh
mawm install -g <workflow-or-path>
```

Install a globally available workflow into the current project:

```sh
mawm install <workflow-id>
```

List installed workflows:

```sh
mawm list
mawm list -g
```

Update or remove workflows:

```sh
mawm update [workflow-id]
mawm update -g [workflow-id]
mawm remove <workflow-id>
mawm remove -g <workflow-id>
```

## Command Reference

| Command                                           | Aliases | Purpose                                                                  |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `mawm init [-g] [-i] [-a <agent>] [-t [type]]`    |         | Initialize project state, user config, agent assets, or workflow templates. |
| `mawm install [-g] [workflow-or-path]`            | `i`     | Install workflows globally or into the current project.                  |
| `mawm list [-g]`                                  |         | List project-local or global workflows.                                  |
| `mawm update [-g] [workflow]`                     | `u`     | Reinstall one or all workflows from their source.                        |
| `mawm remove [-g] <workflow>`                     | `rm`    | Remove an installed workflow.                                            |

## Shipped Assets

The package ships the CLI plus assets copied into `dist/assets` during build:

- Project-local `.mawm` scaffolds for workflow manifests and initiative/adhoc planning docs.
- User-level MAWM config scaffold with an empty workflow manifest.
- OpenCode agent and tool assets, including workflow-runner and initiative-manager agents plus the `execute-graph` tool.
- `base` and `initiative` workflow templates built from shared LangGraph template assets.

The repository also includes `workflows/examples/coding` as a source example for a richer initiative workflow. It is not a CLI command and is not installed by `mawm init`.

## Running Workflows

Workflow execution is currently handled outside the top-level CLI. Generated workflow packages include LangGraph project files, and the bundled OpenCode assets include an `execute-graph` tool that can launch installed workflows when used by the relevant OpenCode agent.

## Status

MAWM is in active development and pre-release.

**Post-v0.1.0 Direction:**
- Running globally installed workflows with project-local customization.
- Expanding the root MAWM config into a broader hub for workflow and agent-development settings.
- Broader agentic-development integrations, including ClaudeCode and Codex support alongside OpenCode.
- Other improvements/fixes


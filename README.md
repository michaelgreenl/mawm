<div align="center">

# MAWM 

[![npm: @mawm/cli](https://img.shields.io/npm/v/%40mawm%2Fcli?label=%40mawm%2Fcli&color=CB3837&labelColor=5a5a5a&logo=npm&logoColor=white)](https://www.npmjs.com/package/@mawm/cli)
[![License](https://img.shields.io/badge/License-MIT_+_Commons_Clause-DBC897)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Active_Development-f59e0b)](#status)

</div>

> A TypeScript CLI for packaging, installing, and running LangGraph workflow templates with manifest-based distribution and bundled OpenCode execution assets.

## Quick Start

Install the package globally 

```sh
bun install -g @mawm/cli
```

Initialize `.mawm/` in target-project

```sh
mawm init    
```

Or run it without a global install:

```sh
bunx @mawm/cli init
```

Add the project initiative workspace when you want MAWM's project-local planning docs and templates:

```sh
mawm init -i
```

Refresh the managed planning templates, README files, and manifest later without overwriting your roadmap or active docs:

```sh
mawm update -i
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

MAWM installs workflows globally under `~/.config/mawm/<workflow>`. Project-local `.mawm/` is reserved for planning docs under `.mawm/agents/` and workflow runtime logs under `.mawm/logs/<workflow>/`.

Install a workflow package or built workflow directory into the user-level MAWM config:

```sh
mawm install [workflow-or-path]
```

List, reinstall, or remove globally installed workflows:

```sh
mawm list
mawm update [workflow]
mawm remove <workflow>
```

Manage project-local planning assets separately:

```sh
mawm init -i     # initialize .mawm/agents/
mawm update -i   # refresh managed planning assets
```

Use `mawm init -g` to initialize `~/.config/mawm/`; use `mawm init -g -a opencode` to install global OpenCode agent assets.

## Command Reference

```sh
# initialize project state, global config, agent assets, or workflow templates
mawm init [-g] [-i] [-a <agent>] [-t [type]]  

# install workflows into global user config
mawm [i, install] [workflow-or-path]      

# list globally installed workflows
mawm list                                 

# reinstall one or all globally installed workflows, or refresh project planning assets
mawm [u, update] [workflow] | -i          

# remove a globally installed workflow
mawm [rm, remove] <workflow>              
```

## Shipped Assets

The package ships the CLI plus assets copied into `dist/assets` during build:

- Project-local `.mawm` scaffolds for initiative and adhoc planning docs under `.mawm/agents/`.
- User-level MAWM config scaffold with an empty global workflow manifest.
- OpenCode agent and tool assets, including workflow-runner and mawma-manager agents plus the `execute-graph` tool.
- `base` and `initiative` workflow templates built from shared LangGraph template assets.

The repository also includes `workflows/examples/coding` as a source example for a richer initiative workflow. It is not a CLI command and is not installed by `mawm init`.

## Running Workflows

Workflow execution is currently handled outside the top-level CLI. Generated workflow packages include the `mawm.json` and `langgraph.json` files, and the bundled OpenCode assets include an `execute-graph` tool that runs globally installed workflows from `~/.config/mawm/<workflow>` while writing project-local runtime state under `<target-project>/.mawm/logs/<workflow>/`.

## Status

MAWM is in active development and pre-release.

**Current Direction:**
- Expanding the root MAWM config into a broader hub for workflow and agent-development settings.
- Broader agentic-development integrations, including ClaudeCode and Codex support alongside OpenCode.
- Other features, improvements, and fixes.

## Stack

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/docs/)
[![LangGraph](https://img.shields.io/badge/LangChain-7FC8FF?style=for-the-badge&logo=langchain&logoColor=0B1220)](https://docs.langchain.com/) 
[![Node](https://img.shields.io/badge/Node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/) 
[![OpenCode](https://img.shields.io/badge/OpenCode-Workflow_Orchestration-5A5A5A?style=for-the-badge&labelColor=120F0F&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzEzMTAxMCIvPjxwYXRoIGQ9Ik0zMjAgMjI0djEyOEgxOTJWMjI0aDEyOFoiIGZpbGw9IiM1QTU4NTgiLz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zODQgNDE2SDEyOFY5NmgyNTZ2MzIwWk0zMjAgMTYwSDE5MnYxOTJoMTI4VjE2MFoiIGZpbGw9IiNmZmYiLz48L3N2Zz4%3D)](https://opencode.ai/docs)
## License

MIT with Commons Clause — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE) for details.

The Commons Clause restriction applies specifically to AI/ML training use. For all other purposes, including commercial use, this project is effectively MIT licensed.

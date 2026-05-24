import { readdir, stat } from "node:fs/promises";
import type { InitiativeRun, InitiativeSpec } from "./planning-parser.js";
import type { WorkflowContext } from "./state.js";

const repoStateLines = async (dir: string) => {
    try {
        const info = await stat(dir);

        if (!info.isDirectory()) {
            return [`- Target repo path is not a directory: \`${dir}\``];
        }

        const entries = await readdir(dir);

        return [`- Target repo path: \`${dir}\``, `- Repo top-level entries: ${entries.length}`];
    } catch {
        return [`- Target repo path does not exist yet: \`${dir}\``];
    }
};

const lines = (value: string | undefined, fallback: readonly string[]) => {
    if (!value || value.trim().length === 0) {
        return [...fallback];
    }

    return value.split("\n");
};

const renderImplementationPlan = (run: InitiativeRun) => {
    return [
        `1. Re-read \`${run.runSpecPath ?? "the selected run entry"}\` alongside the target repository state before implementation begins.`,
        "2. Implement only the work described in this run spec and keep the diff inside scope.",
        "3. Run the listed verification commands and record the results in the implementation summary.",
        run.smokeMode === "manual"
            ? "4. Pause for manual smoke verification and resume the workflow only after a human confirms the result."
            : "4. Complete the headless smoke verification flow before promoting the run.",
    ].join("\n");
};

/** Render the markdown run spec for the selected initiative run. */
export const renderRunSpec = async (
    initiative: InitiativeSpec,
    run: InitiativeRun,
    context: WorkflowContext,
    runSpecPath: string,
): Promise<string> => {
    const state = await repoStateLines(context.targetRepoPath);
    const contracts = [initiative.contracts, run.contracts].filter(Boolean).join("\n\n").trim();
    const commands =
        run.verificationCommands?.map((value) => `- ${value}`).join("\n") ??
        "- Add verification commands before implementation proceeds.";
    const currentState = [
        ...lines(run.currentState, ["- The initiative spec did not include current-state notes."]),
        `- Initiative branch: \`${context.initiativeBranch}\``,
        ...state,
        `- Requested run spec path: \`${runSpecPath}\``,
        ...(run.runSpecPath && run.runSpecPath !== runSpecPath
            ? [`- Initiative spec run path: \`${run.runSpecPath}\``]
            : []),
    ].join("\n");
    const goal =
        run.outcome ??
        initiative.targetState ??
        "Define the intended run outcome before implementation proceeds.";
    const smokeMethod =
        run.smokeMethod ?? "Define the smoke verification method before implementation proceeds.";

    return `# Run Spec: ${run.title}

## Assigned Workflow

\`${run.workflow ?? "initiative-template"}\`

## Task

${run.task ?? "Fill in the run task before implementation proceeds."}

## Current State

${currentState}

## Goal (Run Outcome)

${goal}

## Scope

${run.scope ?? "- Scope is missing from the initiative spec."}

## Out of Scope

${run.outOfScope ?? "- No work outside the selected run entry."}

## Contracts

${contracts.length > 0 ? contracts : "- Keep the workflow template generic and initiative-run compatible."}

## Implementation Plan

${renderImplementationPlan(run)}

## Verification Commands

${commands}

## Smoke Verification

- Mode: \`${run.smokeMode ?? "manual"}\`
- Method: ${smokeMethod}
- Manual instructions, if needed: ${
        run.smokeMode === "manual"
            ? (run.smokeMethod ?? "Complete the manual smoke flow and record the result.")
            : "None."
    }

## Completion Gate

- TDD implementation is complete within scope.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes, or HITL confirms manual smoke instructions were completed.
- Run is ready to become one commit on the initiative branch.
`;
};

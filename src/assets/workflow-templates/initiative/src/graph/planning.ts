import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative } from "node:path";
import {
    listMissingRunFields,
    parseInitiative,
    selectInitiativeRun,
    type InitiativeRun,
} from "./planning-parser.js";
import { renderRunSpec } from "./planning-render.js";
import type { WorkflowContext, WorkflowState, WorkflowUpdate } from "./state.js";

/** Materialize the selected initiative run into a workflow-ready run spec file. */
export const materializeRunSpec = async (
    input: Pick<
        WorkflowState,
        "initiativeSpecPath" | "planningRevisionCount" | "runSpecPath" | "selectedRunLabel"
    >,
    context: WorkflowContext,
): Promise<WorkflowUpdate> => {
    const source = await readFile(input.initiativeSpecPath, "utf8");
    const initiative = parseInitiative(source);
    const run = selectInitiativeRun(initiative.runs, input.selectedRunLabel);
    const issues = run ? listMissingRunFields(run) : ["Selected Run"];
    const summary = run
        ? issues.length === 0
            ? `Generated run spec for ${run.title}.`
            : `Generated run spec for ${run.title}, but planning is blocked: ${issues.join(", ")}.`
        : `Planning is blocked: unable to resolve ${input.selectedRunLabel ?? "the selected run"}.`;
    const fallbackRun: InitiativeRun = {
        scope: "- Select a run entry from the initiative spec before implementation proceeds.",
        smokeMethod: "Pick a smoke verification method after selecting a run.",
        smokeMode: "manual",
        task: "Select a run entry from the initiative spec.",
        title: input.selectedRunLabel ?? "Unresolved run",
    };
    const doc = await renderRunSpec(
        initiative,
        run ?? fallbackRun,
        context,
        input.runSpecPath,
    );

    await mkdir(dirname(input.runSpecPath), { recursive: true });
    await writeFile(input.runSpecPath, doc);

    return {
        planningDecision: issues.length === 0 ? "accept" : "blocked",
        planningRevisionCount:
            issues.length === 0
                ? (input.planningRevisionCount ?? 0)
                : (input.planningRevisionCount ?? 0) + 1,
        planningRevisions:
            issues.length === 0
                ? undefined
                : `Complete the missing planning fields: ${issues.join(", ")}.`,
        planningSummary: summary,
        runSpecPath: input.runSpecPath,
        selectedRunLabel: run?.title ?? input.selectedRunLabel,
    };
};

/** Summarize a generated run spec path relative to the caller when possible. */
export const summarizeRunSpecPath = (from: string, to: string) => {
    const value = relative(dirname(from), to);
    return value.length > 0 ? value : to;
};

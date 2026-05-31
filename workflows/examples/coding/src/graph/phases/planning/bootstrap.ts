import type { Runtime } from "@langchain/langgraph";
import { mergeOpenCodeCursors } from "../../../integrations/opencode/memory.js";
import { instructionMessage } from "../../../shared/messages.js";
import { requireRuntimeContextValue } from "../../../shared/runtime-context.js";
import type { WorkflowContext, WorkflowState } from "../../state.js";

/**
 * Seeds the planner with the inputs needed to author the run spec.
 *
 * @param state - Current workflow state.
 * @param runtime - LangGraph runtime with workflow context.
 * @returns The initial planning update for the planner.
 */
export const bootstrapPlanner = (state: WorkflowState, runtime: Runtime<WorkflowContext>) => {
    const targetRepoPath = requireRuntimeContextValue(runtime, "targetRepoPath");
    const initiativeBranch = requireRuntimeContextValue(runtime, "initiativeBranch");
    const selectedRun = state.selectedRunLabel
        ? `Selected run label: ${state.selectedRunLabel}`
        : "Selected run label: not provided";

    return {
        messages: [
            instructionMessage(
                "planning-brief",
                [
                    "Create or rewrite the implementation-ready run spec for this run.",
                    `Initiative spec path: ${state.initiativeSpecPath}`,
                    `Run spec path: ${state.runSpecPath}`,
                    selectedRun,
                    `Target repository: ${targetRepoPath}`,
                    `Initiative branch: ${initiativeBranch}`,
                    "Read current code as needed, then write the run spec using the MAWM run-spec template shape.",
                    "Do not implement code.",
                ].join("\n"),
            ),
        ],
        opencode: mergeOpenCodeCursors(state.opencode, {
            planner: state.messages.length,
            "plan-reviewer": state.messages.length + 1,
        }),
        planningDecision: undefined,
        planningRevisionCount: 0,
        planningRevisions: undefined,
        planningSummary: undefined,
    };
};

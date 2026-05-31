import type { Runtime } from "@langchain/langgraph";
import { mergeOpenCodeCursors } from "../../../integrations/opencode/memory.js";
import { instructionMessage } from "../../../shared/messages.js";
import { requireRuntimeContextValue } from "../../../shared/runtime-context.js";
import type { WorkflowContext, WorkflowState } from "../../state.js";

/**
 * Seeds the coder with the approved run spec and any reviewer feedback.
 *
 * @param state - Current workflow state.
 * @param runtime - LangGraph runtime with workflow context.
 * @returns The initial implementation update for the coder.
 */
export const bootstrapCoder = (state: WorkflowState, runtime: Runtime<WorkflowContext>) => {
    const targetRepoPath = requireRuntimeContextValue(runtime, "targetRepoPath");
    const initiativeBranch = requireRuntimeContextValue(runtime, "initiativeBranch");
    const selectedRun = state.selectedRunLabel
        ? `Selected run label: ${state.selectedRunLabel}`
        : "Selected run label: not provided";
    const reviewerFeedback = state.implementationRevisions
        ? `Reviewer feedback to address:\n\n${state.implementationRevisions}`
        : undefined;

    return {
        implementationDecision: undefined,
        implementationSummary: undefined,
        manualSmokeInstructions: undefined,
        messages: [
            instructionMessage(
                "implementation-brief",
                [
                    "Implement the approved run spec and keep the change set inside scope.",
                    `Run spec path: ${state.runSpecPath}`,
                    selectedRun,
                    `Target repository: ${targetRepoPath}`,
                    `Initiative branch: ${initiativeBranch}`,
                    "Run the verification commands listed in the run spec and include evidence in your response.",
                    reviewerFeedback,
                ]
                    .filter((line): line is string => typeof line === "string" && line.length > 0)
                    .join("\n\n"),
            ),
        ],
        opencode: mergeOpenCodeCursors(state.opencode, {
            coder: state.messages.length,
            "code-reviewer": state.messages.length + 1,
        }),
    };
};

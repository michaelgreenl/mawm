import { Command, END } from "@langchain/langgraph";
import type { Runtime } from "@langchain/langgraph";
import { normalizePlanningReview } from "../review/planning.js";
import { parseReviewPayload } from "../review/parse.js";
import { requireRuntimeContextValue } from "../../shared/runtime-context.js";
import { type WorkflowContext, type WorkflowState } from "../state.js";
import { buildCursorMemory, getLastAgentReply, instructionMessage } from "../support.js";

const MAX_PLANNING_REVISIONS = 3;

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
        opencode: buildCursorMemory(state.opencode, {
            planner: state.messages.length,
            "plan-reviewer": state.messages.length + 1,
        }),
        planningDecision: undefined,
        planningRevisionCount: 0,
        planningRevisions: undefined,
        planningSummary: undefined,
    };
};

/**
 * Parses the latest plan review response into workflow state updates.
 *
 * @param state - Current workflow state.
 * @returns The normalized planning review update.
 */
export const parsePlanReview = (state: WorkflowState) => {
    const reply = getLastAgentReply(state.messages, "plan-reviewer");

    if (!reply) {
        throw new Error("Plan reviewer did not return a review payload.");
    }

    const review = normalizePlanningReview(
        parseReviewPayload(reply),
        state.planningRevisionCount,
        MAX_PLANNING_REVISIONS,
    );

    if (review.decision !== "revise") {
        return {
            planningDecision: review.decision,
            planningRevisionCount: review.revisionCount,
            planningRevisions: review.revisions,
            planningSummary: review.summary,
        };
    }

    return {
        messages: [
            instructionMessage(
                "plan-review-feedback",
                [
                    `Revise the run spec at ${state.runSpecPath}.`,
                    review.revisions ?? review.summary ?? "The reviewer requested another pass.",
                ].join("\n\n"),
            ),
        ],
        opencode: buildCursorMemory(state.opencode, {
            planner: state.messages.length,
            "plan-reviewer": state.messages.length + 1,
        }),
        planningDecision: review.decision,
        planningRevisionCount: review.revisionCount,
        planningRevisions: review.revisions,
        planningSummary: review.summary,
    };
};

/**
 * Routes the planning subgraph based on the latest review decision.
 *
 * @param state - Current workflow state.
 * @returns A command directing the next node.
 */
export const routePlanning = (state: WorkflowState) => {
    return new Command({
        goto: state.planningDecision === "revise" ? "planner" : END,
    });
};

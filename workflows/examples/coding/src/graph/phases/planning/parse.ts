import { mergeOpenCodeCursors } from "../../../integrations/opencode/memory.js";
import { getLastAgentReply, instructionMessage } from "../../../shared/messages.js";
import { parseReviewPayload } from "../../review/payload.js";
import type { WorkflowState } from "../../state.js";
import { normalizePlanningReview } from "./decision.js";

const MAX_PLANNING_REVISIONS = 3;

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
        opencode: mergeOpenCodeCursors(state.opencode, {
            planner: state.messages.length,
            "plan-reviewer": state.messages.length + 1,
        }),
        planningDecision: review.decision,
        planningRevisionCount: review.revisionCount,
        planningRevisions: review.revisions,
        planningSummary: review.summary,
    };
};

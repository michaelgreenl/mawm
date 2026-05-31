import { mergeOpenCodeCursors } from "../../../integrations/opencode/memory.js";
import { getLastAgentReply, instructionMessage } from "../../../shared/messages.js";
import { parseReviewPayload } from "../../review/payload.js";
import type { WorkflowState } from "../../state.js";
import { normalizeImplementationReview } from "./decision.js";

const MAX_IMPLEMENTATION_REVISIONS = 3;

/**
 * Parses the latest code review response into workflow state updates.
 *
 * @param state - Current workflow state.
 * @returns The normalized implementation review update.
 */
export const parseCodeReview = (state: WorkflowState) => {
    const reply = getLastAgentReply(state.messages, "code-reviewer");

    if (!reply) {
        throw new Error("Code reviewer did not return a review payload.");
    }

    const review = normalizeImplementationReview(
        parseReviewPayload(reply),
        state.implementationRevisionCount,
        MAX_IMPLEMENTATION_REVISIONS,
    );

    if (review.decision !== "revise") {
        return {
            implementationDecision: review.decision,
            implementationRevisionCount: review.revisionCount,
            implementationRevisions: review.revisions,
            implementationSummary: review.summary,
            manualSmokeInstructions: review.manualSmokeInstructions,
            verificationSummary: review.verificationSummary,
        };
    }

    return {
        implementationDecision: review.decision,
        implementationRevisionCount: review.revisionCount,
        implementationRevisions: review.revisions,
        implementationSummary: review.summary,
        manualSmokeInstructions: undefined,
        messages: [
            instructionMessage(
                "code-review-feedback",
                [
                    `Revise the implementation for ${state.runSpecPath}.`,
                    review.revisions ?? review.summary ?? "The reviewer requested another pass.",
                ].join("\n\n"),
            ),
        ],
        opencode: mergeOpenCodeCursors(state.opencode, {
            coder: state.messages.length,
            "code-reviewer": state.messages.length + 1,
        }),
        verificationSummary: review.verificationSummary,
    };
};

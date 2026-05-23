import { Command, END } from "@langchain/langgraph";
import type { Runtime } from "@langchain/langgraph";
import { normalizeImplementationReview } from "../review/implementation.js";
import { parseReviewPayload } from "../review/parse.js";
import { requireRuntimeContextValue } from "../../shared/runtime-context.js";
import { type WorkflowContext, type WorkflowState } from "../state.js";
import { buildCursorMemory, getLastAgentReply, instructionMessage } from "../support.js";

const MAX_IMPLEMENTATION_REVISIONS = 3;

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
        opencode: buildCursorMemory(state.opencode, {
            coder: state.messages.length,
            "code-reviewer": state.messages.length + 1,
        }),
    };
};

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
        opencode: buildCursorMemory(state.opencode, {
            coder: state.messages.length,
            "code-reviewer": state.messages.length + 1,
        }),
        verificationSummary: review.verificationSummary,
    };
};

/**
 * Routes the implementation subgraph based on the latest review decision.
 *
 * @param state - Current workflow state.
 * @returns A command directing the next node.
 */
export const routeImplementation = (state: WorkflowState) => {
    return new Command({
        goto: state.implementationDecision === "revise" ? "coder" : END,
    });
};

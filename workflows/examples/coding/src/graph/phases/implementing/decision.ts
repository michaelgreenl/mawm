import type { ImplementationReviewResult, ReviewPayload } from "../../review/types.js";

/**
 * Normalizes an implementation review decision and applies revision limits.
 *
 * @param payload - Parsed reviewer payload.
 * @param revisionCount - Current implementation revision count.
 * @param maxRevisionCount - Maximum allowed implementation revisions.
 * @returns The normalized implementation review result.
 */
export const normalizeImplementationReview = (
    payload: ReviewPayload,
    revisionCount: number,
    maxRevisionCount: number,
): ImplementationReviewResult => {
    if (payload.decision === "accept") {
        return {
            decision: "accept",
            manualSmokeInstructions: undefined,
            revisions: payload.revisions,
            revisionCount,
            summary: payload.summary,
            verificationSummary: payload.verificationSummary,
        };
    }

    if (payload.decision === "blocked") {
        return {
            decision: "blocked",
            manualSmokeInstructions: undefined,
            revisions: payload.revisions,
            revisionCount,
            summary: payload.summary ?? "Code reviewer blocked the implementation.",
            verificationSummary: payload.verificationSummary,
        };
    }

    if (payload.decision === "manual_smoke") {
        if (!payload.manualSmokeInstructions) {
            return {
                decision: "blocked",
                manualSmokeInstructions: undefined,
                revisionCount,
                summary: "Code reviewer requested manual_smoke without manualSmokeInstructions.",
                verificationSummary: payload.verificationSummary,
            };
        }

        return {
            decision: "manual_smoke",
            manualSmokeInstructions: payload.manualSmokeInstructions,
            revisions: payload.revisions,
            revisionCount,
            summary: payload.summary ?? "Code reviewer requested manual smoke verification.",
            verificationSummary: payload.verificationSummary,
        };
    }

    if (payload.decision === "revise") {
        const nextRevisionCount = revisionCount + 1;

        if (nextRevisionCount >= maxRevisionCount) {
            return {
                decision: "blocked",
                manualSmokeInstructions: undefined,
                revisions: payload.revisions,
                revisionCount: nextRevisionCount,
                summary: `Implementation reached the maximum number of revision attempts (${maxRevisionCount}).`,
                verificationSummary: payload.verificationSummary,
            };
        }

        return {
            decision: "revise",
            manualSmokeInstructions: undefined,
            revisions: payload.revisions,
            revisionCount: nextRevisionCount,
            summary: payload.summary ?? "Code reviewer requested revisions.",
            verificationSummary: payload.verificationSummary,
        };
    }

    return {
        decision: "blocked",
        manualSmokeInstructions: undefined,
        revisionCount,
        summary: "Code reviewer returned an invalid decision.",
        verificationSummary: payload.verificationSummary,
    };
};

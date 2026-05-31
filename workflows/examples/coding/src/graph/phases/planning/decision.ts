import type { PlanningReviewResult, ReviewPayload } from "../../review/types.js";

/**
 * Normalizes a planning review decision and applies revision limits.
 *
 * @param payload - Parsed reviewer payload.
 * @param revisionCount - Current planning revision count.
 * @param maxRevisionCount - Maximum allowed planning revisions.
 * @returns The normalized planning review result.
 */
export const normalizePlanningReview = (
    payload: ReviewPayload,
    revisionCount: number,
    maxRevisionCount: number,
): PlanningReviewResult => {
    if (payload.decision === "accept") {
        return {
            decision: "accept",
            revisions: payload.revisions,
            revisionCount,
            summary: payload.summary,
        };
    }

    if (payload.decision === "blocked") {
        return {
            decision: "blocked",
            revisions: payload.revisions,
            revisionCount,
            summary: payload.summary ?? "Plan reviewer blocked the run spec.",
        };
    }

    if (payload.decision === "revise") {
        const nextRevisionCount = revisionCount + 1;

        if (nextRevisionCount >= maxRevisionCount) {
            return {
                decision: "blocked",
                revisions: payload.revisions,
                revisionCount: nextRevisionCount,
                summary: `Planner reached the maximum number of revision attempts (${maxRevisionCount}).`,
            };
        }

        return {
            decision: "revise",
            revisions: payload.revisions,
            revisionCount: nextRevisionCount,
            summary: payload.summary ?? "Plan reviewer requested revisions.",
        };
    }

    return {
        decision: "blocked",
        revisionCount,
        summary: "Plan reviewer returned an invalid decision.",
    };
};

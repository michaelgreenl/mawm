import { describe, expect, test } from "bun:test";
import { normalizeImplementationReview } from "../src/graph/review/implementation.ts";
import { parseReviewPayload } from "../src/graph/review/parse.ts";
import {
    normalizePlanningReview,
} from "../src/graph/review/planning.ts";

describe("review helpers", () => {
    test("parses a fenced JSON review block", () => {
        expect(
            parseReviewPayload([
                "Review result:",
                "```json",
                '{"decision":"accept","summary":"ready"}',
                "```",
            ].join("\n")),
        ).toEqual({
            decision: "accept",
            summary: "ready",
        });
    });

    test("parses the last valid JSON object from a mixed review response", () => {
        expect(
            parseReviewPayload([
                "First attempt:",
                "```json",
                "[]",
                "```",
                "Final result:",
                "```json",
                '{"decision":"blocked","summary":"Missing contracts section."}',
                "```",
            ].join("\n")),
        ).toEqual({
            decision: "blocked",
            summary: "Missing contracts section.",
        });
    });

    test("blocks planning after the max revision count", () => {
        expect(
            normalizePlanningReview(
                {
                    decision: "revise",
                    revisions: "Tighten the contracts section.",
                    summary: "Needs one more pass.",
                },
                2,
                3,
            ),
        ).toEqual({
            decision: "blocked",
            revisions: "Tighten the contracts section.",
            revisionCount: 3,
            summary: "Planner reached the maximum number of revision attempts (3).",
        });
    });

    test("rejects manual smoke requests without instructions", () => {
        expect(
            normalizeImplementationReview(
                {
                    decision: "manual_smoke",
                    summary: "Needs a quick human check.",
                },
                0,
                3,
            ),
        ).toEqual({
            decision: "blocked",
            revisionCount: 0,
            summary:
                "Code reviewer requested manual_smoke without manualSmokeInstructions.",
        });
    });

    test("keeps manual smoke instructions when they are present", () => {
        expect(
            normalizeImplementationReview(
                {
                    decision: "manual_smoke",
                    manualSmokeInstructions: "Open the settings page and confirm the save banner.",
                    summary: "Needs a quick human check.",
                    verificationSummary: "bun test passed",
                },
                1,
                3,
            ),
        ).toEqual({
            decision: "manual_smoke",
            manualSmokeInstructions: "Open the settings page and confirm the save banner.",
            revisionCount: 1,
            summary: "Needs a quick human check.",
            verificationSummary: "bun test passed",
        });
    });

    test("blocks invalid planning decisions", () => {
        expect(
            normalizePlanningReview(
                {
                    decision: "ship_it",
                    summary: "LGTM",
                },
                0,
                3,
            ),
        ).toEqual({
            decision: "blocked",
            revisionCount: 0,
            summary: "Plan reviewer returned an invalid decision.",
        });
    });
});

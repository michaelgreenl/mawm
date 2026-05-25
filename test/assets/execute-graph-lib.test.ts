import { describe, expect, test } from "vitest";
import * as lib from "../../src/assets/.config/agents/opencode/tools/execute-graph-lib.ts";
import {
    DEFAULT_AGENT_SERVER_URL,
    buildRunPayload,
    extractAgentServerUrl,
    readAssistantIDs,
    resolveAssistantID,
    summarizeRunResult,
} from "../../src/assets/.config/agents/opencode/tools/execute-graph-lib.ts";

describe("execute-graph helper library", () => {
    test("reads assistant ids from langgraph config", () => {
        expect(
            readAssistantIDs(
                JSON.stringify({
                    graphs: {
                        coding: "./dist/graph.js:graph",
                        reviewer: "./dist/reviewer.js:graph",
                    },
                }),
            ),
        ).toEqual(["coding", "reviewer"]);
    });

    test("throws when assistant id is omitted for multi-graph configs", () => {
        expect(() => resolveAssistantID(["coding", "reviewer"])).toThrow(
            "Multiple assistants are defined in langgraph.json. Pass assistantID explicitly.",
        );
    });

    test("extracts the agent server url from startup logs", () => {
        expect(
            extractAgentServerUrl(
                "Booting...\nAPI server listening on http://127.0.0.1:2024\nReady.\n",
            ),
        ).toBe("http://127.0.0.1:2024");
        expect(extractAgentServerUrl("no url here")).toBe(DEFAULT_AGENT_SERVER_URL);
    });

    test("builds resume payloads with a command wrapper", () => {
        expect(buildRunPayload({ resume: { decision: "confirmed" } })).toEqual({
            command: { resume: { decision: "confirmed" } },
            input: null,
        });
    });

    test("merges tool session context into the workflow runtime context", () => {
        expect(
            lib.resolveRunContext?.(
                {
                    initiativeBranch: "feature/run-1",
                },
                {
                    directory: "/repo/from-directory",
                    sessionID: "session-123",
                    worktree: "/repo/from-worktree",
                },
            ),
        ).toEqual({
            initiativeBranch: "feature/run-1",
            parentSessionID: "session-123",
            targetRepoPath: "/repo/from-worktree",
        });
    });

    test("summarizes interrupted workflow responses", () => {
        expect(
            summarizeRunResult({
                runSpecPath: ".mawm/runs/demo/spec.md",
                planningSummary: "Planning blocked.",
                __interrupt__: [
                    {
                        value: {
                            kind: "planning_blocked",
                            summary: "Planning blocked.",
                        },
                    },
                ],
            }),
        ).toEqual({
            interrupt: {
                kind: "planning_blocked",
                summary: "Planning blocked.",
            },
            runSpecPath: ".mawm/runs/demo/spec.md",
            status: "interrupted",
            summary: "Planning blocked.",
        });
    });

    test("prefers a top-level summary for completed standalone responses", () => {
        expect(
            summarizeRunResult({
                finalStatus: "completed",
                implementationSummary: "Legacy implementation summary.",
                planningSummary: "Legacy planning summary.",
                summary: "Standalone workflow completed.",
            }),
        ).toEqual({
            runSpecPath: undefined,
            status: "completed",
            summary: "Standalone workflow completed.",
        });
    });

    test("prefers a top-level summary for interrupted standalone responses when the interrupt has none", () => {
        expect(
            summarizeRunResult({
                implementationSummary: "Legacy implementation summary.",
                summary: "Standalone workflow paused.",
                __interrupt__: [
                    {
                        value: {
                            kind: "awaiting_input",
                        },
                    },
                ],
            }),
        ).toEqual({
            interrupt: {
                kind: "awaiting_input",
            },
            runSpecPath: undefined,
            status: "interrupted",
            summary: "Standalone workflow paused.",
        });
    });

    test("falls back to initiative summaries when no standalone summary exists", () => {
        expect(
            summarizeRunResult({
                finalStatus: "completed",
                implementationSummary: "Implemented the approved run.",
                planningSummary: "Planned the approved run.",
            }),
        ).toEqual({
            runSpecPath: undefined,
            status: "completed",
            summary: "Implemented the approved run.",
        });
    });
});

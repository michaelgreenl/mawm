import { homedir } from "node:os";
import { describe, expect, test } from "vitest";
import {
    DEFAULT_AGENT_SERVER_URL,
    buildRunPayload,
    extractAgentServerUrl,
    normalizeLangGraphConfig,
    readAssistantIDs,
    resolveAssistantID,
    resolveGlobalWorkflowRoot,
    resolveHomeDirectory,
    resolveProjectRoot,
    resolveRunContext,
    resolveWorkflowRuntimeDir,
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
        expect(extractAgentServerUrl("Booting...\nAPI: http://localhost:50384\nReady.\n")).toBe(
            "http://localhost:50384",
        );
        expect(extractAgentServerUrl("no url here")).toBe(DEFAULT_AGENT_SERVER_URL);
        expect(
            extractAgentServerUrl(
                "npm install output\nhttps://github.com/some/pkg\nhttp://localhost:50384\nhttps://github.com/other/pkg\n",
            ),
        ).toBe("http://localhost:50384");
        expect(extractAgentServerUrl("only https://github.com/some/pkg here\n")).toBe(
            DEFAULT_AGENT_SERVER_URL,
        );
    });

    test("builds resume payloads with a command wrapper", () => {
        expect(buildRunPayload({ resume: { decision: "confirmed" } })).toEqual({
            command: { resume: { decision: "confirmed" } },
            input: null,
        });
    });

    test("defaults new runs to an empty input object", () => {
        expect(buildRunPayload({})).toEqual({
            input: {},
        });
    });

    test("resolves the home directory using the documented precedence", () => {
        expect(
            resolveHomeDirectory({
                HOME: "/home/demo",
                HOMEDRIVE: "C:",
                HOMEPATH: "\\Users\\demo",
                USERPROFILE: "/profile/demo",
            }),
        ).toBe("/home/demo");

        expect(
            resolveHomeDirectory({
                HOMEDRIVE: "C:",
                HOMEPATH: "\\Users\\demo",
                USERPROFILE: "/profile/demo",
            }),
        ).toBe("/profile/demo");

        expect(
            resolveHomeDirectory({
                HOMEDRIVE: "C:",
                HOMEPATH: "\\Users\\demo",
            }),
        ).toBe("C:\\Users\\demo");

        expect(resolveHomeDirectory({})).toBe(homedir());
    });

    test("resolves the global workflow root from the MAWM config directory", () => {
        expect(resolveGlobalWorkflowRoot({ HOME: "/home/demo" }, "coding")).toBe(
            "/home/demo/.config/mawm/coding",
        );
    });

    test("prefers the worktree when resolving the target project root", () => {
        expect(
            resolveProjectRoot({
                directory: "/repo/from-directory",
                worktree: "/repo/from-worktree",
            }),
        ).toBe("/repo/from-worktree");
        expect(
            resolveProjectRoot({
                directory: "/repo/from-directory",
            }),
        ).toBe("/repo/from-directory");
    });

    test("throws when the target project root is missing from tool context", () => {
        expect(() => resolveProjectRoot({})).toThrow(
            "Unable to resolve a target project path from tool context.",
        );
    });

    test("constructs the per-project workflow runtime directory", () => {
        expect(resolveWorkflowRuntimeDir("/repo/demo", "coding")).toBe(
            "/repo/demo/.mawm/logs/coding",
        );
    });

    test("merges tool session context into the workflow runtime context", () => {
        expect(
            resolveRunContext(
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

    test("normalizes supported LangGraph config paths against the global workflow root", () => {
        expect(
            normalizeLangGraphConfig(
                JSON.stringify({
                    auth: {
                        mode: "token",
                        path: "./auth.ts:auth",
                    },
                    env: ".env",
                    graphs: {
                        agent: "./graph.ts:graph",
                        reviewer: {
                            path: "./reviewer.ts:graph",
                            retries: 2,
                        },
                    },
                    http: {
                        app: "./server.ts:app",
                        host: "127.0.0.1",
                    },
                    keep: {
                        nested: true,
                    },
                    node_version: "20",
                    ui: {
                        detail: "./ui/detail.tsx:render",
                        main: "./ui/main.tsx",
                    },
                }),
                "/tmp/workflow",
            ),
        ).toEqual({
            auth: {
                mode: "token",
                path: "/tmp/workflow/auth.ts:auth",
            },
            env: "/tmp/workflow/.env",
            graphs: {
                agent: "/tmp/workflow/graph.ts:graph",
                reviewer: {
                    path: "/tmp/workflow/reviewer.ts:graph",
                    retries: 2,
                },
            },
            http: {
                app: "/tmp/workflow/server.ts:app",
                host: "127.0.0.1",
            },
            keep: {
                nested: true,
            },
            node_version: "20",
            ui: {
                detail: "/tmp/workflow/ui/detail.tsx:render",
                main: "/tmp/workflow/ui/main.tsx",
            },
        });
    });

    test("rejects unsupported graph path config shapes", () => {
        expect(() =>
            normalizeLangGraphConfig(
                JSON.stringify({
                    graphs: {
                        agent: {
                            path: ["./graph.ts:graph"],
                        },
                    },
                }),
                "/tmp/workflow",
            ),
        ).toThrow("Unsupported LangGraph config at `graphs.agent.path`: expected a string path.");
    });

    test("rejects unsupported env config shapes", () => {
        expect(() =>
            normalizeLangGraphConfig(
                JSON.stringify({
                    env: {
                        path: ".env",
                    },
                    graphs: {
                        agent: "./graph.ts:graph",
                    },
                }),
                "/tmp/workflow",
            ),
        ).toThrow("Unsupported LangGraph config at `env`: expected a string path.");
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

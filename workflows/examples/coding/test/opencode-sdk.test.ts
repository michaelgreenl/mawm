import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { describe, expect, mock, test } from "bun:test";

/**
 * Mocks OpenCode session creation responses.
 *
 * @returns A resolved session identifier payload.
 */
const sessionCreate = mock(() =>
    Promise.resolve({
        id: "session-1",
    }),
);

/**
 * Mocks OpenCode prompt responses.
 *
 * @returns A resolved assistant reply payload.
 */
const sessionPrompt = mock(() =>
    Promise.resolve({
        info: {
            cost: undefined,
            error: undefined,
            finish: undefined,
            id: "reply-1",
            modelID: undefined,
            providerID: undefined,
            tokens: undefined,
        },
        parts: [{ text: "done" }],
    }),
);

/**
 * Mocks OpenCode session message snapshots.
 *
 * @returns An empty message list.
 */
const sessionMessages = mock(() => Promise.resolve([]));

/**
 * Mocks OpenCode session status snapshots.
 *
 * @returns An empty session status map.
 */
const sessionStatus = mock(() => Promise.resolve({}));

/**
 * Clears SDK-facing mocks between tests.
 */
const resetSdkMocks = () => {
    createClient.mockClear();
    createServer.mockClear();
    sessionCreate.mockClear();
    sessionMessages.mockClear();
    sessionPrompt.mockClear();
    sessionStatus.mockClear();
};

/**
 * Mocks the SDK client factory.
 *
 * @param cfg - Client configuration passed by the node.
 * @returns A mock client exposing session methods.
 */
const createClient = mock((cfg: unknown) => {
    return {
        cfg,
        session: {
            create: sessionCreate,
            messages: sessionMessages,
            prompt: sessionPrompt,
            status: sessionStatus,
        },
    };
});

/**
 * Mocks the embedded OpenCode server factory.
 *
 * @returns A resolved mock server descriptor.
 */
const createServer = mock(() =>
    Promise.resolve({
        close: () => {},
        url: "http://127.0.0.1:4097",
    }),
);

mock.module("@opencode-ai/sdk", () => ({
    createOpencodeClient: createClient,
    createOpencodeServer: createServer,
}));

const { createOpenCodeNode } = await import("../src/integrations/opencode/node.ts");

describe("OpenCode SDK node", () => {
    test("adds auth headers when using the shared server", async () => {
        resetSdkMocks();

        const node = createOpenCodeNode(
            "planner",
            {},
            {
                authHeader: "Basic test-token",
            },
        );

        await node(
            {
                messages: [new HumanMessage({ content: "Plan this run." })],
            },
            {
                context: {
                    opencodeBaseUrl: "http://127.0.0.1:4096",
                    targetRepoPath: "/repo",
                },
            },
        );

        expect(createClient).toHaveBeenCalledWith({
            baseUrl: "http://127.0.0.1:4096",
            directory: "/repo",
            headers: {
                Authorization: "Basic test-token",
            },
        });
        expect(createServer).not.toHaveBeenCalled();
    });

    test("adds auth headers when starting an embedded server", async () => {
        resetSdkMocks();

        const previousFetch = globalThis.fetch;
        globalThis.fetch = mock(() => Promise.reject(new Error("unreachable"))) as typeof fetch;

        try {
            const node = createOpenCodeNode(
                "planner",
                {},
                {
                    authHeader: "Basic test-token",
                    directory: "/repo",
                },
            );

            await node({
                messages: [new HumanMessage({ content: "Plan this run." })],
            });

            expect(createServer).toHaveBeenCalledTimes(1);
            expect(createClient).toHaveBeenCalledWith({
                baseUrl: "http://127.0.0.1:4097",
                directory: "/repo",
                headers: {
                    Authorization: "Basic test-token",
                },
            });
        } finally {
            globalThis.fetch = previousFetch;
        }
    });

    test("uses a random free port when starting an embedded server by default", async () => {
        resetSdkMocks();

        const previousFetch = globalThis.fetch;
        globalThis.fetch = mock(() => Promise.reject(new Error("unreachable"))) as typeof fetch;

        try {
            const node = createOpenCodeNode(
                "planner",
                {},
                {
                    directory: "/repo",
                },
            );

            await node({
                messages: [new HumanMessage({ content: "Plan this run." })],
            });

            expect(createServer).toHaveBeenCalledWith(
                expect.objectContaining({
                    port: 0,
                }),
            );
        } finally {
            globalThis.fetch = previousFetch;
        }
    });

    test("accepts direct responseStyle data payloads from the SDK", async () => {
        resetSdkMocks();

        const node = createOpenCodeNode(
            "planner",
            {},
            {
                authHeader: "Basic test-token",
            },
        );

        const result = await node(
            {
                messages: [new HumanMessage({ content: "Plan this run." })],
            },
            {
                context: {
                    opencodeBaseUrl: "http://127.0.0.1:4096",
                    targetRepoPath: "/repo",
                },
            },
        );

        expect(result.messages?.[0]?.content).toBe("done");
    });

    test("omits workflow-local agent names when using the shared server", async () => {
        resetSdkMocks();

        const node = createOpenCodeNode(
            "planner",
            {
                model: "openai/gpt-5.4",
                tools: {
                    read: true,
                },
            },
            {
                authHeader: "Basic test-token",
                system: "You are the planner.",
            },
        );

        await node(
            {
                messages: [new HumanMessage({ content: "Plan this run." })],
            },
            {
                context: {
                    opencodeBaseUrl: "http://127.0.0.1:4096",
                    targetRepoPath: "/repo",
                },
            },
        );

        expect(sessionPrompt.mock.calls[0]?.[0]?.body.agent).toBeUndefined();
        expect(sessionPrompt.mock.calls[0]?.[0]).toMatchObject({
            body: {
                model: {
                    modelID: "gpt-5.4",
                    providerID: "openai",
                },
                system: "You are the planner.",
                tools: {
                    read: true,
                },
            },
        });
    });

    test("reuses the default shared server when it is already reachable", async () => {
        resetSdkMocks();

        const fetchMock = mock(() =>
            Promise.resolve(
                new Response(JSON.stringify({ healthy: true, version: "test" }), {
                    headers: {
                        "content-type": "application/json",
                    },
                    status: 200,
                }),
            ),
        );
        const previousFetch = globalThis.fetch;
        globalThis.fetch = fetchMock as typeof fetch;

        try {
            const node = createOpenCodeNode(
                "planner",
                {},
                {
                    directory: "/repo",
                },
            );

            await node({
                messages: [new HumanMessage({ content: "Plan this run." })],
            });

            expect(createClient.mock.calls[0]?.[0]?.baseUrl).toBe("http://127.0.0.1:4096");
            expect(createClient.mock.calls[0]?.[0]?.directory).toBe("/repo");
            expect(createServer).not.toHaveBeenCalled();
        } finally {
            globalThis.fetch = previousFetch;
        }
    });

    test("keeps workflow-local agent names when using an embedded server", async () => {
        resetSdkMocks();

        const previousFetch = globalThis.fetch;
        globalThis.fetch = mock(() => Promise.reject(new Error("unreachable"))) as typeof fetch;

        try {
            const node = createOpenCodeNode(
                "planner",
                {
                    model: "openai/gpt-5.4",
                    tools: {
                        read: true,
                    },
                },
                {
                    authHeader: "Basic test-token",
                    directory: "/repo",
                    system: "You are the planner.",
                },
            );

            await node({
                messages: [new HumanMessage({ content: "Plan this run." })],
            });

            expect(sessionPrompt.mock.calls[0]?.[0]).toMatchObject({
                body: {
                    agent: "planner",
                },
            });
        } finally {
            globalThis.fetch = previousFetch;
        }
    });

    test("passes the parent session id from runtime context when creating a session", async () => {
        resetSdkMocks();

        const node = createOpenCodeNode(
            "planner",
            {},
            {
                authHeader: "Basic test-token",
            },
        );

        await node(
            {
                messages: [new HumanMessage({ content: "Plan this run." })],
            },
            {
                context: {
                    opencodeBaseUrl: "http://127.0.0.1:4096",
                    parentSessionID: "parent-1",
                    targetRepoPath: "/repo",
                },
            },
        );

        expect(sessionCreate.mock.calls[0]?.[0]?.body.parentID).toBe("parent-1");
    });

    test("reuses existing sessions and only prompts with unseen messages", async () => {
        resetSdkMocks();

        const node = createOpenCodeNode(
            "planner",
            {},
            {
                authHeader: "Basic test-token",
            },
        );

        const first = await node(
            {
                messages: [new HumanMessage({ content: "Plan this run." })],
            },
            {
                context: {
                    opencodeBaseUrl: "http://127.0.0.1:4096",
                    targetRepoPath: "/repo",
                },
            },
        );

        await node(
            {
                messages: [
                    new HumanMessage({ content: "Plan this run." }),
                    new HumanMessage({ content: "Add verification steps." }),
                ],
                opencode: first.opencode,
            },
            {
                context: {
                    opencodeBaseUrl: "http://127.0.0.1:4096",
                    targetRepoPath: "/repo",
                },
            },
        );

        expect(sessionCreate).toHaveBeenCalledTimes(1);
        expect(sessionPrompt).toHaveBeenCalledTimes(2);
        expect(sessionPrompt.mock.calls[1]?.[0]?.path.id).toBe("session-1");
        expect(sessionPrompt.mock.calls[1]?.[0]?.body.parts).toEqual([
            {
                type: "text",
                text: "User:\nAdd verification steps.",
            },
        ]);
    });

    test("reconnects to an existing completed prompt before sending it again", async () => {
        resetSdkMocks();

        sessionMessages.mockImplementationOnce(() =>
            Promise.resolve([
                {
                    info: {
                        cost: undefined,
                        error: undefined,
                        finish: undefined,
                        id: "reply-1",
                        modelID: undefined,
                        parentID: "user-0",
                        providerID: undefined,
                        role: "assistant",
                        time: {
                            created: 1,
                        },
                        tokens: undefined,
                    },
                    parts: [{ text: "previous" }],
                },
                {
                    info: {
                        id: "user-2",
                        role: "user",
                        time: {
                            created: 2,
                        },
                    },
                    parts: [{ text: "User:\nAdd verification steps." }],
                },
                {
                    info: {
                        cost: undefined,
                        error: undefined,
                        finish: undefined,
                        id: "reply-2",
                        modelID: undefined,
                        parentID: "user-2",
                        providerID: undefined,
                        role: "assistant",
                        time: {
                            created: 3,
                        },
                        tokens: undefined,
                    },
                    parts: [{ text: "done" }],
                },
            ]),
        );

        const node = createOpenCodeNode(
            "planner",
            {},
            {
                authHeader: "Basic test-token",
            },
        );

        const result = await node(
            {
                messages: [
                    new HumanMessage({ content: "Plan this run." }),
                    new AIMessage({ content: "previous", id: "reply-1", name: "planner" }),
                    new HumanMessage({ content: "Add verification steps." }),
                ],
                opencode: {
                    cursors: {
                        planner: 2,
                    },
                    sessions: {
                        planner: "session-1",
                    },
                },
            },
            {
                context: {
                    opencodeBaseUrl: "http://127.0.0.1:4096",
                    targetRepoPath: "/repo",
                },
            },
        );

        expect(result.messages?.[0]?.content).toBe("done");
        expect(sessionCreate).not.toHaveBeenCalled();
        expect(sessionPrompt).not.toHaveBeenCalled();
    });

    test("returns the completed session reply when the prompt request times out", async () => {
        resetSdkMocks();

        sessionPrompt.mockImplementationOnce(() =>
            Promise.reject(new Error("Request timed out after 300000ms")),
        );
        sessionMessages.mockImplementationOnce(() =>
            Promise.resolve([
                {
                    info: {
                        id: "user-1",
                        role: "user",
                        time: {
                            created: 1,
                        },
                    },
                    parts: [{ text: "User:\nPlan this run." }],
                },
                {
                    info: {
                        cost: undefined,
                        error: undefined,
                        finish: undefined,
                        id: "reply-timeout",
                        modelID: undefined,
                        parentID: "user-1",
                        providerID: undefined,
                        role: "assistant",
                        time: {
                            created: 2,
                        },
                        tokens: undefined,
                    },
                    parts: [{ text: "done" }],
                },
            ]),
        );

        const node = createOpenCodeNode(
            "planner",
            {},
            {
                authHeader: "Basic test-token",
            },
        );

        const result = await node(
            {
                messages: [new HumanMessage({ content: "Plan this run." })],
            },
            {
                context: {
                    opencodeBaseUrl: "http://127.0.0.1:4096",
                    targetRepoPath: "/repo",
                },
            },
        );

        expect(result.messages?.[0]?.content).toBe("done");
        expect(sessionPrompt).toHaveBeenCalledTimes(1);
        expect(sessionMessages).toHaveBeenCalledTimes(1);
    });
});

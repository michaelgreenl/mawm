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
 * Mocks the OpenCode async-prompt endpoint.
 *
 * @returns A resolved acknowledgement payload.
 */
const sessionPromptAsync = mock(() => Promise.resolve(undefined));

/**
 * Mocks OpenCode session message snapshots.
 *
 * Default implementation returns the canonical "Plan this run" exchange so
 * tests that do not care about message timing just receive a finished reply.
 *
 * @returns A resolved message list containing the canonical exchange.
 */
const sessionMessages = mock(() =>
    Promise.resolve([
        {
            info: {
                id: "user-1",
                role: "user",
                time: { created: 1 },
            },
            parts: [{ text: "User:\nPlan this run." }],
        },
        {
            info: {
                cost: undefined,
                error: undefined,
                finish: "stop",
                id: "reply-1",
                modelID: undefined,
                parentID: "user-1",
                providerID: undefined,
                role: "assistant",
                time: { created: 2 },
                tokens: undefined,
            },
            parts: [{ text: "done" }],
        },
    ]),
);

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
    sessionPromptAsync.mockClear();
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
            promptAsync: sessionPromptAsync,
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

mock.module("@opencode-ai/sdk/v2", () => ({
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
                variant: "high",
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

        expect(sessionPromptAsync.mock.calls[0]?.[0]?.agent).toBeUndefined();
        expect(sessionPromptAsync.mock.calls[0]?.[0]).toMatchObject({
            model: {
                modelID: "gpt-5.4",
                providerID: "openai",
            },
            sessionID: "session-1",
            system: "You are the planner.",
            tools: {
                read: true,
            },
            variant: "high",
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

            expect(sessionPromptAsync.mock.calls[0]?.[0]).toMatchObject({
                agent: "planner",
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

        expect(sessionCreate.mock.calls[0]?.[0]?.parentID).toBe("parent-1");
    });

    test("reuses existing sessions and only prompts with unseen messages", async () => {
        resetSdkMocks();

        const firstSnapshot = [
            {
                info: {
                    id: "user-1",
                    role: "user",
                    time: { created: 1 },
                },
                parts: [{ text: "User:\nPlan this run." }],
            },
            {
                info: {
                    cost: undefined,
                    error: undefined,
                    finish: "stop",
                    id: "reply-1",
                    modelID: undefined,
                    parentID: "user-1",
                    providerID: undefined,
                    role: "assistant",
                    time: { created: 2 },
                    tokens: undefined,
                },
                parts: [{ text: "first done" }],
            },
        ];
        const secondSnapshot = [
            ...firstSnapshot,
            {
                info: {
                    id: "user-2",
                    role: "user",
                    time: { created: 3 },
                },
                parts: [{ text: "User:\nAdd verification steps." }],
            },
            {
                info: {
                    cost: undefined,
                    error: undefined,
                    finish: "stop",
                    id: "reply-2",
                    modelID: undefined,
                    parentID: "user-2",
                    providerID: undefined,
                    role: "assistant",
                    time: { created: 4 },
                    tokens: undefined,
                },
                parts: [{ text: "second done" }],
            },
        ];

        // First node call sees only firstSnapshot. tryReconnect on the second
        // call also sees firstSnapshot (no new reply since the previous turn).
        // Once promptAsync submits the second prompt, subsequent polls see
        // the second snapshot with the new user message and its reply.
        let secondPromptSubmitted = false;
        sessionPromptAsync.mockImplementation(() => {
            secondPromptSubmitted = sessionPromptAsync.mock.calls.length >= 2;
            return Promise.resolve(undefined);
        });
        sessionMessages.mockImplementation(() =>
            Promise.resolve(secondPromptSubmitted ? secondSnapshot : firstSnapshot),
        );

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
        expect(sessionPromptAsync).toHaveBeenCalledTimes(2);
        expect(sessionPromptAsync.mock.calls[1]?.[0]?.sessionID).toBe("session-1");
        expect(sessionPromptAsync.mock.calls[1]?.[0]?.parts).toEqual([
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
                        finish: "stop",
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
                        finish: "stop",
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
        expect(sessionPromptAsync).not.toHaveBeenCalled();
    });

    test("submits the prompt asynchronously and reads the reply from session messages", async () => {
        resetSdkMocks();

        sessionMessages.mockImplementation(() =>
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
                        finish: "stop",
                        id: "reply-async",
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

        expect(sessionPromptAsync).toHaveBeenCalledTimes(1);
        expect(result.messages?.[0]?.content).toBe("done");
        expect(result.messages?.[0]?.id).toBe("reply-async");
    });

    test("waits past intermediate tool-call steps for the terminal reply", async () => {
        resetSdkMocks();

        const intermediateSnapshot = [
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
                    finish: "tool-calls",
                    id: "reply-tool-step",
                    modelID: undefined,
                    parentID: "user-1",
                    providerID: undefined,
                    role: "assistant",
                    time: {
                        created: 2,
                    },
                    tokens: undefined,
                },
                parts: [],
            },
        ];
        const terminalSnapshot = [
            ...intermediateSnapshot,
            {
                info: {
                    cost: undefined,
                    error: undefined,
                    finish: "stop",
                    id: "reply-final",
                    modelID: undefined,
                    parentID: "user-1",
                    providerID: undefined,
                    role: "assistant",
                    time: {
                        created: 3,
                    },
                    tokens: undefined,
                },
                parts: [{ text: "done" }],
            },
        ];

        sessionMessages.mockImplementationOnce(() => Promise.resolve(intermediateSnapshot));
        sessionStatus.mockImplementationOnce(() =>
            Promise.resolve({ "session-1": { type: "busy" } }),
        );
        sessionMessages.mockImplementationOnce(() => Promise.resolve(terminalSnapshot));

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
        expect(result.messages?.[0]?.id).toBe("reply-final");
        expect(sessionMessages).toHaveBeenCalledTimes(2);
        expect(sessionStatus).toHaveBeenCalledTimes(1);
    });

    test("continues searching backwards past non-matching user messages to find the matching prompt's reply", async () => {
        resetSdkMocks();

        // Session contains a stray later user message that doesn't match our prompt.
        // The matching prompt and its completed reply are earlier in the timeline.
        // The polling path must keep walking backwards instead of bailing on the
        // first non-matching user message.
        sessionMessages.mockImplementation(() =>
            Promise.resolve([
                {
                    info: {
                        id: "user-current",
                        role: "user",
                        time: { created: 1 },
                    },
                    parts: [{ text: "User:\nPlan this run." }],
                },
                {
                    info: {
                        cost: undefined,
                        error: undefined,
                        finish: "stop",
                        id: "reply-current",
                        modelID: undefined,
                        parentID: "user-current",
                        providerID: undefined,
                        role: "assistant",
                        time: { created: 2 },
                        tokens: undefined,
                    },
                    parts: [{ text: "done" }],
                },
                {
                    info: {
                        id: "user-stray",
                        role: "user",
                        time: { created: 3 },
                    },
                    parts: [{ text: "User:\nSomething else entirely." }],
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
        expect(result.messages?.[0]?.id).toBe("reply-current");
    });

    test("falls back to complete session history when the user prompt is outside the recent limit", async () => {
        resetSdkMocks();

        // Build a 41-step session: 1 user prompt at the start plus 41 assistant
        // messages. The recent-message limit is 32, so the user prompt drops
        // out of the limited window and only complete history will surface it.
        const userMessage = {
            info: {
                id: "user-1",
                role: "user" as const,
                time: { created: 1 },
            },
            parts: [{ text: "User:\nPlan this run." }],
        };
        const assistantSteps = Array.from({ length: 41 }, (_, i) => ({
            info: {
                cost: undefined,
                error: undefined,
                finish: i === 40 ? "stop" : "tool-calls",
                id: `reply-step-${i}`,
                modelID: undefined,
                parentID: "user-1",
                providerID: undefined,
                role: "assistant" as const,
                time: { created: i + 2 },
                tokens: undefined,
            },
            parts: i === 40 ? [{ text: "done" }] : [],
        }));

        // Persistent mock: callers that pass a limit see only the most recent
        // `limit` assistant steps (user prompt drops out of view), while a
        // call with no limit returns the complete history. This mirrors how
        // a real OpenCode server behaves and is what forces the recovery
        // path to fall back to complete history.
        sessionMessages.mockImplementation((args: { limit?: number }) =>
            Promise.resolve(
                typeof args?.limit === "number"
                    ? assistantSteps.slice(-args.limit)
                    : [userMessage, ...assistantSteps],
            ),
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
        expect(result.messages?.[0]?.id).toBe("reply-step-40");
    });
});

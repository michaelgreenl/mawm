import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createWorkflowWorker } from "../src/cmd/workflow/runtime/worker.ts";

const plannerSession = {
    nodeName: "planner",
    sessionID: "session-123",
    serverUrl: "http://127.0.0.1:4100",
    attachCommand: ["opencode", "attach", "http://127.0.0.1:4100", "--session", "session-123"],
    auth: undefined,
};

const plannerInterrupt = {
    type: "opencode-session" as const,
    ...plannerSession,
};

describe("workflow worker", () => {
    it("creates interactive sessions from graph interrupt requests", async () => {
        const events: unknown[] = [];
        const ensureCalls: Array<{ nodeName: string; threadID: string }> = [];

        const worker = createWorkflowWorker({
            graph: {
                async invoke() {
                    return {
                        __interrupt__: [{ value: { type: "opencode-session", nodeName: "planner" } }],
                    };
                },
            },
            async send(event) {
                events.push(event);
            },
            async onClose() {},
            sessionManager: {
                async ensureSession(nodeName: string, threadID: string) {
                    ensureCalls.push({ nodeName, threadID });
                    return plannerSession;
                },
                async closeSession() {
                    assert.fail("worker should keep the interactive session open until resume");
                },
                async closeAllSessions() {},
            },
        } as never);

        await worker.handle({ type: "start", threadID: "thread-123", input: {} });

        assert.deepEqual(ensureCalls, [{ nodeName: "planner", threadID: "thread-123" }]);
        assert.deepEqual(events, [{ type: "interrupt", interrupt: plannerInterrupt }]);
    });

    it("closes the active session before resuming the graph", async () => {
        const closeCalls: Array<{ threadID: string; nodeName: string }> = [];
        const events: unknown[] = [];
        let invocationCount = 0;

        const worker = createWorkflowWorker({
            graph: {
                async invoke() {
                    invocationCount += 1;

                    if (invocationCount === 1) {
                        return {
                            __interrupt__: [{ value: { type: "opencode-session", nodeName: "planner" } }],
                        };
                    }

                    return { ok: true };
                },
            },
            async send(event) {
                events.push(event);
            },
            async onClose() {},
            sessionManager: {
                async ensureSession() {
                    return plannerSession;
                },
                async closeSession(threadID: string, nodeName: string) {
                    closeCalls.push({ threadID, nodeName });
                },
                async closeAllSessions() {},
            },
        } as never);

        await worker.handle({ type: "start", threadID: "thread-123", input: {} });
        await worker.handle({ type: "resume", value: { brief: "continue" } });

        assert.deepEqual(closeCalls, [{ threadID: "thread-123", nodeName: "planner" }]);
        assert.deepEqual(events, [
            { type: "interrupt", interrupt: plannerInterrupt },
            { type: "result", result: { ok: true } },
        ]);
    });

    it("closes interactive sessions when the worker stops", async () => {
        let closeAllCalls = 0;

        const worker = createWorkflowWorker({
            graph: {
                async invoke() {
                    return {
                        __interrupt__: [{ value: { type: "opencode-session", nodeName: "planner" } }],
                    };
                },
            },
            async send() {},
            async onClose() {},
            sessionManager: {
                async ensureSession() {
                    return plannerSession;
                },
                async closeSession() {},
                async closeAllSessions() {
                    closeAllCalls += 1;
                },
            },
        } as never);

        await worker.handle({ type: "start", threadID: "thread-123", input: {} });
        await worker.handle({ type: "stop" });

        assert.equal(closeAllCalls, 1);
    });
});

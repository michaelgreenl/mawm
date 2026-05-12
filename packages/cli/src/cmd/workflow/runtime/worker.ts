import { Command } from "@langchain/langgraph";

import type { InteractiveSessionManager } from "./session-manager.js";
import type {
    OpencodeSessionRequest,
    WorkerCommand,
    WorkerEvent,
    WorkerGraph,
} from "./protocol.d.ts";

type WorkflowWorkerRuntime = {
    graph: WorkerGraph;
    sessionManager: InteractiveSessionManager;
    send(event: WorkerEvent): Promise<void>;
    onClose?(): Promise<void>;
};

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function isOpencodeSessionRequest(value: unknown): value is OpencodeSessionRequest {
    if (!value || typeof value !== "object") {
        return false;
    }

    const interrupt = value as Partial<OpencodeSessionRequest>;

    return interrupt.type === "opencode-session" && typeof interrupt.nodeName === "string";
}

function getFirstInterruptRequest(result: unknown) {
    if (!result || typeof result !== "object") {
        return undefined;
    }

    const maybeInterrupts = (result as { __interrupt__?: Array<{ value?: unknown }> })[
        "__interrupt__"
    ];

    if (!Array.isArray(maybeInterrupts)) {
        return undefined;
    }

    for (const interrupt of maybeInterrupts) {
        if (isOpencodeSessionRequest(interrupt?.value)) {
            return interrupt.value;
        }
    }

    return undefined;
}

export function createWorkflowWorker(runtime: WorkflowWorkerRuntime) {
    let threadID: string | undefined;
    let queue = Promise.resolve();
    let stopped = false;
    let activeInterrupt: { threadID: string; nodeName: string } | undefined;

    const closeActiveSession = async () => {
        if (!activeInterrupt) {
            return;
        }

        const session = activeInterrupt;
        activeInterrupt = undefined;

        await runtime.sessionManager.closeSession(session.threadID, session.nodeName);
    };

    const closeSessions = async () => {
        await closeActiveSession();
        await runtime.sessionManager.closeAllSessions();
        await runtime.onClose?.();
    };

    const invokeGraph = async (input: unknown) => {
        if (!threadID) {
            await runtime.send({
                type: "error",
                error: "Worker received a graph invocation before it was started.",
            });
            return;
        }

        try {
            const result = await runtime.graph.invoke(input, {
                configurable: { thread_id: threadID },
            });
            const interruptRequest = getFirstInterruptRequest(result);

            if (interruptRequest) {
                await closeActiveSession();

                const session = await runtime.sessionManager.ensureSession(
                    interruptRequest.nodeName,
                    threadID,
                );
                const interrupt = {
                    type: "opencode-session" as const,
                    ...session,
                };

                activeInterrupt = {
                    threadID,
                    nodeName: session.nodeName,
                };
                await runtime.send({ type: "interrupt", interrupt });
                return;
            }

            await runtime.send({ type: "result", result });
        } catch (error) {
            await runtime.send({
                type: "error",
                error: getErrorMessage(error),
            });
        }
    };

    const handleCommand = async (command: WorkerCommand) => {
        if (stopped) {
            return;
        }

        switch (command.type) {
            case "start":
                threadID = command.threadID;
                await invokeGraph(command.input ?? {});
                return;

            case "resume":
                await closeActiveSession();
                await invokeGraph(new Command({ resume: command.value ?? {} }));
                return;

            case "stop":
                stopped = true;
                await closeSessions();
                return;
        }
    };

    return {
        async handle(command: WorkerCommand) {
            queue = queue.then(() => handleCommand(command));
            await queue;
        },
    };
}

import { Command } from "@langchain/langgraph";

import type { OpencodeInterrupt, WorkerCommand, WorkerEvent, WorkerGraph } from "../protocol.ts";

type WorkflowWorkerRuntime = {
    graph: WorkerGraph;
    send(event: WorkerEvent): Promise<void>;
    onClose(): Promise<void>;
};

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function isOpencodeInterrupt(value: unknown): value is OpencodeInterrupt {
    if (!value || typeof value !== "object") {
        return false;
    }

    const interrupt = value as Partial<OpencodeInterrupt>;

    return (
        interrupt.type === "opencode-session" &&
        typeof interrupt.nodeName === "string" &&
        typeof interrupt.sessionID === "string" &&
        typeof interrupt.serverUrl === "string" &&
        Array.isArray(interrupt.attachCommand)
    );
}

function getFirstInterrupt(result: unknown) {
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
        if (isOpencodeInterrupt(interrupt?.value)) {
            return interrupt.value;
        }
    }

    return undefined;
}

export function createWorkflowWorker(runtime: WorkflowWorkerRuntime) {
    let threadID: string | undefined;
    let queue = Promise.resolve();
    let stopped = false;

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
            const interrupt = getFirstInterrupt(result);

            if (interrupt) {
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
                await invokeGraph(new Command({ resume: command.value ?? {} }));
                return;

            case "stop":
                stopped = true;
                await runtime.onClose();
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

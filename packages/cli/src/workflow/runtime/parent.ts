import type { OpencodeInterrupt, WorkerTransport } from "./protocol.ts";

type ParentRuntime = {
    transport: WorkerTransport;
    threadID?: string;
    input?: unknown;
    attachSession(interrupt: OpencodeInterrupt): Promise<void>;
    buildResumeValue(interrupt: OpencodeInterrupt): Promise<unknown>;
};

export async function runInteractiveWorkflow(runtime: ParentRuntime) {
    try {
        let event = await runtime.transport.start(
            runtime.threadID ?? `thread-${Date.now()}`,
            runtime.input,
        );

        while (event.type === "interrupt") {
            await runtime.attachSession(event.interrupt);
            const resumeValue = await runtime.buildResumeValue(event.interrupt);

            event = await runtime.transport.resume(resumeValue);
        }

        if (event.type === "error") {
            throw new Error(event.error);
        }

        return event.result;
    } finally {
        await runtime.transport.close();
    }
}

import { spawn } from "node:child_process";

import type { WorkerCommand, WorkerEvent, WorkerTransport } from "./protocol.ts";

type ProcessTransportRuntime = {
    workerPath: string;
    workerArgs?: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
};

function getExitError(code: number | null, signal: NodeJS.Signals | null) {
    if (signal) {
        return new Error(`Workflow worker exited from signal ${signal}.`);
    }

    return new Error(`Workflow worker exited with code ${code ?? "unknown"}.`);
}

function waitForChildExit(child: ReturnType<typeof spawn>) {
    return new Promise<void>((resolve) => {
        child.once("exit", () => resolve());
    });
}

export function createProcessWorkflowTransport(runtime: ProcessTransportRuntime): WorkerTransport {
    const child = spawn(process.execPath, [runtime.workerPath, ...(runtime.workerArgs ?? [])], {
        cwd: runtime.cwd ?? process.cwd(),
        env: runtime.env ?? process.env,
        stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    let pending:
        | {
              resolve(event: WorkerEvent): void;
              reject(error: Error): void;
          }
        | undefined;
    let closed = false;

    child.stderr?.on("data", (chunk: Buffer) => {
        process.stderr.write(chunk);
    });

    child.on("message", (message: unknown) => {
        if (!pending) {
            return;
        }

        const current = pending;
        pending = undefined;
        current.resolve(message as WorkerEvent);
    });

    child.once("error", (error) => {
        if (!pending) {
            return;
        }

        const current = pending;
        pending = undefined;
        current.reject(error);
    });

    child.once("exit", (code, signal) => {
        if (!pending) {
            return;
        }

        const current = pending;
        pending = undefined;
        current.reject(getExitError(code, signal));
    });

    const sendCommand = async (command: WorkerCommand) => {
        if (closed || !child.connected) {
            throw new Error("Workflow worker is not available.");
        }

        if (pending) {
            throw new Error("Workflow worker already has a pending request.");
        }

        return await new Promise<WorkerEvent>((resolve, reject) => {
            pending = { resolve, reject };

            child.send(command, (error) => {
                if (!error) {
                    return;
                }

                const current = pending;
                pending = undefined;
                current?.reject(error);
            });
        });
    };

    return {
        async start(threadID, input) {
            return await sendCommand({ type: "start", threadID, input });
        },
        async resume(value) {
            return await sendCommand({ type: "resume", value });
        },
        async close() {
            if (closed) {
                return;
            }

            closed = true;

            if (!child.connected || child.exitCode !== null) {
                return;
            }

            child.send({ type: "stop" } satisfies WorkerCommand);

            const exited = await Promise.race([
                waitForChildExit(child).then(() => true),
                new Promise<boolean>((resolve) => {
                    setTimeout(() => resolve(false), 1_000);
                }),
            ]);

            if (!exited && child.exitCode === null) {
                child.kill("SIGTERM");
                await waitForChildExit(child);
            }
        },
    };
}

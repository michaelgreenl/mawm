import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { EventEmitter } from "node:events";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runWorkflowCommand } from "../../dist/cmd/workflow/run.js";

async function withTempProject(run: (projectRoot: string) => Promise<void>): Promise<void> {
    const projectRoot = await mkdtemp(join(tmpdir(), "mawm-workflow-run-"));

    try {
        await run(projectRoot);
    } finally {
        await rm(projectRoot, { recursive: true, force: true });
    }
}

describe("run command", () => {
    it("runs an installed workflow with the interactive runtime", async () => {
        await withTempProject(async (projectRoot) => {
            await mkdir(join(projectRoot, ".mawm", "maws", "base"), { recursive: true });
            await writeFile(
                join(projectRoot, ".mawm", "maws", "base", "mawm.json"),
                `${JSON.stringify({ id: "base", runtimeRegistryKey: "base" }, null, 2)}\n`,
            );

            const stdout: string[] = [];
            const stderr: string[] = [];
            const transport = {
                async start() {
                    throw new Error("transport.start should be stubbed by runInteractiveWorkflow");
                },
                async resume() {
                    throw new Error("transport.resume should be stubbed by runInteractiveWorkflow");
                },
                async close() {},
            };
            const transportCalls: Array<{
                workerPath: string;
                workerArgs?: string[];
                cwd?: string;
                env?: NodeJS.ProcessEnv;
            }> = [];
            const spawnCalls: Array<{
                command: string;
                args: string[];
                cwd?: string;
                env?: NodeJS.ProcessEnv;
            }> = [];

            const exitCode = await runWorkflowCommand(
                {
                    args: {
                        workflow: "base",
                    },
                    context: {
                        cwd: projectRoot,
                        env: { PATH: process.env.PATH ?? "" },
                        rawArgs: ["run", "base", "--thread-id", "thread-123"],
                    },
                },
                {
                    createTransport(runtime) {
                        transportCalls.push(runtime);
                        return transport;
                    },
                    async runInteractiveWorkflow(runtime) {
                        assert.equal(runtime.threadID, "thread-123");
                        assert.equal(runtime.transport, transport);

                        const interrupt = {
                            type: "opencode-session" as const,
                            nodeName: "planner",
                            sessionID: "session-123",
                            serverUrl: "http://127.0.0.1:4100",
                            attachCommand: [
                                "opencode",
                                "attach",
                                "http://127.0.0.1:4100",
                                "--session",
                                "session-123",
                            ],
                        };

                        await runtime.attachSession(interrupt);
                        assert.equal(await runtime.buildResumeValue(interrupt), undefined);

                        return { ok: true };
                    },
                    spawnProcess(command, args, options) {
                        spawnCalls.push({
                            command,
                            args,
                            cwd: options.cwd,
                            env: options.env,
                        });

                        const child = new EventEmitter() as EventEmitter & {
                            once: EventEmitter["once"];
                        };

                        queueMicrotask(() => {
                            child.emit("exit", 0, null);
                        });

                        return child as never;
                    },
                    randomUUID() {
                        return "generated-thread-id";
                    },
                    stdout: {
                        write(chunk) {
                            stdout.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
                            return true;
                        },
                    },
                    stderr: {
                        write(chunk) {
                            stderr.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
                            return true;
                        },
                    },
                },
            );

            const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));

            assert.equal(exitCode, 0);
            assert.deepEqual(spawnCalls, [
                {
                    command: "opencode",
                    args: ["attach", "http://127.0.0.1:4100", "--session", "session-123"],
                    cwd: projectRoot,
                    env: { PATH: process.env.PATH ?? "" },
                },
            ]);
            assert.deepEqual(transportCalls, [
                {
                    workerPath: fileURLToPath(
                        new URL("../../dist/workflow/runtime/worker-entry.js", import.meta.url),
                    ),
                    workerArgs: [
                        pathToFileURL(
                            join(
                                repoRoot,
                                "packages",
                                "cli",
                                "dist",
                                "assets",
                                "workflows",
                                "base",
                                "graph",
                                "index.js",
                            ),
                        ).href,
                    ],
                    cwd: projectRoot,
                    env: { PATH: process.env.PATH ?? "" },
                },
            ]);
            assert.equal(
                stderr.join(""),
                "Starting interactive workflow thread thread-123.\nAttaching OpenCode planner session session-123.\n",
            );
            assert.equal(stdout.join(""), '{\n  "ok": true\n}\n');
        });
    });

    it("fails when the workflow is not installed", async () => {
        await withTempProject(async (projectRoot) => {
            const stderr: string[] = [];

            const exitCode = await runWorkflowCommand(
                {
                    args: {
                        workflow: "missing",
                    },
                    context: {
                        cwd: projectRoot,
                        env: {},
                        rawArgs: ["run", "missing"],
                    },
                },
                {
                    stderr: {
                        write(chunk) {
                            stderr.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
                            return true;
                        },
                    },
                },
            );

            assert.equal(exitCode, 1);
            assert.equal(stderr.join(""), "Workflow is not installed: missing\n");
        });
    });
});

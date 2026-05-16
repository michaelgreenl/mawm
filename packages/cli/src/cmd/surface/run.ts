import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineCommand, arg } from "../../types/commands.js";
import type { CommandContext } from "../../types/commands.js";
import type { OpencodeInterrupt } from "../../workflow/runtime/protocol.js";
import { runInteractiveWorkflow } from "../../workflow/runtime/parent.js";
import { createProcessWorkflowTransport } from "../../workflow/runtime/process-transport.js";

type WorkflowDefinition = {
    runtimeRegistryKey?: string;
};

type Writable = Pick<typeof process.stdout, "write">;

type RunCommandInput = {
    args: {
        workflow: string;
    };
    context: CommandContext;
};

type WorkflowRunRuntime = {
    readFile: typeof readFile;
    createTransport: typeof createProcessWorkflowTransport;
    runInteractiveWorkflow: typeof runInteractiveWorkflow;
    spawnProcess: typeof spawn;
    randomUUID: typeof randomUUID;
    stdout: Writable;
    stderr: Writable;
    moduleUrl: string;
};

const defaultRuntime: WorkflowRunRuntime = {
    readFile,
    createTransport: createProcessWorkflowTransport,
    runInteractiveWorkflow,
    spawnProcess: spawn,
    randomUUID,
    stdout: process.stdout,
    stderr: process.stderr,
    moduleUrl: import.meta.url,
};

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function getArgValue(args: readonly string[], flag: string) {
    const index = args.indexOf(flag);

    if (index === -1) {
        return undefined;
    }

    return args[index + 1];
}

function getWorkerExtension(moduleUrl: string) {
    return extname(fileURLToPath(moduleUrl)) === ".ts" ? ".ts" : ".js";
}

function getWorkerPath(moduleUrl: string) {
    return fileURLToPath(
        new URL(`../../workflow/runtime/worker-entry${getWorkerExtension(moduleUrl)}`, moduleUrl),
    );
}

function getWorkflowGraphModuleUrl(runtimeRegistryKey: string, moduleUrl: string) {
    return new URL(`../../assets/workflows/${runtimeRegistryKey}/graph/index.js`, moduleUrl).href;
}

async function readWorkflowDefinition(
    workflowRoot: string,
    runtime: WorkflowRunRuntime,
): Promise<WorkflowDefinition> {
    return JSON.parse(
        await runtime.readFile(join(workflowRoot, "mawm.json"), "utf8"),
    ) as WorkflowDefinition;
}

async function runAttachCommand(
    interrupt: OpencodeInterrupt,
    context: CommandContext,
    runtime: WorkflowRunRuntime,
) {
    const [command, ...args] = interrupt.attachCommand;

    if (!command) {
        throw new Error(`Missing attach command for ${interrupt.nodeName}.`);
    }

    await new Promise<void>((resolve, reject) => {
        const child = runtime.spawnProcess(command, args, {
            cwd: context.cwd,
            env: context.env,
            stdio: "inherit",
        });

        child.once("error", reject);
        child.once("exit", (code, signal) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(
                new Error(
                    signal
                        ? `OpenCode attach exited from signal ${signal}.`
                        : `OpenCode attach exited with code ${code ?? "unknown"}.`,
                ),
            );
        });
    });
}

export async function runWorkflowCommand(
    input: RunCommandInput,
    overrides: Partial<WorkflowRunRuntime> = {},
) {
    const runtime = {
        ...defaultRuntime,
        ...overrides,
    } satisfies WorkflowRunRuntime;

    try {
        const workflowRoot = join(input.context.cwd, ".mawm", "maws", input.args.workflow);
        const workflowDefinition = await readWorkflowDefinition(workflowRoot, runtime);
        const runtimeRegistryKey = workflowDefinition.runtimeRegistryKey ?? input.args.workflow;

        if (runtimeRegistryKey.length === 0) {
            throw new Error(`Workflow is missing a runtime registry key: ${input.args.workflow}`);
        }

        const threadID = getArgValue(input.context.rawArgs, "--thread-id") ?? runtime.randomUUID();

        runtime.stderr.write(`Starting interactive workflow thread ${threadID}.\n`);

        const result = await runtime.runInteractiveWorkflow({
            threadID,
            transport: runtime.createTransport({
                workerPath: getWorkerPath(runtime.moduleUrl),
                workerArgs: [getWorkflowGraphModuleUrl(runtimeRegistryKey, runtime.moduleUrl)],
                cwd: input.context.cwd,
                env: input.context.env,
            }),
            attachSession: async (interrupt) => {
                runtime.stderr.write(
                    `Attaching OpenCode ${interrupt.nodeName} session ${interrupt.sessionID}.\n`,
                );
                await runAttachCommand(interrupt, input.context, runtime);
            },
            buildResumeValue: async () => undefined,
        });

        runtime.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        return 0;
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            runtime.stderr.write(`Workflow is not installed: ${input.args.workflow}\n`);
            return 1;
        }

        runtime.stderr.write(`${getErrorMessage(error)}\n`);
        return 1;
    }
}

const run = defineCommand({
    name: "run",
    description: "Executes installed workflows",
    usage: "run <workflow>",
    args: [arg("workflow", { required: true })],
    async run(input) {
        return await runWorkflowCommand(input);
    },
});

export default run;

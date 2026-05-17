import { spawn } from "node:child_process";
import { access, open, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tool } from "@opencode-ai/plugin";

const WORKFLOW_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const STARTUP_TIMEOUT_MS = 1500;
const LANGGRAPH_DEV_COMMAND = [
    "npx",
    "--yes",
    "@langchain/langgraph-cli",
    "dev",
    "--no-browser",
] as const;

const exists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

const waitForStartup = async (child: ReturnType<typeof spawn>): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            resolve();
        }, STARTUP_TIMEOUT_MS);

        const handleError = (error: Error): void => {
            cleanup();
            reject(error);
        };

        const handleExit = (code: number | null, signal: NodeJS.Signals | null): void => {
            cleanup();
            reject(
                new Error(
                    `LangGraph exited during startup (code: ${code ?? "null"}, signal: ${signal ?? "none"}).`,
                ),
            );
        };

        const cleanup = (): void => {
            clearTimeout(timeout);
            child.off("error", handleError);
            child.off("exit", handleExit);
        };

        child.on("error", handleError);
        child.on("exit", handleExit);
    });
};

const formatStartupError = async (
    workflow: string,
    logPath: string,
    error: unknown,
): Promise<Error> => {
    const message = error instanceof Error ? error.message : String(error);
    const logOutput = await readFile(logPath, "utf8").catch(() => "");
    const logPreview = logOutput.trim().slice(-4000);
    const logDetails = logPreview ? `\n\nRecent log output:\n${logPreview}` : "";

    return new Error(
        `Failed to start workflow \`${workflow}\`: ${message}\nLog: ${logPath}${logDetails}`,
    );
};

export default tool({
    description:
        "Starts an installed workflow from <target-project>/.mawm/graphs/<workflow> with LangGraph dev mode without opening a browser.",
    args: {
        workflow: tool.schema
            .string()
            .describe("Installed workflow name under <target-project>/.mawm/graphs"),
    },
    async execute({ workflow }, context) {
        if (!WORKFLOW_NAME_PATTERN.test(workflow)) {
            throw new Error(
                `Invalid workflow name: ${workflow}. Expected letters, numbers, dots, underscores, or dashes.`,
            );
        }

        const projectRoot = context.worktree ?? context.directory;
        const workflowRoot = join(projectRoot, ".mawm", "graphs", workflow);
        const workflowMetadataPath = join(workflowRoot, "mawm.json");
        const langgraphConfigPath = join(workflowRoot, "langgraph.json");

        if (!(await exists(workflowRoot))) {
            throw new Error(
                `Installed workflow not found: ${workflowRoot}. Expected it under .mawm/graphs/${workflow}.`,
            );
        }

        if (!(await exists(workflowMetadataPath))) {
            throw new Error(`Missing workflow metadata: ${workflowMetadataPath}`);
        }

        if (!(await exists(langgraphConfigPath))) {
            throw new Error(`Missing LangGraph config: ${langgraphConfigPath}`);
        }

        const logPath = join(workflowRoot, ".langgraph-dev.log");
        const logFile = await open(logPath, "a");

        try {
            await logFile.write(
                `\n[${new Date().toISOString()}] Starting workflow ${workflow} with ${LANGGRAPH_DEV_COMMAND.join(" ")}\n`,
            );

            const child = spawn(LANGGRAPH_DEV_COMMAND[0], LANGGRAPH_DEV_COMMAND.slice(1), {
                cwd: workflowRoot,
                detached: true,
                stdio: ["ignore", logFile.fd, logFile.fd],
            });

            if (child.pid === undefined) {
                throw new Error("LangGraph process did not report a PID.");
            }

            try {
                await waitForStartup(child);
            } catch (error) {
                throw await formatStartupError(workflow, logPath, error);
            }

            child.unref();

            return [
                `Started workflow \`${workflow}\`.`,
                `Project root: ${projectRoot}`,
                `Workflow root: ${workflowRoot}`,
                `PID: ${child.pid}`,
                `Log: ${logPath}`,
                `Command: ${LANGGRAPH_DEV_COMMAND.join(" ")}`,
            ].join("\n");
        } finally {
            await logFile.close();
        }
    },
});

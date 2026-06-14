import { afterAll, describe, expect, test } from "vitest";
import { spawn } from "node:child_process";
import { access, appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
    DEFAULT_AGENT_SERVER_URL,
    buildRunPayload,
    extractAgentServerUrl,
    readAssistantIDs,
    resolveAssistantID,
    summarizeRunResult,
} from "../../src/assets/.config/agents/opencode/tools/execute-graph-lib.ts";
import { type SpawnResult, spawnSync } from "../support/process.js";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const bin = join(root, "bin", "mawm.js");
const sourceTemplates = join(root, "src", "assets", "workflow-templates");
const distTemplates = join(root, "dist", "assets", "workflow-templates");
const temp: string[] = [];
const healthcheckPath = "/ok";
const healthcheckTimeoutMs = 1000;
const initialPort = 32000 + Math.floor(Math.random() * 10000);
const startupTimeoutMs = 15000;
const startupPollMs = 250;
const shutdownTimeoutMs = 5000;
let port = initialPort;

const required = [
    "package.json",
    "langgraph.json",
    join("scripts", "build.js"),
    join("src", "graph", "index.ts"),
    "test",
] as const;

type Meta = {
    readonly agents?: readonly string[];
    readonly displayName: string;
    readonly executionContract: {
        readonly optionalContext: readonly string[];
        readonly optionalInput: readonly string[];
        readonly requiredContext: readonly string[];
        readonly requiredInput: readonly string[];
        readonly supportsResume: boolean;
    };
    readonly id: string;
    readonly kind: string;
    readonly phases?: readonly string[];
};

type RunSummary = {
    readonly interrupt?: unknown;
    readonly runSpecPath?: string;
    readonly status: "completed" | "failed" | "interrupted";
    readonly summary: string;
};

const exists = async (path: string) => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

const json = async <T>(path: string): Promise<T> => {
    return JSON.parse(await readFile(path, "utf8")) as T;
};

const run = (cmd: readonly string[], cwd: string, env?: NodeJS.ProcessEnv): SpawnResult => {
    return spawnSync(cmd, { cwd, env: { ...process.env, ...env } });
};

const ok = (label: string, result: SpawnResult) => {
    if (result.exitCode === 0) {
        return;
    }

    throw new Error(
        `${label} failed with exit code ${result.exitCode}.\nstdout:\n${result.stdout.toString()}\nstderr:\n${result.stderr.toString()}`,
    );
};

const request = async <T>(apiUrl: string, path: string, init: RequestInit): Promise<T> => {
    const response = await fetch(`${apiUrl}${path}`, {
        ...init,
        headers: {
            "content-type": "application/json",
            ...(init.headers ?? {}),
        },
    });

    if (!response.ok) {
        throw new Error(
            `LangGraph API request failed (${response.status} ${response.statusText}) for ${path}: ${await response.text()}`,
        );
    }

    return (await response.json()) as T;
};

const ensureRuntime = async (workflowRoot: string) => {
    if (await exists(join(workflowRoot, "node_modules", "@langchain", "langgraph"))) {
        return;
    }

    ok(
        `runtime install for ${workflowRoot}`,
        run(
            ["npm", "install", "--ignore-scripts", "--no-package-lock", "--no-save", "--omit=dev"],
            workflowRoot,
        ),
    );
};

const nextPort = () => port++;

const waitForServer = async (logPath: string, fallback: string) => {
    const started = Date.now();
    let apiUrl = fallback;

    while (Date.now() - started < startupTimeoutMs) {
        const log = await readFile(logPath, "utf8").catch(() => "");
        apiUrl = extractAgentServerUrl(log, apiUrl);

        try {
            const response = await fetch(`${apiUrl}${healthcheckPath}`, {
                signal: AbortSignal.timeout(healthcheckTimeoutMs),
            });

            if (response.ok) {
                return apiUrl;
            }
        } catch {
            // Wait for the dev server to come up.
        }

        await new Promise((resolve) => setTimeout(resolve, startupPollMs));
    }

    throw new Error(`LangGraph did not become reachable at ${apiUrl}. Log: ${logPath}`);
};

const signal = (pid: number, name: NodeJS.Signals) => {
    for (const target of [pid * -1, pid]) {
        try {
            process.kill(target, name);
        } catch {
            // Best effort.
        }
    }
};

const stop = async (child: ReturnType<typeof spawn>) => {
    if (child.exitCode !== null) {
        return;
    }

    if (child.pid) {
        signal(child.pid, "SIGTERM");
    }
    const stopped = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), shutdownTimeoutMs);
        child.once("exit", () => {
            clearTimeout(timer);
            resolve(true);
        });
    });

    if (!stopped && child.exitCode === null && child.pid) {
        signal(child.pid, "SIGKILL");
        await new Promise((resolve) => child.once("exit", resolve));
    }
};

const launch = async (
    workflowRoot: string,
    input?: Record<string, unknown>,
    context?: Record<string, unknown>,
): Promise<RunSummary> => {
    await ensureRuntime(workflowRoot);

    const logPath = join(workflowRoot, ".langgraph-dev.log");
    const value = nextPort();
    const apiUrl = DEFAULT_AGENT_SERVER_URL.replace(String(2024), String(value));
    await writeFile(logPath, "");
    const child = spawn(
        "npx",
        ["--yes", "@langchain/langgraph-cli", "dev", "--no-browser", "--port", String(value)],
        {
            cwd: workflowRoot,
            detached: true,
            env: {
                ...process.env,
            },
            stdio: ["ignore", "pipe", "pipe"],
        },
    );
    child.stdout?.on("data", async (chunk) => {
        await appendFile(logPath, chunk);
    });
    child.stderr?.on("data", async (chunk) => {
        await appendFile(logPath, chunk);
    });

    try {
        const serverUrl = await waitForServer(logPath, apiUrl);
        const langgraph = await readFile(join(workflowRoot, "langgraph.json"), "utf8");
        const assistantID = resolveAssistantID(readAssistantIDs(langgraph));
        const thread = await request<{ thread_id?: string }>(serverUrl, "/threads", {
            body: JSON.stringify({}),
            method: "POST",
        });

        if (!thread.thread_id) {
            throw new Error("LangGraph thread creation did not return a thread_id.");
        }

        const output = await request<Record<string, unknown>>(
            serverUrl,
            `/threads/${thread.thread_id}/runs/wait`,
            {
                body: JSON.stringify({
                    assistant_id: assistantID,
                    ...buildRunPayload({
                        context,
                        input,
                    }),
                }),
                method: "POST",
            },
        );

        const result = summarizeRunResult(output);

        if (result.status === "failed") {
            throw new Error(
                `Workflow run failed for ${workflowRoot}: ${result.summary}\nOutput:\n${JSON.stringify(output, null, 2)}\nLog:\n${await readFile(logPath, "utf8").catch(() => "")}`,
            );
        }

        return result;
    } finally {
        await stop(child);
    }
};

const createInitiativeSpec = async (dir: string) => {
    const path = join(dir, "initiative-spec.md");
    await writeFile(
        path,
        [
            "# Demo Initiative - Initiative Spec Sheet",
            "",
            "## Target State",
            "",
            "A reusable initiative workflow template exists.",
            "",
            "## Initiative-wide Contracts",
            "",
            "- Preserve the initiative-run contract shape.",
            "",
            "## Execution Plan",
            "",
            "### Run 1: First runnable template (`initiative-template`)",
            "",
            "- [ ] complete",
            "- Run spec path: `.mawm/runs/run-1/spec.md`",
            "- Task: Materialize the selected run spec from initiative context.",
            "- Current state:",
            "  - The initiative template does not exist yet.",
            "- Outcome:",
            "  - The initiative template writes a runnable run spec.",
            "- Scope:",
            "  - Add the initiative template graph and tests.",
            "- Out of scope:",
            "  - No coding-specific prompts.",
            "- Contracts:",
            "  - Keep the workflow template generic.",
            "- Verification commands:",
            "  - `bun run typecheck`",
            "  - `bun run build`",
            "  - `bun run test`",
            "- Smoke verification: `headless` - Run the template test suite.",
        ].join("\n"),
    );
    return path;
};

afterAll(async () => {
    await Promise.all(temp.map(async (path) => rm(path, { force: true, recursive: true })));
});

describe("workflow template distribution", () => {
    test("builds scaffold-ready template assets and proves install plus launch coverage", async () => {
        ok("repo build", run(["bun", "run", "build"], root));

        for (const variant of ["base", "initiative"] as const) {
            const sourceMeta = await json<Meta>(join(sourceTemplates, variant, "mawm.json"));
            const distMeta = await json<Meta>(join(distTemplates, variant, "mawm.json"));

            if (variant === "base") {
                expect(sourceMeta).toMatchObject({ agents: ["agent"] });
            }

            if (variant === "initiative") {
                expect(sourceMeta).toMatchObject({
                    agents: ["agent"],
                    phases: ["planning", "implementing"],
                });
            }

            expect(distMeta).toEqual(sourceMeta);
            const pkg = await json<{
                readonly devDependencies?: {
                    readonly vitest?: string;
                };
                readonly scripts?: {
                    readonly test?: string;
                };
            }>(join(distTemplates, variant, "package.json"));

            expect(pkg.scripts?.test).toBe("vitest run");
            expect(pkg.devDependencies?.vitest).toBeDefined();

            for (const path of required) {
                expect(await exists(join(distTemplates, variant, path))).toBe(true);
            }
        }

        expect(await exists(join(root, "dist", "assets", ".mawm.project-local", "graphs"))).toBe(
            false,
        );

        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const repo = await mkdtemp(join(tmpdir(), "mawm-repo-"));
        temp.push(home, repo);
        await writeFile(join(repo, "README.md"), "# Demo\n");

        const env = { HOME: home };
        ok(
            "install base-template",
            run(["bun", bin, "install", join(distTemplates, "base")], root, env),
        );
        ok(
            "install initiative-template",
            run(["bun", bin, "install", join(distTemplates, "initiative")], root, env),
        );

        const baseRoot = join(home, ".config", "mawm", "base-template");
        const initiativeRoot = join(home, ".config", "mawm", "initiative-template");
        expect(await json<Meta>(join(baseRoot, "mawm.json"))).toEqual(
            await json<Meta>(join(distTemplates, "base", "mawm.json")),
        );
        expect(await json<Meta>(join(initiativeRoot, "mawm.json"))).toEqual(
            await json<Meta>(join(distTemplates, "initiative", "mawm.json")),
        );
        expect(await readFile(join(baseRoot, "langgraph.json"), "utf8")).toBe(
            await readFile(join(distTemplates, "base", "langgraph.json"), "utf8"),
        );
        expect(await readFile(join(initiativeRoot, "langgraph.json"), "utf8")).toBe(
            await readFile(join(distTemplates, "initiative", "langgraph.json"), "utf8"),
        );
        expect(
            await json<{
                readonly scripts?: {
                    readonly test?: string;
                };
            }>(join(baseRoot, "package.json")),
        ).toEqual(
            expect.objectContaining({
                scripts: expect.objectContaining({
                    test: "vitest run",
                }),
            }),
        );
        expect(
            await json<{
                readonly scripts?: {
                    readonly test?: string;
                };
            }>(join(initiativeRoot, "package.json")),
        ).toEqual(
            expect.objectContaining({
                scripts: expect.objectContaining({
                    test: "vitest run",
                }),
            }),
        );

        const baseRun = await launch(baseRoot, {});
        expect(baseRun.status).toBe("completed");
        expect(baseRun.summary).toBe("Standalone workflow completed.");

        const initiativeSpecPath = await createInitiativeSpec(repo);
        const runSpecPath = join(repo, ".mawm", "runs", "run-1", "spec.md");
        const initiativeRun = await launch(
            initiativeRoot,
            {
                initiativeSpecPath,
                runSpecPath,
            },
            {
                initiativeBranch: "initiative/workflow-templates",
                targetRepoPath: repo,
            },
        );

        expect(initiativeRun.status).toBe("completed");
        expect(initiativeRun.interrupt).toBeUndefined();
        expect(initiativeRun.runSpecPath).toBe(runSpecPath);
        expect(await exists(join(repo, ".mawm", "graphs"))).toBe(false);
        expect(await readFile(runSpecPath, "utf8")).toContain(
            "# Run Spec: Run 1: First runnable template",
        );
        expect(await readFile(runSpecPath, "utf8")).toContain("initiative/workflow-templates");
    }, 300000);
});

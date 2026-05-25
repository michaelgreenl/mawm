import { afterAll, describe, expect, test } from "vitest";
import { spawn } from "node:child_process";
import { access, appendFile, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
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
const shared = join(sourceTemplates, "shared");
const temp: string[] = [];
const healthcheckPath = "/ok";
const healthcheckTimeoutMs = 1000;
const initialPort = 32000 + Math.floor(Math.random() * 10000);
const startupTimeoutMs = 15000;
const startupPollMs = 250;
const shutdownTimeoutMs = 5000;
let port = initialPort;

type Overlay = {
    readonly variant: string;
    readonly variantOwnedPaths: readonly string[];
};

type Meta = {
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

const files = async (dir: string): Promise<string[]> => {
    const entries = await readdir(dir, { withFileTypes: true });
    const values = await Promise.all(
        entries.map(async (entry) => {
            const path = join(dir, entry.name);

            if (entry.isDirectory()) {
                return files(path);
            }

            return [path];
        }),
    );

    return values.flat();
};

const overlayFiles = async (variant: string): Promise<string[]> => {
    const dir = join(sourceTemplates, variant);
    const overlay = await json<Overlay>(join(dir, "overlay.json"));
    const values = await Promise.all(
        overlay.variantOwnedPaths.map(async (path) => {
            const full = join(dir, path);
            const entries = await files(full).catch(() => []);
            return entries.length > 0 ? entries : [full];
        }),
    );

    return values.flat();
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
            "  - `bun test`",
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

        expect(await exists(join(distTemplates, "shared"))).toBe(false);

        for (const variant of ["base", "initiative"] as const) {
            const sourceMeta = await json<Meta>(join(sourceTemplates, variant, "mawm.json"));
            const distMeta = await json<Meta>(join(distTemplates, variant, "mawm.json"));
            const expected = [...(await files(shared)), ...(await overlayFiles(variant))]
                .map((path) =>
                    relative(
                        path.startsWith(shared) ? shared : join(sourceTemplates, variant),
                        path,
                    ),
                )
                .filter((path, index, values) => values.indexOf(path) === index)
                .sort();
            const actual = (await files(join(distTemplates, variant)))
                .map((path) => relative(join(distTemplates, variant), path))
                .sort();

            expect(actual).toEqual(expected);
            expect(distMeta).toEqual(sourceMeta);
            expect(await exists(join(distTemplates, variant, "package.json"))).toBe(true);
            expect(await exists(join(distTemplates, variant, "langgraph.json"))).toBe(true);
            expect(await exists(join(distTemplates, variant, "langgraph.dist.json"))).toBe(false);
            expect(await exists(join(distTemplates, variant, "scripts", "build.js"))).toBe(true);
            expect(await exists(join(distTemplates, variant, "src", "graph", "index.ts"))).toBe(
                true,
            );
            expect(await exists(join(distTemplates, variant, "test"))).toBe(true);
        }

        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const project = await mkdtemp(join(tmpdir(), "mawm-project-"));
        const repo = await mkdtemp(join(tmpdir(), "mawm-repo-"));
        temp.push(home, project, repo);
        await writeFile(join(repo, "README.md"), "# Demo\n");

        const env = { HOME: home };
        ok(
            "global install base-template",
            run(["bun", bin, "install", "-g", join(distTemplates, "base")], root, env),
        );
        ok(
            "global install initiative-template",
            run(["bun", bin, "install", "-g", join(distTemplates, "initiative")], root, env),
        );
        ok(
            "project install base-template",
            run(["bun", bin, "install", "base-template"], project, env),
        );
        ok(
            "project install initiative-template",
            run(["bun", bin, "install", "initiative-template"], project, env),
        );

        const baseRoot = join(project, ".mawm", "graphs", "base-template");
        const initiativeRoot = join(project, ".mawm", "graphs", "initiative-template");
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
        expect(await readFile(runSpecPath, "utf8")).toContain(
            "# Run Spec: Run 1: First runnable template",
        );
        expect(await readFile(runSpecPath, "utf8")).toContain("initiative/workflow-templates");
    }, 300000);
});

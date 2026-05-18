import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { parseCommand } from "../../src/cli/parsers/cmd.js";
import type { CommandContext } from "../../src/types/interfaces/command.d.js";

const tempRoots: string[] = [];

const readJson = async <T>(path: string): Promise<T> => {
    return JSON.parse(await readFile(path, "utf8")) as T;
};

const captureOutput = async (run: () => Promise<number>) => {
    let stdout = "";
    let stderr = "";
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;

    process.stdout.write = ((chunk: string | Uint8Array) => {
        stdout += chunk.toString();
        return true;
    }) as typeof process.stdout.write;

    process.stderr.write = ((chunk: string | Uint8Array) => {
        stderr += chunk.toString();
        return true;
    }) as typeof process.stderr.write;

    try {
        const exitCode = await run();
        return { exitCode, stderr, stdout };
    } finally {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    }
};

const createContext = (cwd: string, home: string, rawArgs: readonly string[]): CommandContext => ({
    cwd,
    env: { HOME: home },
    rawArgs: [...rawArgs],
});

describe("install command", () => {
    afterEach(async () => {
        await Promise.all(
            tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
        );
    });

    test("installs a global workflow from the current dist directory and generates mawm.json", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const workflowRoot = await mkdtemp(join(tmpdir(), "mawm-workflow-"));
        tempRoots.push(home, workflowRoot);

        const distRoot = join(workflowRoot, "dist");
        await mkdir(distRoot, { recursive: true });
        await writeFile(
            join(workflowRoot, "langgraph.json"),
            `${JSON.stringify({ graphs: { demo: "./dist/index.js:graph" } }, null, 2)}\n`,
        );
        await writeFile(
            join(workflowRoot, "package.json"),
            `${JSON.stringify({ name: "demo-workflow", version: "1.2.3" }, null, 2)}\n`,
        );
        await writeFile(join(distRoot, "index.js"), "export const graph = {};\n");

        const rawArgs = ["install", "-g"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(distRoot, home, rawArgs)),
        );

        const installedWorkflowRoot = join(home, ".config", "mawm", "demo-workflow");

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: `Installed workflow \`demo-workflow\` into ${installedWorkflowRoot}.\n`,
        });
        expect(await readJson(join(installedWorkflowRoot, "mawm.json"))).toEqual({
            displayName: "demo-workflow",
            id: "demo-workflow",
            workflowVersion: "1.2.3",
        });
        expect(await readFile(join(installedWorkflowRoot, "langgraph.json"), "utf8")).toBe(
            await readFile(join(workflowRoot, "langgraph.json"), "utf8"),
        );
        expect(await readFile(join(installedWorkflowRoot, "dist", "index.js"), "utf8")).toBe(
            "export const graph = {};\n",
        );
        expect(await readJson(join(home, ".config", "mawm", "manifest.json"))).toEqual([
            {
                absolutePath: distRoot,
                displayName: "demo-workflow",
                id: "demo-workflow",
                path: "./demo-workflow",
                workflowVersion: "1.2.3",
            },
        ]);
    });

    test("installs a globally available workflow into the target project without an absolute path", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const globalWorkflowRoot = join(home, ".config", "mawm", "demo-workflow");
        await mkdir(join(globalWorkflowRoot, "dist"), { recursive: true });
        await writeFile(
            join(globalWorkflowRoot, "mawm.json"),
            `${JSON.stringify(
                {
                    id: "demo-workflow",
                    displayName: "Demo Workflow",
                    workflowVersion: "2.0.0",
                },
                null,
                2,
            )}\n`,
        );
        await writeFile(
            join(globalWorkflowRoot, "langgraph.json"),
            `${JSON.stringify({ graphs: { demo: "./dist/index.js:graph" } }, null, 2)}\n`,
        );
        await writeFile(join(globalWorkflowRoot, "dist", "index.js"), "export const graph = {};\n");

        const rawArgs = ["install", "demo-workflow"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        const installedWorkflowRoot = join(projectRoot, ".mawm", "graphs", "demo-workflow");

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Installed workflow `demo-workflow` into .mawm/graphs/demo-workflow.\n",
        });
        expect(await readFile(join(installedWorkflowRoot, "dist", "index.js"), "utf8")).toBe(
            "export const graph = {};\n",
        );
        expect(await readJson(join(projectRoot, ".mawm", "graphs", "manifest.json"))).toEqual([
            {
                displayName: "Demo Workflow",
                id: "demo-workflow",
                path: "./demo-workflow",
                workflowVersion: "2.0.0",
            },
        ]);
    });

    test("no longer exposes the register command", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["register", "./dist"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain("Unknown command: register");
    });
});

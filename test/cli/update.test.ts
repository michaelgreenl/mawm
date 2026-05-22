import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { parseCommand } from "../../src/utils/parsers/cmd.js";
import type { CommandContext } from "../../src/utils/types/command.d.js";

const tempRoots: string[] = [];

const readJson = async <T>(path: string): Promise<T> => {
    return JSON.parse(await readFile(path, "utf8")) as T;
};

const writeJson = async (path: string, value: unknown): Promise<void> => {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

const pathExists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
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

const defaultExecutionContract = {
    optionalContext: [],
    optionalInput: [],
    requiredContext: [],
    requiredInput: [],
    supportsResume: false,
};

const defaultWorkflowMetadata = {
    executionContract: defaultExecutionContract,
    kind: "standalone",
};

describe("update command", () => {
    afterEach(async () => {
        await Promise.all(
            tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
        );
    });

    test("accepts the `u` alias", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["u", "--help"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Usage: mawm {u,update} [-g] [workflow] - Reinstalls workflows into a project or into user config\n",
        });
    });

    test("updates a project workflow by fully replacing the installed files", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const globalWorkflowRoot = join(home, ".config", "mawm", "demo-workflow");
        await mkdir(join(globalWorkflowRoot, "dist"), { recursive: true });
        await writeJson(join(globalWorkflowRoot, "mawm.json"), {
            displayName: "Demo Workflow",
            id: "demo-workflow",
            workflowVersion: "2.0.0",
        });
        await writeJson(join(globalWorkflowRoot, "langgraph.json"), {
            graphs: { demo: "./dist/index.js:graph" },
        });
        await writeFile(
            join(globalWorkflowRoot, "dist", "index.js"),
            "export const graph = 'new';\n",
        );

        const projectGraphsRoot = join(projectRoot, ".mawm", "graphs");
        const projectWorkflowRoot = join(projectGraphsRoot, "demo-workflow");
        await mkdir(join(projectWorkflowRoot, "dist"), { recursive: true });
        await writeFile(
            join(projectWorkflowRoot, "dist", "index.js"),
            "export const graph = 'old';\n",
        );
        await writeFile(
            join(projectWorkflowRoot, "dist", "stale.js"),
            "export const stale = true;\n",
        );
        await writeJson(join(projectGraphsRoot, "manifest.json"), [
            {
                displayName: "Old Demo Workflow",
                id: "demo-workflow",
                path: "./demo-workflow",
                workflowVersion: "1.0.0",
            },
        ]);

        const rawArgs = ["update", "demo-workflow"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Updated workflow `demo-workflow` in .mawm/graphs/demo-workflow.\n",
        });
        expect(await readJson(join(projectWorkflowRoot, "mawm.json"))).toEqual({
            displayName: "Demo Workflow",
            ...defaultWorkflowMetadata,
            id: "demo-workflow",
            workflowVersion: "2.0.0",
        });
        expect(await readFile(join(projectWorkflowRoot, "dist", "index.js"), "utf8")).toBe(
            "export const graph = 'new';\n",
        );
        expect(await pathExists(join(projectWorkflowRoot, "dist", "stale.js"))).toBe(false);
        expect(await readJson(join(projectGraphsRoot, "manifest.json"))).toEqual([
            {
                displayName: "Demo Workflow",
                ...defaultWorkflowMetadata,
                id: "demo-workflow",
                path: "./demo-workflow",
                workflowVersion: "2.0.0",
            },
        ]);
    });

    test("updates all project workflows from manifest entries and continues after failures", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const globalAlphaRoot = join(home, ".config", "mawm", "alpha");
        await mkdir(join(globalAlphaRoot, "dist"), { recursive: true });
        await writeJson(join(globalAlphaRoot, "mawm.json"), {
            displayName: "Alpha Workflow",
            id: "alpha",
            workflowVersion: "3.0.0",
        });
        await writeJson(join(globalAlphaRoot, "langgraph.json"), {
            graphs: { alpha: "./dist/index.js:graph" },
        });
        await writeFile(
            join(globalAlphaRoot, "dist", "index.js"),
            "export const graph = 'alpha-new';\n",
        );

        const projectGraphsRoot = join(projectRoot, ".mawm", "graphs");
        const alphaProjectRoot = join(projectGraphsRoot, "alpha");
        const betaProjectRoot = join(projectGraphsRoot, "beta");
        const ignoredProjectRoot = join(projectGraphsRoot, "ignored");
        await mkdir(join(alphaProjectRoot, "dist"), { recursive: true });
        await mkdir(join(betaProjectRoot, "dist"), { recursive: true });
        await mkdir(join(ignoredProjectRoot, "dist"), { recursive: true });
        await writeFile(
            join(alphaProjectRoot, "dist", "index.js"),
            "export const graph = 'alpha-old';\n",
        );
        await writeFile(join(alphaProjectRoot, "dist", "stale.js"), "export const stale = true;\n");
        await writeFile(
            join(betaProjectRoot, "dist", "index.js"),
            "export const graph = 'beta-old';\n",
        );
        await writeFile(
            join(ignoredProjectRoot, "dist", "index.js"),
            "export const graph = 'ignored';\n",
        );
        await writeJson(join(projectGraphsRoot, "manifest.json"), [
            {
                displayName: "Alpha Workflow",
                id: "alpha",
                path: "./alpha",
                workflowVersion: "1.0.0",
            },
            {
                displayName: "Beta Workflow",
                id: "beta",
                path: "./beta",
                workflowVersion: "1.0.0",
            },
        ]);

        const rawArgs = ["update"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain("Updated workflow `alpha` in .mawm/graphs/alpha.\n");
        expect(result.stderr).toContain("beta");
        expect(await readFile(join(alphaProjectRoot, "dist", "index.js"), "utf8")).toBe(
            "export const graph = 'alpha-new';\n",
        );
        expect(await pathExists(join(alphaProjectRoot, "dist", "stale.js"))).toBe(false);
        expect(await readFile(join(betaProjectRoot, "dist", "index.js"), "utf8")).toBe(
            "export const graph = 'beta-old';\n",
        );
        expect(await readFile(join(ignoredProjectRoot, "dist", "index.js"), "utf8")).toBe(
            "export const graph = 'ignored';\n",
        );
    });

    test("updates a global workflow from its manifest absolute path and fully replaces installed files", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const sourceWorkflowRoot = await mkdtemp(join(tmpdir(), "mawm-source-"));
        tempRoots.push(home, sourceWorkflowRoot);

        const sourceDistRoot = join(sourceWorkflowRoot, "dist");
        await mkdir(sourceDistRoot, { recursive: true });
        await writeJson(join(sourceWorkflowRoot, "package.json"), {
            name: "demo-workflow",
            version: "4.0.0",
        });
        await writeJson(join(sourceWorkflowRoot, "langgraph.json"), {
            graphs: { demo: "./dist/index.js:graph" },
        });
        await writeFile(join(sourceDistRoot, "index.js"), "export const graph = 'global-new';\n");

        const globalWorkflowRoot = join(home, ".config", "mawm", "demo-workflow");
        await mkdir(join(globalWorkflowRoot, "dist"), { recursive: true });
        await writeJson(join(globalWorkflowRoot, "mawm.json"), {
            displayName: "Old Demo Workflow",
            id: "demo-workflow",
            workflowVersion: "1.0.0",
        });
        await writeJson(join(globalWorkflowRoot, "langgraph.json"), {
            graphs: { demo: "./dist/old.js:graph" },
        });
        await writeFile(
            join(globalWorkflowRoot, "dist", "index.js"),
            "export const graph = 'global-old';\n",
        );
        await writeFile(
            join(globalWorkflowRoot, "dist", "stale.js"),
            "export const stale = true;\n",
        );
        await writeJson(join(home, ".config", "mawm", "manifest.json"), [
            {
                absolutePath: sourceDistRoot,
                displayName: "Old Demo Workflow",
                id: "demo-workflow",
                path: "./demo-workflow",
                workflowVersion: "1.0.0",
            },
        ]);

        const rawArgs = ["update", "-g", "demo-workflow"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(home, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: `Updated workflow \`demo-workflow\` in ${globalWorkflowRoot}.\n`,
        });
        expect(await readFile(join(globalWorkflowRoot, "dist", "index.js"), "utf8")).toBe(
            "export const graph = 'global-new';\n",
        );
        expect(await pathExists(join(globalWorkflowRoot, "dist", "stale.js"))).toBe(false);
        expect(await readJson(join(globalWorkflowRoot, "mawm.json"))).toEqual({
            displayName: "demo-workflow",
            ...defaultWorkflowMetadata,
            id: "demo-workflow",
            workflowVersion: "4.0.0",
        });
        expect(await readJson(join(home, ".config", "mawm", "manifest.json"))).toEqual([
            {
                absolutePath: sourceDistRoot,
                displayName: "demo-workflow",
                ...defaultWorkflowMetadata,
                id: "demo-workflow",
                path: "./demo-workflow",
                workflowVersion: "4.0.0",
            },
        ]);
    });

    test("updates a global workflow when absolutePath points at a dist directory with parent metadata", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const sourceWorkflowRoot = await mkdtemp(join(tmpdir(), "mawm-source-"));
        tempRoots.push(home, sourceWorkflowRoot);

        const sourceDistRoot = join(sourceWorkflowRoot, "dist");
        await mkdir(sourceDistRoot, { recursive: true });
        await writeJson(join(sourceWorkflowRoot, "package.json"), {
            name: "coding",
            version: "4.2.0",
        });
        await writeJson(join(sourceDistRoot, "langgraph.json"), {
            graphs: { coding: "./index.js:graph" },
        });
        await writeFile(join(sourceDistRoot, "index.js"), "export const graph = 'global-new';\n");

        const globalWorkflowRoot = join(home, ".config", "mawm", "coding");
        await mkdir(join(globalWorkflowRoot, "dist"), { recursive: true });
        await writeJson(join(globalWorkflowRoot, "mawm.json"), {
            displayName: "coding",
            id: "coding",
            workflowVersion: "1.0.0",
        });
        await writeJson(join(globalWorkflowRoot, "langgraph.json"), {
            graphs: { coding: "./dist/old.js:graph" },
        });
        await writeFile(
            join(globalWorkflowRoot, "dist", "index.js"),
            "export const graph = 'global-old';\n",
        );
        await writeJson(join(home, ".config", "mawm", "manifest.json"), [
            {
                absolutePath: sourceDistRoot,
                displayName: "coding",
                id: "coding",
                path: "./coding",
                workflowVersion: "1.0.0",
            },
        ]);

        const rawArgs = ["update", "-g", "coding"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(home, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: `Updated workflow \`coding\` in ${globalWorkflowRoot}.\n`,
        });
        expect(await readFile(join(globalWorkflowRoot, "index.js"), "utf8")).toBe(
            "export const graph = 'global-new';\n",
        );
        expect(await pathExists(join(globalWorkflowRoot, "dist", "index.js"))).toBe(false);
        expect(await readJson(join(globalWorkflowRoot, "mawm.json"))).toEqual({
            displayName: "coding",
            ...defaultWorkflowMetadata,
            id: "coding",
            workflowVersion: "4.2.0",
        });
        expect(await readJson(join(home, ".config", "mawm", "manifest.json"))).toEqual([
            {
                absolutePath: sourceDistRoot,
                displayName: "coding",
                ...defaultWorkflowMetadata,
                id: "coding",
                path: "./coding",
                workflowVersion: "4.2.0",
            },
        ]);
    });

    test("updates all global workflows from manifest entries and reports missing absolute paths", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const sourceWorkflowRoot = await mkdtemp(join(tmpdir(), "mawm-source-"));
        tempRoots.push(home, sourceWorkflowRoot);

        const sourceDistRoot = join(sourceWorkflowRoot, "dist");
        await mkdir(sourceDistRoot, { recursive: true });
        await writeJson(join(sourceWorkflowRoot, "package.json"), {
            name: "alpha",
            version: "2.0.0",
        });
        await writeJson(join(sourceWorkflowRoot, "langgraph.json"), {
            graphs: { alpha: "./dist/index.js:graph" },
        });
        await writeFile(join(sourceDistRoot, "index.js"), "export const graph = 'alpha-new';\n");

        const alphaGlobalRoot = join(home, ".config", "mawm", "alpha");
        const betaGlobalRoot = join(home, ".config", "mawm", "beta");
        await mkdir(join(alphaGlobalRoot, "dist"), { recursive: true });
        await mkdir(join(betaGlobalRoot, "dist"), { recursive: true });
        await writeFile(
            join(alphaGlobalRoot, "dist", "index.js"),
            "export const graph = 'alpha-old';\n",
        );
        await writeFile(
            join(betaGlobalRoot, "dist", "index.js"),
            "export const graph = 'beta-old';\n",
        );
        await writeJson(join(home, ".config", "mawm", "manifest.json"), [
            {
                absolutePath: sourceDistRoot,
                displayName: "Alpha",
                id: "alpha",
                path: "./alpha",
                workflowVersion: "1.0.0",
            },
            {
                displayName: "Beta",
                id: "beta",
                path: "./beta",
                workflowVersion: "1.0.0",
            },
        ]);

        const rawArgs = ["update", "-g"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(home, home, rawArgs)),
        );

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(`Updated workflow \`alpha\` in ${alphaGlobalRoot}.\n`);
        expect(result.stderr).toContain("beta");
        expect(result.stderr).toContain("reinstall");
        expect(result.stderr).toContain("remove");
        expect(await readFile(join(alphaGlobalRoot, "dist", "index.js"), "utf8")).toBe(
            "export const graph = 'alpha-new';\n",
        );
        expect(await readFile(join(betaGlobalRoot, "dist", "index.js"), "utf8")).toBe(
            "export const graph = 'beta-old';\n",
        );
    });

    test("errors when the workflow is not installed in the project manifest", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const globalWorkflowRoot = join(home, ".config", "mawm", "demo-workflow");
        await mkdir(join(globalWorkflowRoot, "dist"), { recursive: true });
        await writeJson(join(globalWorkflowRoot, "mawm.json"), {
            displayName: "Demo Workflow",
            id: "demo-workflow",
            workflowVersion: "1.0.0",
        });
        await writeJson(join(globalWorkflowRoot, "langgraph.json"), {
            graphs: { demo: "./dist/index.js:graph" },
        });
        await writeFile(
            join(globalWorkflowRoot, "dist", "index.js"),
            "export const graph = 'new';\n",
        );
        await mkdir(join(projectRoot, ".mawm", "graphs"), { recursive: true });
        await writeJson(join(projectRoot, ".mawm", "graphs", "manifest.json"), []);

        const rawArgs = ["update", "demo-workflow"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain("demo-workflow");
        expect(result.stderr).toContain("not installed in this project");
        expect(await pathExists(join(projectRoot, ".mawm", "graphs", "demo-workflow"))).toBe(false);
    });
});

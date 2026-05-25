import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { parseCommand } from "../../src/utils/parsers/cmd.js";
import { captureOutput } from "../support/capture.js";
import { createContext } from "../support/context.js";
import { readJson } from "../support/fs.js";

const tempRoots: string[] = [];

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
            ...defaultWorkflowMetadata,
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
                ...defaultWorkflowMetadata,
                id: "demo-workflow",
                path: "./demo-workflow",
                workflowVersion: "1.2.3",
            },
        ]);
    });

    test("installs a global workflow from a dist directory when package metadata lives in the parent", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const workflowRoot = await mkdtemp(join(tmpdir(), "mawm-workflow-"));
        tempRoots.push(home, workflowRoot);

        const distRoot = join(workflowRoot, "dist");
        await mkdir(distRoot, { recursive: true });
        await writeFile(
            join(workflowRoot, "package.json"),
            `${JSON.stringify({ name: "coding", version: "1.2.3" }, null, 2)}\n`,
        );
        await writeFile(
            join(distRoot, "langgraph.json"),
            `${JSON.stringify({ graphs: { coding: "./index.js:graph" } }, null, 2)}\n`,
        );
        await writeFile(join(distRoot, "index.js"), "export const graph = {};\n");

        const rawArgs = ["install", "-g"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(distRoot, home, rawArgs)),
        );

        const installedWorkflowRoot = join(home, ".config", "mawm", "coding");

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: `Installed workflow \`coding\` into ${installedWorkflowRoot}.\n`,
        });
        expect(await readJson(join(installedWorkflowRoot, "mawm.json"))).toEqual({
            displayName: "coding",
            ...defaultWorkflowMetadata,
            id: "coding",
            workflowVersion: "1.2.3",
        });
        expect(await readFile(join(installedWorkflowRoot, "langgraph.json"), "utf8")).toBe(
            await readFile(join(distRoot, "langgraph.json"), "utf8"),
        );
        expect(await readFile(join(installedWorkflowRoot, "index.js"), "utf8")).toBe(
            "export const graph = {};\n",
        );
        expect(await readJson(join(home, ".config", "mawm", "manifest.json"))).toEqual([
            {
                absolutePath: distRoot,
                displayName: "coding",
                ...defaultWorkflowMetadata,
                id: "coding",
                path: "./coding",
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
        expect(await readJson(join(installedWorkflowRoot, "mawm.json"))).toEqual({
            displayName: "Demo Workflow",
            ...defaultWorkflowMetadata,
            id: "demo-workflow",
            workflowVersion: "2.0.0",
        });
        expect(await readFile(join(installedWorkflowRoot, "dist", "index.js"), "utf8")).toBe(
            "export const graph = {};\n",
        );
        expect(await readJson(join(projectRoot, ".mawm", "graphs", "manifest.json"))).toEqual([
            {
                displayName: "Demo Workflow",
                ...defaultWorkflowMetadata,
                id: "demo-workflow",
                path: "./demo-workflow",
                workflowVersion: "2.0.0",
            },
        ]);
    });

    test("installs a flat globally available workflow into the target project", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const globalWorkflowRoot = join(home, ".config", "mawm", "coding");
        await mkdir(globalWorkflowRoot, { recursive: true });
        await writeFile(
            join(globalWorkflowRoot, "mawm.json"),
            `${JSON.stringify(
                {
                    id: "coding",
                    displayName: "Coding Workflow",
                    workflowVersion: "3.0.0",
                },
                null,
                2,
            )}\n`,
        );
        await writeFile(
            join(globalWorkflowRoot, "langgraph.json"),
            `${JSON.stringify({ graphs: { coding: "./graph.js:graph" } }, null, 2)}\n`,
        );
        await writeFile(join(globalWorkflowRoot, "graph.js"), "export const graph = {};\n");

        const rawArgs = ["install", "coding"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        const installedWorkflowRoot = join(projectRoot, ".mawm", "graphs", "coding");

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Installed workflow `coding` into .mawm/graphs/coding.\n",
        });
        expect(await readFile(join(installedWorkflowRoot, "graph.js"), "utf8")).toBe(
            "export const graph = {};\n",
        );
        expect(await readFile(join(installedWorkflowRoot, "langgraph.json"), "utf8")).toBe(
            await readFile(join(globalWorkflowRoot, "langgraph.json"), "utf8"),
        );
        expect(await readJson(join(projectRoot, ".mawm", "graphs", "manifest.json"))).toEqual([
            {
                displayName: "Coding Workflow",
                ...defaultWorkflowMetadata,
                id: "coding",
                path: "./coding",
                workflowVersion: "3.0.0",
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

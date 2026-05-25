import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { runCli } from "../support/cli.js";
import { pathExists, readJson, writeJson } from "../support/fs.js";
import { trackRoots } from "../support/tmp.js";
import { manifestEntry, metadata } from "../support/workflow.js";

const roots = trackRoots();

describe("install command", () => {
    afterEach(async () => {
        await roots.cleanup();
    });

    test("accepts the `i` alias", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["i", "--help"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Usage: mawm {i,install} [-g] [workflow-or-path] - Installs workflows globally or into a target project\n",
        });
    });

    test("installs a global workflow from the current dist directory and writes current metadata", async () => {
        const home = await roots.dir("mawm-home-");
        const workflowRoot = await roots.dir("mawm-workflow-");

        const distRoot = join(workflowRoot, "dist");
        await mkdir(distRoot, { recursive: true });
        await writeJson(join(workflowRoot, "langgraph.json"), {
            graphs: { demo: "./dist/index.js:graph" },
        });
        await writeJson(join(workflowRoot, "package.json"), {
            name: "demo-workflow",
            version: "1.2.3",
        });
        await writeFile(join(distRoot, "index.js"), "export const graph = {};\n");

        const result = await runCli(distRoot, home, ["install", "-g"]);

        const root = join(home, ".config", "mawm", "demo-workflow");

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: `Installed workflow \`demo-workflow\` into ${root}.\n`,
        });
        expect(await readJson(join(root, "mawm.json"))).toEqual(
            metadata({ id: "demo-workflow", workflowVersion: "1.2.3" }),
        );
        expect(await pathExists(join(root, "langgraph.json"))).toBe(true);
        expect(await pathExists(join(root, "dist", "index.js"))).toBe(true);
        expect(await readJson(join(home, ".config", "mawm", "manifest.json"))).toEqual([
            manifestEntry({
                absolutePath: distRoot,
                id: "demo-workflow",
                workflowVersion: "1.2.3",
            }),
        ]);
    });

    test("installs a global workflow from a dist directory when package metadata lives in the parent", async () => {
        const home = await roots.dir("mawm-home-");
        const workflowRoot = await roots.dir("mawm-workflow-");

        const distRoot = join(workflowRoot, "dist");
        await mkdir(distRoot, { recursive: true });
        await writeJson(join(workflowRoot, "package.json"), {
            name: "coding",
            version: "1.2.3",
        });
        await writeJson(join(distRoot, "langgraph.json"), {
            graphs: { coding: "./index.js:graph" },
        });
        await writeFile(join(distRoot, "index.js"), "export const graph = {};\n");

        const result = await runCli(distRoot, home, ["install", "-g"]);

        const root = join(home, ".config", "mawm", "coding");

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: `Installed workflow \`coding\` into ${root}.\n`,
        });
        expect(await readJson(join(root, "mawm.json"))).toEqual(
            metadata({ id: "coding", workflowVersion: "1.2.3" }),
        );
        expect(await pathExists(join(root, "langgraph.json"))).toBe(true);
        expect(await pathExists(join(root, "index.js"))).toBe(true);
        expect(await readJson(join(home, ".config", "mawm", "manifest.json"))).toEqual([
            manifestEntry({ absolutePath: distRoot, id: "coding", workflowVersion: "1.2.3" }),
        ]);
    });

    test("installs a globally available workflow into the target project using current metadata", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const globalWorkflowRoot = join(home, ".config", "mawm", "demo-workflow");
        await mkdir(join(globalWorkflowRoot, "dist"), { recursive: true });
        await writeJson(
            join(globalWorkflowRoot, "mawm.json"),
            metadata({
                displayName: "Demo Workflow",
                id: "demo-workflow",
                workflowVersion: "2.0.0",
            }),
        );
        await writeJson(join(globalWorkflowRoot, "langgraph.json"), {
            graphs: { demo: "./dist/index.js:graph" },
        });
        await writeFile(join(globalWorkflowRoot, "dist", "index.js"), "export const graph = {};\n");

        const result = await runCli(projectRoot, home, ["install", "demo-workflow"]);

        const root = join(projectRoot, ".mawm", "graphs", "demo-workflow");

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Installed workflow `demo-workflow` into .mawm/graphs/demo-workflow.\n",
        });
        expect(await readJson(join(root, "mawm.json"))).toEqual(
            metadata({
                displayName: "Demo Workflow",
                id: "demo-workflow",
                workflowVersion: "2.0.0",
            }),
        );
        expect(await pathExists(join(root, "langgraph.json"))).toBe(true);
        expect(await pathExists(join(root, "dist", "index.js"))).toBe(true);
        expect(await readJson(join(projectRoot, ".mawm", "graphs", "manifest.json"))).toEqual([
            manifestEntry({
                displayName: "Demo Workflow",
                id: "demo-workflow",
                workflowVersion: "2.0.0",
            }),
        ]);
    });

    test("installs a flat globally available workflow into the target project", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const globalWorkflowRoot = join(home, ".config", "mawm", "coding");
        await mkdir(globalWorkflowRoot, { recursive: true });
        await writeJson(
            join(globalWorkflowRoot, "mawm.json"),
            metadata({
                displayName: "Coding Workflow",
                id: "coding",
                workflowVersion: "3.0.0",
            }),
        );
        await writeJson(join(globalWorkflowRoot, "langgraph.json"), {
            graphs: { coding: "./graph.js:graph" },
        });
        await writeFile(join(globalWorkflowRoot, "graph.js"), "export const graph = {};\n");

        const result = await runCli(projectRoot, home, ["install", "coding"]);

        const root = join(projectRoot, ".mawm", "graphs", "coding");

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Installed workflow `coding` into .mawm/graphs/coding.\n",
        });
        expect(await pathExists(join(root, "graph.js"))).toBe(true);
        expect(await pathExists(join(root, "langgraph.json"))).toBe(true);
        expect(await readJson(join(projectRoot, ".mawm", "graphs", "manifest.json"))).toEqual([
            manifestEntry({
                displayName: "Coding Workflow",
                id: "coding",
                workflowVersion: "3.0.0",
            }),
        ]);
    });
});

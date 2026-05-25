import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { runCli } from "../support/cli.js";
import { pathExists, readJson, writeJson } from "../support/fs.js";
import { trackRoots } from "../support/tmp.js";
import { manifestEntry, metadata } from "../support/workflow.js";

const roots = trackRoots();

describe("update command", () => {
    afterEach(async () => {
        await roots.cleanup();
    });

    test("accepts the `u` alias", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["u", "--help"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Usage: mawm {u,update} [-g] [workflow] - Reinstalls workflows into a project or into user config\n",
        });
    });

    test("updates a project workflow by replacing files and refreshing metadata", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const globalRoot = join(home, ".config", "mawm", "demo-workflow");
        await mkdir(join(globalRoot, "dist"), { recursive: true });
        await writeJson(
            join(globalRoot, "mawm.json"),
            metadata({
                displayName: "Demo Workflow",
                id: "demo-workflow",
                workflowVersion: "2.0.0",
            }),
        );
        await writeJson(join(globalRoot, "langgraph.json"), {
            graphs: { demo: "./dist/index.js:graph" },
        });
        await writeFile(join(globalRoot, "dist", "fresh.js"), "export const fresh = true;\n");
        await writeFile(join(globalRoot, "dist", "index.js"), "export const graph = 'new';\n");

        const graphsRoot = join(projectRoot, ".mawm", "graphs");
        const workflowRoot = join(graphsRoot, "demo-workflow");
        await mkdir(join(workflowRoot, "dist"), { recursive: true });
        await writeFile(join(workflowRoot, "dist", "index.js"), "export const graph = 'old';\n");
        await writeFile(join(workflowRoot, "dist", "stale.js"), "export const stale = true;\n");
        await writeJson(join(graphsRoot, "manifest.json"), [
            manifestEntry({
                displayName: "Old Demo Workflow",
                id: "demo-workflow",
            }),
        ]);

        const result = await runCli(projectRoot, home, ["update", "demo-workflow"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Updated workflow `demo-workflow` in .mawm/graphs/demo-workflow.\n",
        });
        expect(await readJson(join(workflowRoot, "mawm.json"))).toEqual(
            metadata({
                displayName: "Demo Workflow",
                id: "demo-workflow",
                workflowVersion: "2.0.0",
            }),
        );
        expect(await pathExists(join(workflowRoot, "dist", "fresh.js"))).toBe(true);
        expect(await pathExists(join(workflowRoot, "dist", "stale.js"))).toBe(false);
        expect(await readJson(join(graphsRoot, "manifest.json"))).toEqual([
            manifestEntry({
                displayName: "Demo Workflow",
                id: "demo-workflow",
                workflowVersion: "2.0.0",
            }),
        ]);
    });

    test("updates all project workflows from manifest entries and continues after failures", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const alphaGlobalRoot = join(home, ".config", "mawm", "alpha");
        await mkdir(join(alphaGlobalRoot, "dist"), { recursive: true });
        await writeJson(
            join(alphaGlobalRoot, "mawm.json"),
            metadata({
                displayName: "Alpha Workflow",
                id: "alpha",
                workflowVersion: "3.0.0",
            }),
        );
        await writeJson(join(alphaGlobalRoot, "langgraph.json"), {
            graphs: { alpha: "./dist/index.js:graph" },
        });
        await writeFile(join(alphaGlobalRoot, "dist", "fresh.js"), "export const fresh = true;\n");
        await writeFile(
            join(alphaGlobalRoot, "dist", "index.js"),
            "export const graph = 'alpha';\n",
        );

        const graphsRoot = join(projectRoot, ".mawm", "graphs");
        const alphaProjectRoot = join(graphsRoot, "alpha");
        const betaProjectRoot = join(graphsRoot, "beta");
        const ignoredProjectRoot = join(graphsRoot, "ignored");
        await mkdir(join(alphaProjectRoot, "dist"), { recursive: true });
        await mkdir(join(betaProjectRoot, "dist"), { recursive: true });
        await mkdir(join(ignoredProjectRoot, "dist"), { recursive: true });
        await writeFile(
            join(alphaProjectRoot, "dist", "index.js"),
            "export const graph = 'old';\n",
        );
        await writeFile(join(alphaProjectRoot, "dist", "stale.js"), "export const stale = true;\n");
        await writeFile(
            join(betaProjectRoot, "dist", "index.js"),
            "export const graph = 'beta';\n",
        );
        await writeFile(
            join(ignoredProjectRoot, "dist", "index.js"),
            "export const graph = 'ignored';\n",
        );
        await writeJson(join(graphsRoot, "manifest.json"), [
            manifestEntry({ displayName: "Alpha Workflow", id: "alpha" }),
            manifestEntry({ displayName: "Beta Workflow", id: "beta" }),
        ]);

        const result = await runCli(projectRoot, home, ["update"]);

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain("Updated workflow `alpha` in .mawm/graphs/alpha.\n");
        expect(result.stderr).toContain("beta");
        expect(result.stderr).toContain("not installed globally");
        expect(await pathExists(join(alphaProjectRoot, "dist", "fresh.js"))).toBe(true);
        expect(await pathExists(join(alphaProjectRoot, "dist", "stale.js"))).toBe(false);
        expect(await pathExists(join(betaProjectRoot, "dist", "index.js"))).toBe(true);
        expect(await pathExists(join(betaProjectRoot, "dist", "fresh.js"))).toBe(false);
        expect(await pathExists(join(ignoredProjectRoot, "dist", "index.js"))).toBe(true);
        expect(await readJson(join(graphsRoot, "manifest.json"))).toEqual([
            manifestEntry({
                displayName: "Alpha Workflow",
                id: "alpha",
                workflowVersion: "3.0.0",
            }),
            manifestEntry({ displayName: "Beta Workflow", id: "beta" }),
        ]);
    });

    test("updates a global workflow from its manifest absolute path and replaces files", async () => {
        const home = await roots.dir("mawm-home-");
        const sourceWorkflowRoot = await roots.dir("mawm-source-");

        const sourceDistRoot = join(sourceWorkflowRoot, "dist");
        await mkdir(sourceDistRoot, { recursive: true });
        await writeJson(join(sourceWorkflowRoot, "package.json"), {
            name: "demo-workflow",
            version: "4.0.0",
        });
        await writeJson(join(sourceWorkflowRoot, "langgraph.json"), {
            graphs: { demo: "./dist/index.js:graph" },
        });
        await writeFile(join(sourceDistRoot, "fresh.js"), "export const fresh = true;\n");
        await writeFile(join(sourceDistRoot, "index.js"), "export const graph = 'new';\n");

        const globalRoot = join(home, ".config", "mawm", "demo-workflow");
        await mkdir(join(globalRoot, "dist"), { recursive: true });
        await writeJson(
            join(globalRoot, "mawm.json"),
            metadata({
                displayName: "Old Demo Workflow",
                id: "demo-workflow",
            }),
        );
        await writeJson(join(globalRoot, "langgraph.json"), {
            graphs: { demo: "./dist/old.js:graph" },
        });
        await writeFile(join(globalRoot, "dist", "index.js"), "export const graph = 'old';\n");
        await writeFile(join(globalRoot, "dist", "stale.js"), "export const stale = true;\n");
        await writeJson(join(home, ".config", "mawm", "manifest.json"), [
            manifestEntry({
                absolutePath: sourceDistRoot,
                displayName: "Old Demo Workflow",
                id: "demo-workflow",
            }),
        ]);

        const result = await runCli(home, home, ["update", "-g", "demo-workflow"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: `Updated workflow \`demo-workflow\` in ${globalRoot}.\n`,
        });
        expect(await pathExists(join(globalRoot, "dist", "fresh.js"))).toBe(true);
        expect(await pathExists(join(globalRoot, "dist", "stale.js"))).toBe(false);
        expect(await readJson(join(globalRoot, "mawm.json"))).toEqual(
            metadata({ id: "demo-workflow", workflowVersion: "4.0.0" }),
        );
        expect(await readJson(join(home, ".config", "mawm", "manifest.json"))).toEqual([
            manifestEntry({
                absolutePath: sourceDistRoot,
                id: "demo-workflow",
                workflowVersion: "4.0.0",
            }),
        ]);
    });

    test("updates a global workflow when absolutePath points at a dist directory with parent metadata", async () => {
        const home = await roots.dir("mawm-home-");
        const sourceWorkflowRoot = await roots.dir("mawm-source-");

        const sourceDistRoot = join(sourceWorkflowRoot, "dist");
        await mkdir(sourceDistRoot, { recursive: true });
        await writeJson(join(sourceWorkflowRoot, "package.json"), {
            name: "coding",
            version: "4.2.0",
        });
        await writeJson(join(sourceDistRoot, "langgraph.json"), {
            graphs: { coding: "./index.js:graph" },
        });
        await writeFile(join(sourceDistRoot, "fresh.js"), "export const fresh = true;\n");
        await writeFile(join(sourceDistRoot, "index.js"), "export const graph = 'new';\n");

        const globalRoot = join(home, ".config", "mawm", "coding");
        await mkdir(join(globalRoot, "dist"), { recursive: true });
        await writeJson(join(globalRoot, "mawm.json"), metadata({ id: "coding" }));
        await writeJson(join(globalRoot, "langgraph.json"), {
            graphs: { coding: "./dist/old.js:graph" },
        });
        await writeFile(join(globalRoot, "dist", "index.js"), "export const graph = 'old';\n");
        await writeJson(join(home, ".config", "mawm", "manifest.json"), [
            manifestEntry({ absolutePath: sourceDistRoot, id: "coding" }),
        ]);

        const result = await runCli(home, home, ["update", "-g", "coding"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: `Updated workflow \`coding\` in ${globalRoot}.\n`,
        });
        expect(await pathExists(join(globalRoot, "fresh.js"))).toBe(true);
        expect(await pathExists(join(globalRoot, "index.js"))).toBe(true);
        expect(await pathExists(join(globalRoot, "dist", "index.js"))).toBe(false);
        expect(await readJson(join(globalRoot, "mawm.json"))).toEqual(
            metadata({ id: "coding", workflowVersion: "4.2.0" }),
        );
        expect(await readJson(join(home, ".config", "mawm", "manifest.json"))).toEqual([
            manifestEntry({ absolutePath: sourceDistRoot, id: "coding", workflowVersion: "4.2.0" }),
        ]);
    });

    test("updates all global workflows from manifest entries and reports missing sources", async () => {
        const home = await roots.dir("mawm-home-");
        const sourceWorkflowRoot = await roots.dir("mawm-source-");

        const sourceDistRoot = join(sourceWorkflowRoot, "dist");
        await mkdir(sourceDistRoot, { recursive: true });
        await writeJson(join(sourceWorkflowRoot, "package.json"), {
            name: "alpha",
            version: "2.0.0",
        });
        await writeJson(join(sourceWorkflowRoot, "langgraph.json"), {
            graphs: { alpha: "./dist/index.js:graph" },
        });
        await writeFile(join(sourceDistRoot, "fresh.js"), "export const fresh = true;\n");
        await writeFile(join(sourceDistRoot, "index.js"), "export const graph = 'alpha';\n");

        const alphaGlobalRoot = join(home, ".config", "mawm", "alpha");
        const betaGlobalRoot = join(home, ".config", "mawm", "beta");
        await mkdir(join(alphaGlobalRoot, "dist"), { recursive: true });
        await mkdir(join(betaGlobalRoot, "dist"), { recursive: true });
        await writeFile(join(alphaGlobalRoot, "dist", "index.js"), "export const graph = 'old';\n");
        await writeFile(join(betaGlobalRoot, "dist", "index.js"), "export const graph = 'beta';\n");
        await writeJson(join(home, ".config", "mawm", "manifest.json"), [
            manifestEntry({ absolutePath: sourceDistRoot, displayName: "Alpha", id: "alpha" }),
            manifestEntry({
                absolutePath: join(home, "missing", "dist"),
                displayName: "Beta",
                id: "beta",
            }),
        ]);

        const result = await runCli(home, home, ["update", "-g"]);

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(`Updated workflow \`alpha\` in ${alphaGlobalRoot}.\n`);
        expect(result.stderr).toContain("beta");
        expect(result.stderr).toContain("does not exist");
        expect(await pathExists(join(alphaGlobalRoot, "dist", "fresh.js"))).toBe(true);
        expect(await pathExists(join(betaGlobalRoot, "dist", "index.js"))).toBe(true);
        expect(await readJson(join(home, ".config", "mawm", "manifest.json"))).toEqual([
            manifestEntry({
                absolutePath: sourceDistRoot,
                id: "alpha",
                workflowVersion: "2.0.0",
            }),
            manifestEntry({
                absolutePath: join(home, "missing", "dist"),
                displayName: "Beta",
                id: "beta",
            }),
        ]);
    });

    test("errors when the workflow is not installed in the project manifest", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const globalRoot = join(home, ".config", "mawm", "demo-workflow");
        await mkdir(join(globalRoot, "dist"), { recursive: true });
        await writeJson(join(globalRoot, "mawm.json"), metadata({ id: "demo-workflow" }));
        await writeJson(join(globalRoot, "langgraph.json"), {
            graphs: { demo: "./dist/index.js:graph" },
        });
        await writeFile(join(globalRoot, "dist", "index.js"), "export const graph = 'new';\n");
        await mkdir(join(projectRoot, ".mawm", "graphs"), { recursive: true });
        await writeJson(join(projectRoot, ".mawm", "graphs", "manifest.json"), []);

        const result = await runCli(projectRoot, home, ["update", "demo-workflow"]);

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain("demo-workflow");
        expect(result.stderr).toContain("not installed in this project");
        expect(await pathExists(join(projectRoot, ".mawm", "graphs", "demo-workflow"))).toBe(false);
    });
});

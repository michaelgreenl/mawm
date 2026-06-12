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
            stdout: "Usage: mawm {i,install} [workflow-or-path] - Installs workflows into global user config\n",
        });
    });

    test("rejects the removed -g flag", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["install", "-g"]);

        expect(result).toEqual({
            exitCode: 1,
            stderr: "Unknown option: -g\n\nUsage: mawm {i,install} [workflow-or-path]\n",
            stdout: "",
        });
    });

    test("installs a workflow from the current dist directory and writes current metadata", async () => {
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

        const result = await runCli(distRoot, home, ["install"]);

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

    test("installs a workflow from an explicit dist path when package metadata lives in the parent", async () => {
        const home = await roots.dir("mawm-home-");
        const workflowRoot = await roots.dir("mawm-workflow-");
        const projectRoot = await roots.dir("mawm-project-");

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

        const result = await runCli(projectRoot, home, ["install", distRoot]);

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
});

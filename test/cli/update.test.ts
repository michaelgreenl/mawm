import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";
import { runCli } from "../support/cli.js";
import { pathExists, readJson, writeJson } from "../support/fs.js";
import { trackRoots } from "../support/tmp.js";
import { manifestEntry, metadata } from "../support/workflow.js";

const planningRoot = fileURLToPath(
    new URL("../../src/assets/.mawm.project-local/agents", import.meta.url),
);
const roots = trackRoots();

const readAsset = (path: string) => readFile(join(planningRoot, path), "utf8");

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
            stdout: "Usage: mawm {u,update} [workflow] | {u,update} -i - Reinstalls global workflows or refreshes project planning assets\n",
        });
    });

    test("rejects the removed --global flag", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["update", "--global"]);

        expect(result).toEqual({
            exitCode: 1,
            stderr: "Unknown option: --global\n\nUsage: mawm {u,update} [workflow] | {u,update} -i\n",
            stdout: "",
        });
    });

    test("rejects workflow arguments in planning asset refresh mode", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["update", "-i", "demo-workflow"]);

        expect(result).toEqual({
            exitCode: 1,
            stderr: "The -i option refreshes project planning assets and does not accept a workflow argument.\n",
            stdout: "",
        });
    });

    test("seeds project planning assets with -i", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");
        const agentsRoot = join(projectRoot, ".mawm", "agents");

        const result = await runCli(projectRoot, home, ["update", "-i"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Updated project planning assets in .mawm/agents.\n",
        });
        expect(await readFile(join(agentsRoot, "adhoc", "README.md"), "utf8")).toBe(
            await readAsset("adhoc/README.md"),
        );
        expect(
            await pathExists(join(agentsRoot, "_templates", "initiative-spec.template.md")),
        ).toBe(true);
    });

    test("refreshes only managed planning assets and preserves custom planning docs", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");
        const agentsRoot = join(projectRoot, ".mawm", "agents");
        const roadmap = join(agentsRoot, "roadmap.md");
        const active = join(agentsRoot, "initiatives", "active", "demo", "spec.md");
        const adhoc = join(agentsRoot, "adhoc", "active", "demo.md");

        await runCli(projectRoot, home, ["update", "-i"]);
        await writeFile(join(agentsRoot, "_templates", "run-spec.template.md"), "stale template\n");
        await writeFile(join(agentsRoot, "adhoc", "README.md"), "stale adhoc readme\n");
        await writeFile(roadmap, "# Custom roadmap\n");
        await mkdir(join(agentsRoot, "initiatives", "active", "demo"), { recursive: true });
        await mkdir(join(agentsRoot, "adhoc", "active"), { recursive: true });
        await writeFile(active, "# Active initiative doc\n");
        await writeFile(adhoc, "# Adhoc run doc\n");

        const result = await runCli(projectRoot, home, ["update", "-i"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Updated project planning assets in .mawm/agents.\n",
        });
        expect(await readFile(join(agentsRoot, "_templates", "run-spec.template.md"), "utf8")).toBe(
            await readAsset("_templates/run-spec.template.md"),
        );
        expect(await readFile(join(agentsRoot, "adhoc", "README.md"), "utf8")).toBe(
            await readAsset("adhoc/README.md"),
        );
        expect(await readFile(join(agentsRoot, "README.md"), "utf8")).toBe(
            await readAsset("README.md"),
        );
        expect(await readFile(roadmap, "utf8")).toBe("# Custom roadmap\n");
        expect(await readFile(active, "utf8")).toBe("# Active initiative doc\n");
        expect(await readFile(adhoc, "utf8")).toBe("# Adhoc run doc\n");

        const noop = await runCli(projectRoot, home, ["update", "-i"]);

        expect(noop).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes required.\n",
        });
    });

    test("updates a global workflow from its manifest absolute path and replaces files", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");
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

        const result = await runCli(projectRoot, home, ["update", "demo-workflow"]);

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
        const projectRoot = await roots.dir("mawm-project-");
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

        const result = await runCli(projectRoot, home, ["update", "coding"]);

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
        const projectRoot = await roots.dir("mawm-project-");
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

        const result = await runCli(projectRoot, home, ["update"]);

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

    test("errors when the workflow is not installed in the global manifest", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const globalRoot = join(home, ".config", "mawm", "demo-workflow");
        await mkdir(join(globalRoot, "dist"), { recursive: true });
        await writeJson(join(globalRoot, "mawm.json"), metadata({ id: "demo-workflow" }));
        await writeJson(join(globalRoot, "langgraph.json"), {
            graphs: { demo: "./dist/index.js:graph" },
        });
        await writeFile(join(globalRoot, "dist", "index.js"), "export const graph = 'new';\n");
        await writeJson(join(home, ".config", "mawm", "manifest.json"), []);

        const result = await runCli(projectRoot, home, ["update", "demo-workflow"]);

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain("demo-workflow");
        expect(result.stderr).toContain("not installed globally");
    });
});

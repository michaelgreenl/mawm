import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { runCli } from "../support/cli.js";
import { pathExists, readJson, writeJson } from "../support/fs.js";
import { trackRoots } from "../support/tmp.js";
import { manifestEntry } from "../support/workflow.js";

const roots = trackRoots();

describe("remove command", () => {
    afterEach(async () => {
        await roots.cleanup();
    });

    test("accepts the `rm` alias", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["rm", "--help"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Usage: mawm {rm,remove} <workflow> - Removes workflows from global user config\n",
        });
    });

    test("rejects the removed -g flag", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["remove", "-g", "demo-workflow"]);

        expect(result).toEqual({
            exitCode: 1,
            stderr: "Unknown option: -g\n\nUsage: mawm {rm,remove} <workflow>\n",
            stdout: "",
        });
    });

    test("removes a globally installed workflow", async () => {
        const home = await roots.dir("mawm-home-");

        const root = join(home, ".config", "mawm");
        const demo = join(root, "demo-workflow");
        const keep = join(root, "keep-workflow");
        await mkdir(join(demo, "dist"), { recursive: true });
        await mkdir(join(keep, "dist"), { recursive: true });
        await writeFile(join(demo, "dist", "index.js"), "export const graph = {}\n");
        await writeFile(join(keep, "dist", "index.js"), "export const graph = {}\n");
        await writeJson(join(root, "manifest.json"), [
            manifestEntry({
                absolutePath: "/tmp/demo-workflow/dist",
                displayName: "Demo Workflow",
                id: "demo-workflow",
            }),
            manifestEntry({
                absolutePath: "/tmp/keep-workflow/dist",
                displayName: "Keep Workflow",
                id: "keep-workflow",
            }),
        ]);

        const result = await runCli(home, home, ["remove", "demo-workflow"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: `Removed workflow \`demo-workflow\` from ${demo}.\n`,
        });
        expect(await pathExists(demo)).toBe(false);
        expect(await pathExists(keep)).toBe(true);
        expect(await readJson(join(root, "manifest.json"))).toEqual([
            manifestEntry({
                absolutePath: "/tmp/keep-workflow/dist",
                displayName: "Keep Workflow",
                id: "keep-workflow",
            }),
        ]);
    });

    test("requires a workflow argument", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["remove"]);

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain("Missing required argument: workflow");
        expect(result.stderr).toContain("Usage: mawm {rm,remove} <workflow>");
    });
});

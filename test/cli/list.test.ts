import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { runCli } from "../support/cli.js";
import { writeJson } from "../support/fs.js";
import { trackRoots } from "../support/tmp.js";
import { manifestEntry } from "../support/workflow.js";

const roots = trackRoots();

describe("list command", () => {
    afterEach(async () => {
        await roots.cleanup();
    });

    test("returns no workflows when the global config root is missing", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["list"]);

        expect(result).toEqual({ exitCode: 0, stderr: "", stdout: "" });
    });

    test("returns no workflows when the manifest is missing", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        await mkdir(join(home, ".config", "mawm"), { recursive: true });

        const result = await runCli(projectRoot, home, ["list"]);

        expect(result).toEqual({ exitCode: 0, stderr: "", stdout: "" });
    });

    test("lists manifest workflows with topology details", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        await mkdir(join(home, ".config", "mawm"), { recursive: true });
        await writeJson(join(home, ".config", "mawm", "manifest.json"), [
            manifestEntry({ agents: ["agent"], id: "delta" }),
            manifestEntry({ id: "gamma", phases: ["planning", "implementing"] }),
            manifestEntry({ id: "alpha" }),
            manifestEntry({
                agents: ["agent", "reviewer"],
                id: "beta",
                phases: ["planning"],
            }),
        ]);

        const result = await runCli(projectRoot, home, ["list"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: [
                "alpha",
                "beta (agents: agent, reviewer; phases: planning)",
                "delta (agents: agent)",
                "gamma (phases: planning, implementing)",
                "",
            ].join("\n"),
        });
    });

    test("rejects the removed -g flag", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["list", "-g"]);

        expect(result).toEqual({
            exitCode: 1,
            stderr: "Unknown option: -g\n\nUsage: mawm list\n",
            stdout: "",
        });
    });
});

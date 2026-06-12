import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { runCli } from "../support/cli.js";
import { trackRoots } from "../support/tmp.js";

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

    test("lists global workflows from the user config root by default", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        await mkdir(join(home, ".config", "mawm", "alpha"), { recursive: true });
        await mkdir(join(home, ".config", "mawm", "beta"), { recursive: true });

        const result = await runCli(projectRoot, home, ["list"]);

        expect(result).toEqual({ exitCode: 0, stderr: "", stdout: "alpha\nbeta\n" });
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

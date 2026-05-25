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

    test("lists project workflows by default", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        await mkdir(join(projectRoot, ".mawm", "graphs", "beta"), { recursive: true });
        await mkdir(join(projectRoot, ".mawm", "graphs", "alpha"), { recursive: true });

        const result = await runCli(projectRoot, home, ["list"]);

        expect(result).toEqual({ exitCode: 0, stderr: "", stdout: "alpha\nbeta\n" });
    });

    test("lists global workflows from the user config root", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        await mkdir(join(home, ".config", "mawm", "alpha"), { recursive: true });
        await mkdir(join(home, ".config", "mawm", "beta"), { recursive: true });

        const result = await runCli(projectRoot, home, ["list", "-g"]);

        expect(result).toEqual({ exitCode: 0, stderr: "", stdout: "alpha\nbeta\n" });
    });
});

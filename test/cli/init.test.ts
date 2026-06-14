import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";
import { runCommandTarget } from "../../src/cmd/runner.js";
import { createInitCommand } from "../../src/cmd/surface/init.js";
import { captureOutput } from "../support/capture.js";
import { runCli } from "../support/cli.js";
import { createContext } from "../support/context.js";
import { pathExists } from "../support/fs.js";
import { spawnSync } from "../support/process.js";
import { trackRoots } from "../support/tmp.js";

const repoRoot = dirname(fileURLToPath(new URL("../../package.json", import.meta.url)));
const binPath = join(repoRoot, "bin", "mawm.js");
const templateRoot = join(repoRoot, "dist", "assets", "workflow-templates");
const roots = trackRoots();

const runBuiltCli = async (cwd: string, home: string, args: readonly string[]) => {
    if (!(await pathExists(join(templateRoot, "base", "package.json")))) {
        throw new Error("Template init tests require `bun run build` to materialize dist assets.");
    }

    const result = spawnSync(["node", binPath, ...args], {
        cwd,
        env: { HOME: home },
    });

    return {
        exitCode: result.exitCode,
        stderr: result.stderr.toString(),
        stdout: result.stdout.toString(),
    };
};

const runInit = (
    init: ReturnType<typeof createInitCommand>,
    cwd: string,
    home: string,
    args: readonly string[],
) => {
    return captureOutput(() =>
        runCommandTarget(init, args, createContext(cwd, home, ["init", ...args]), init.usage),
    );
};

describe("init command", () => {
    afterEach(async () => {
        await roots.cleanup();
    });

    test("initializes missing global config by default", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["init"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global MAWM config.\n",
        });
        expect(await readFile(join(home, ".config", "mawm", "manifest.json"), "utf8")).toBe("[]\n");
        expect(await pathExists(join(home, ".config", "mawm", "prompts", "README.md"))).toBe(true);
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
    });

    test("copies initiative scaffolds when -i is passed", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["init", "-i"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized project initiative workspace.\nInitialized global MAWM config.\n",
        });
        expect(await pathExists(join(projectRoot, ".mawm", "agents", "adhoc", "README.md"))).toBe(
            true,
        );
        expect(JSON.parse(await readFile(join(projectRoot, ".mawm", "mawm.json"), "utf8"))).toEqual(
            {
                $schema: "./mawm.schema.json",
                context: {
                    global: [],
                    phases: {},
                    workflows: {},
                },
            },
        );
        expect(await pathExists(join(projectRoot, ".mawm", "mawm.schema.json"))).toBe(true);
        expect(await pathExists(join(home, ".config", "mawm", "prompts", "README.md"))).toBe(true);
        expect(await pathExists(join(projectRoot, ".mawm", "graphs"))).toBe(false);
    });

    test("initializes the global mawm config with -g without creating a project scaffold", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["init", "-g"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global MAWM config.\n",
        });
        expect(await readFile(join(home, ".config", "mawm", "manifest.json"), "utf8")).toBe("[]\n");
        expect(await pathExists(join(home, ".config", "mawm", "prompts", "README.md"))).toBe(true);
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
    });

    test("fails when -g and -i are combined", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["init", "-g", "-i"]);

        expect(result).toEqual({
            exitCode: 1,
            stderr: "The -i option only initializes target-project initiative documents/workspace and cannot be used with -g.\n\nUsage: mawm init [-g] [-i] [-a <agent>] [-t [type]]\n",
            stdout: "",
        });
    });

    test("fails when -g is used against an existing global mawm config", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        await mkdir(join(home, ".config", "mawm"), { recursive: true });

        const result = await runCli(projectRoot, home, ["init", "-g"]);

        expect(result).toEqual({
            exitCode: 1,
            stderr: `Refusing to overwrite existing global config: ${join(
                home,
                ".config",
                "mawm",
            )}\n\nUsage: mawm init [-g] [-i] [-a <agent>] [-t [type]]\n`,
            stdout: "",
        });
    });

    test("fails when -a is provided without an agent name", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["init", "-a"]);

        expect(result).toEqual({
            exitCode: 1,
            stderr: "Missing value for option: -a\n\nUsage: mawm init [-g] [-i] [-a <agent>] [-t [type]]\n",
            stdout: "",
        });
    });

    test("scaffolds the base template into the current directory with -t", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runBuiltCli(projectRoot, home, ["init", "-t"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized base template scaffold.\n",
        });
        expect(await pathExists(join(projectRoot, "package.json"))).toBe(true);
        expect(await pathExists(join(projectRoot, "mawm.json"))).toBe(true);
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
        expect(await pathExists(join(projectRoot, ".opencode"))).toBe(false);
        expect(await pathExists(join(home, ".config", "mawm"))).toBe(false);
    });

    test("scaffolds the initiative template when -t initiative is passed", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runBuiltCli(projectRoot, home, ["init", "-t", "initiative"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized initiative template scaffold.\n",
        });
        expect(await pathExists(join(projectRoot, "package.json"))).toBe(true);
        expect(await pathExists(join(projectRoot, "mawm.json"))).toBe(true);
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
        expect(await pathExists(join(home, ".config", "mawm"))).toBe(false);
    });

    test("fails for unsupported template types", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runBuiltCli(projectRoot, home, ["init", "-t", "unknown"]);

        expect(result).toEqual({
            exitCode: 1,
            stderr: "Unknown template type: unknown. Expected one of: base, initiative.\n\nUsage: mawm init [-g] [-i] [-a <agent>] [-t [type]]\n",
            stdout: "",
        });
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
        expect(await pathExists(join(projectRoot, "package.json"))).toBe(false);
        expect(await pathExists(join(home, ".config", "mawm"))).toBe(false);
    });

    test("rejects template mode when combined with other init flows", async () => {
        const cases = [
            ["init", "-g", "-t"],
            ["init", "-it"],
            ["init", "-t", "-a", "opencode"],
            ["init", "-gt"],
        ] as const;

        for (const args of cases) {
            const home = await roots.dir("mawm-home-");
            const projectRoot = await roots.dir("mawm-project-");

            const result = await runBuiltCli(projectRoot, home, args);

            expect(result).toEqual({
                exitCode: 1,
                stderr: "The -t option cannot be combined with -g, -i, or -a.\n\nUsage: mawm init [-g] [-i] [-a <agent>] [-t [type]]\n",
                stdout: "",
            });
            expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
            expect(await pathExists(join(projectRoot, ".opencode"))).toBe(false);
            expect(await pathExists(join(projectRoot, "package.json"))).toBe(false);
            expect(await pathExists(join(home, ".config", "mawm"))).toBe(false);
        }
    });

    test("initializes project agent assets with -a <agent>", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["init", "-a", "opencode"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global MAWM config.\nInitialized project agent assets.\n",
        });
        expect(await pathExists(join(projectRoot, ".opencode", "agents", "mawma-manager.md"))).toBe(
            true,
        );
        expect(
            await pathExists(join(projectRoot, ".opencode", "agents", "workflow-runner.md")),
        ).toBe(true);
        expect(await pathExists(join(projectRoot, ".opencode", "tools", "execute-graph.ts"))).toBe(
            true,
        );
        expect(await readFile(join(home, ".config", "mawm", "manifest.json"), "utf8")).toBe("[]\n");
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
    });

    test("initializes project initiative and agent assets with -ia <agent>", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["init", "-ia", "opencode"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized project initiative workspace.\nInitialized global MAWM config.\nInitialized project agent assets.\n",
        });
        expect(await pathExists(join(projectRoot, ".mawm", "agents", "initiatives"))).toBe(true);
        expect(await pathExists(join(projectRoot, ".opencode", "agents", "mawma-manager.md"))).toBe(
            true,
        );
    });

    test("initializes global agent assets with -g -a <agent>", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const result = await runCli(projectRoot, home, ["init", "-g", "-a", "opencode"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global MAWM config.\nInitialized global agent assets.\n",
        });
        expect(
            await pathExists(join(home, ".config", "opencode", "agents", "mawma-manager.md")),
        ).toBe(true);
        expect(await pathExists(join(projectRoot, ".opencode"))).toBe(false);
    });

    test("initializes global agent assets alongside existing opencode config files", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        await mkdir(join(home, ".config", "mawm"), { recursive: true });
        await mkdir(join(home, ".config", "opencode"), { recursive: true });
        await writeFile(join(home, ".config", "opencode", "settings.json"), "{}\n");

        const init = createInitCommand(async () => false);
        const result = await runInit(init, projectRoot, home, ["-g", "-a", "opencode"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global agent assets.\n",
        });
        expect(
            await pathExists(join(home, ".config", "opencode", "agents", "mawma-manager.md")),
        ).toBe(true);
        expect(await readFile(join(home, ".config", "opencode", "settings.json"), "utf8")).toBe(
            "{}\n",
        );
    });

    test("overwrites existing project agent assets when overwrite is confirmed", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const path = join(projectRoot, ".opencode", "agents", "mawma-manager.md");
        await mkdir(join(projectRoot, ".opencode", "agents"), { recursive: true });
        await writeFile(path, "stale\n");

        const init = createInitCommand(async () => true);
        const result = await runInit(init, projectRoot, home, ["-a", "opencode"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global MAWM config.\nInitialized project agent assets.\n",
        });
        expect(await readFile(path, "utf8")).not.toBe("stale\n");
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
    });

    test("overwrites existing global agent assets when overwrite is confirmed", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const path = join(home, ".config", "opencode", "agents", "mawma-manager.md");
        await mkdir(join(home, ".config", "mawm"), { recursive: true });
        await mkdir(join(home, ".config", "opencode", "agents"), { recursive: true });
        await writeFile(path, "stale\n");

        const init = createInitCommand(async () => true);
        const result = await runInit(init, projectRoot, home, ["-g", "-a", "opencode"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global agent assets.\n",
        });
        expect(await readFile(path, "utf8")).not.toBe("stale\n");
    });

    test("reports a no-op when overwrite is declined for existing agent assets", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const path = join(projectRoot, ".opencode", "agents", "mawma-manager.md");
        await mkdir(join(projectRoot, ".opencode", "agents"), { recursive: true });
        await writeFile(path, "keep\n");

        const init = createInitCommand(async () => false);
        const result = await runInit(init, projectRoot, home, ["-a", "opencode"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes made; existing agent assets were left in place.\n",
        });
        expect(await readFile(path, "utf8")).toBe("keep\n");
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
    });

    test("reports no changes for a successful rerun of init", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        await runCli(projectRoot, home, ["init"]);
        const result = await runCli(projectRoot, home, ["init"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes required.\n",
        });
    });

    test("reports no changes for a successful rerun of init -i", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");
        const path = join(projectRoot, ".mawm", "mawm.json");
        const value = `${JSON.stringify(
            {
                $schema: "./mawm.schema.json",
                context: {
                    global: ["docs/custom.md"],
                },
            },
            null,
            2,
        )}\n`;

        await runCli(projectRoot, home, ["init", "-i"]);
        await writeFile(path, value);
        const result = await runCli(projectRoot, home, ["init", "-i"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes required.\n",
        });
        expect(await readFile(path, "utf8")).toBe(value);
    });

    test("reports no changes for a successful rerun of init -a <agent>", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const init = createInitCommand(async () => true);
        await runInit(init, projectRoot, home, ["-a", "opencode"]);
        const result = await runInit(init, projectRoot, home, ["-a", "opencode"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes required.\n",
        });
        expect(await pathExists(join(projectRoot, ".opencode", "agents", "mawma-manager.md"))).toBe(
            true,
        );
    });

    test("reports no changes for a successful rerun of init -g -a <agent>", async () => {
        const home = await roots.dir("mawm-home-");
        const projectRoot = await roots.dir("mawm-project-");

        const init = createInitCommand(async () => true);
        await runInit(init, projectRoot, home, ["-g", "-a", "opencode"]);
        const result = await runInit(init, projectRoot, home, ["-g", "-a", "opencode"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes required.\n",
        });
        expect(
            await pathExists(join(home, ".config", "opencode", "agents", "mawma-manager.md")),
        ).toBe(true);
    });
});

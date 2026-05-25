import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";
import { runCommandTarget } from "../../src/cmd/runner.js";
import { parseCommand } from "../../src/utils/parsers/cmd.js";
import { createInitCommand } from "../../src/cmd/surface/init.js";
import { captureOutput } from "../support/capture.js";
import { createContext } from "../support/context.js";

const repoRoot = dirname(fileURLToPath(new URL("../../package.json", import.meta.url)));
const binPath = join(repoRoot, "bin", "mawm.js");
const templateRoot = join(repoRoot, "dist", "assets", "workflow-templates");
const tempRoots: string[] = [];

const pathExists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

const requireBuiltTemplates = async () => {
    if (await pathExists(join(templateRoot, "base", "package.json"))) {
        return;
    }

    throw new Error("Template init tests require `bun run build` to materialize dist assets.");
};

const runBuiltCli = async (cwd: string, home: string, args: readonly string[]) => {
    await requireBuiltTemplates();

    const result = spawnSync("node", [binPath, ...args], {
        cwd,
        env: {
            ...process.env,
            HOME: home,
        },
        encoding: "utf8",
    });

    return {
        exitCode: result.status,
        stderr: result.stderr,
        stdout: result.stdout,
    };
};

describe("init command", () => {
    afterEach(async () => {
        await Promise.all(
            tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
        );
    });

    test("initializes project assets and missing global config by default", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result.exitCode).toBe(0);
        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized local MAWM graphs scaffold.\nInitialized global MAWM config.\n",
        });
        expect(await readFile(join(projectRoot, ".mawm", "graphs", "manifest.json"), "utf8")).toBe(
            "[]\n",
        );
        expect(await readFile(join(home, ".config", "mawm", "manifest.json"), "utf8")).toBe("[]\n");
        expect(await pathExists(join(projectRoot, ".mawm", "agents"))).toBe(false);
    });

    test("copies agent scaffolds when -i is passed", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init", "-i"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result.exitCode).toBe(0);
        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized local MAWM graphs scaffold.\nInitialized project initiative workspace.\nInitialized global MAWM config.\n",
        });
        expect(
            await readFile(join(projectRoot, ".mawm", "agents", "adhoc", "README.md"), "utf8"),
        ).toContain("adhoc");
        expect(
            await pathExists(join(projectRoot, ".mawm", "agents", "initiatives", "manifest.json")),
        ).toBe(true);
    });

    test("initializes the global mawm config with -g without creating a project scaffold", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init", "-g"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global MAWM config.\n",
        });
        expect(await readFile(join(home, ".config", "mawm", "manifest.json"), "utf8")).toBe("[]\n");
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
    });

    test("fails when -g and -i are combined", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init", "-g", "-i"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 1,
            stderr: "The -i option only initializes target-project initiative documents/workspace and cannot be used with -g.\n\nUsage: mawm init [-g] [-i] [-a <agent>] [-t [type]]\n",
            stdout: "",
        });
    });

    test("fails when -g is used against an existing global mawm config", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        await mkdir(join(home, ".config", "mawm"), { recursive: true });

        const rawArgs = ["init", "-g"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

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
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init", "-a"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 1,
            stderr: "Missing value for option: -a\n\nUsage: mawm init [-g] [-i] [-a <agent>] [-t [type]]\n",
            stdout: "",
        });
    });

    test("scaffolds the base template into the current directory with -t", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const result = await runBuiltCli(projectRoot, home, ["init", "-t"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized base template scaffold.\n",
        });
        expect(await readFile(join(projectRoot, "package.json"), "utf8")).toBe(
            await readFile(join(templateRoot, "base", "package.json"), "utf8"),
        );
        expect(await readFile(join(projectRoot, "mawm.json"), "utf8")).toBe(
            await readFile(join(templateRoot, "base", "mawm.json"), "utf8"),
        );
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
        expect(await pathExists(join(projectRoot, ".opencode"))).toBe(false);
        expect(await pathExists(join(home, ".config", "mawm"))).toBe(false);
    });

    test("scaffolds the base template when -t base is passed explicitly", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const result = await runBuiltCli(projectRoot, home, ["init", "-t", "base"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized base template scaffold.\n",
        });
        expect(await readFile(join(projectRoot, "mawm.json"), "utf8")).toContain(
            '"id": "base-template"',
        );
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
    });

    test("scaffolds the initiative template into the current directory with -t initiative", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const result = await runBuiltCli(projectRoot, home, ["init", "-t", "initiative"]);

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized initiative template scaffold.\n",
        });
        expect(await readFile(join(projectRoot, "package.json"), "utf8")).toBe(
            await readFile(join(templateRoot, "initiative", "package.json"), "utf8"),
        );
        expect(await readFile(join(projectRoot, "mawm.json"), "utf8")).toBe(
            await readFile(join(templateRoot, "initiative", "mawm.json"), "utf8"),
        );
        expect(await pathExists(join(projectRoot, "src", "graph", "planning.ts"))).toBe(true);
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
        expect(await pathExists(join(home, ".config", "mawm"))).toBe(false);
    });

    test("fails for unsupported template types", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

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
            const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
            const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
            tempRoots.push(home, projectRoot);

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
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init", "-a", "opencode"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized local MAWM graphs scaffold.\nInitialized global MAWM config.\nInitialized project agent assets.\n",
        });
        expect(
            await pathExists(join(projectRoot, ".opencode", "agents", "initiative-manager.md")),
        ).toBe(true);
        expect(
            await pathExists(join(projectRoot, ".opencode", "agents", "workflow-runner.md")),
        ).toBe(true);
        expect(await pathExists(join(projectRoot, ".opencode", "tools", "execute-graph.ts"))).toBe(
            true,
        );
        expect(await readFile(join(home, ".config", "mawm", "manifest.json"), "utf8")).toBe("[]\n");
        expect(await pathExists(join(projectRoot, ".mawm", "agents"))).toBe(false);
    });

    test("initializes project initiative and agent assets with -ia <agent>", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init", "-ia", "opencode"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized local MAWM graphs scaffold.\nInitialized project initiative workspace.\nInitialized global MAWM config.\nInitialized project agent assets.\n",
        });
        expect(
            await pathExists(join(projectRoot, ".mawm", "agents", "initiatives", "manifest.json")),
        ).toBe(true);
        expect(
            await pathExists(join(projectRoot, ".opencode", "agents", "initiative-manager.md")),
        ).toBe(true);
    });

    test("initializes global agent assets with -g -a <agent>", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init", "-g", "-a", "opencode"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global MAWM config.\nInitialized global agent assets.\n",
        });
        expect(
            await pathExists(join(home, ".config", "opencode", "agents", "initiative-manager.md")),
        ).toBe(true);
        expect(await pathExists(join(projectRoot, ".opencode"))).toBe(false);
    });

    test("replaces the legacy manager asset name during project init", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        await mkdir(join(projectRoot, ".opencode", "agents"), { recursive: true });
        await writeFile(join(projectRoot, ".opencode", "agents", "manager.md"), "legacy\n");
        await writeFile(join(projectRoot, ".opencode", "settings.json"), "{}\n");

        const rawArgs = ["init", "-a", "opencode"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");
        expect(
            await pathExists(join(projectRoot, ".opencode", "agents", "initiative-manager.md")),
        ).toBe(true);
        expect(await pathExists(join(projectRoot, ".opencode", "agents", "manager.md"))).toBe(
            false,
        );
        expect(await readFile(join(projectRoot, ".opencode", "settings.json"), "utf8")).toBe(
            "{}\n",
        );
    });

    test("overwrites existing agent assets when overwrite is confirmed", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        await mkdir(join(projectRoot, ".opencode", "agents"), { recursive: true });
        await writeFile(
            join(projectRoot, ".opencode", "agents", "initiative-manager.md"),
            "stale\n",
        );

        const init = createInitCommand(async () => true);
        const result = await captureOutput(() =>
            runCommandTarget(
                init,
                ["-a", "opencode"],
                createContext(projectRoot, home, ["init", "-a", "opencode"]),
                init.usage,
            ),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized local MAWM graphs scaffold.\nInitialized global MAWM config.\nInitialized project agent assets.\n",
        });
        expect(
            await readFile(
                join(projectRoot, ".opencode", "agents", "initiative-manager.md"),
                "utf8",
            ),
        ).toContain("execute-graph");
        expect(await pathExists(join(projectRoot, ".mawm", "graphs", "manifest.json"))).toBe(true);
    });

    test("initializes global agent assets when global mawm config already exists and no bundled opencode assets overlap", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        await mkdir(join(home, ".config", "mawm"), { recursive: true });
        await mkdir(join(home, ".config", "opencode"), { recursive: true });
        await writeFile(join(home, ".config", "opencode", "settings.json"), "{}\n");

        let promptCount = 0;
        const init = createInitCommand(async () => {
            promptCount += 1;
            return true;
        });
        const result = await captureOutput(() =>
            runCommandTarget(
                init,
                ["-g", "-a", "opencode"],
                createContext(projectRoot, home, ["init", "-g", "-a", "opencode"]),
                init.usage,
            ),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global agent assets.\n",
        });
        expect(promptCount).toBe(0);
        expect(
            await pathExists(join(home, ".config", "opencode", "agents", "initiative-manager.md")),
        ).toBe(true);
        expect(await readFile(join(home, ".config", "opencode", "settings.json"), "utf8")).toBe(
            "{}\n",
        );
    });

    test("prompts to overwrite existing global opencode assets when bundled assets already exist", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        await mkdir(join(home, ".config", "mawm"), { recursive: true });
        await mkdir(join(home, ".config", "opencode", "agents"), { recursive: true });
        await writeFile(
            join(home, ".config", "opencode", "agents", "initiative-manager.md"),
            "stale\n",
        );

        let promptPath = "";
        const init = createInitCommand(async (targetPath) => {
            promptPath = targetPath;
            return true;
        });
        const result = await captureOutput(() =>
            runCommandTarget(
                init,
                ["-g", "-a", "opencode"],
                createContext(projectRoot, home, ["init", "-g", "-a", "opencode"]),
                init.usage,
            ),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Initialized global agent assets.\n",
        });
        expect(promptPath).toBe(join(home, ".config", "opencode"));
        expect(
            await readFile(
                join(home, ".config", "opencode", "agents", "initiative-manager.md"),
                "utf8",
            ),
        ).toContain("execute-graph");
    });

    test("reports a no-op when overwrite is declined for existing agent assets", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        await mkdir(join(projectRoot, ".opencode", "agents"), { recursive: true });
        await writeFile(
            join(projectRoot, ".opencode", "agents", "initiative-manager.md"),
            "keep\n",
        );

        const init = createInitCommand(async () => false);
        const result = await captureOutput(() =>
            init.run!({
                context: createContext(projectRoot, home, ["init", "-a", "opencode"]),
                options: { agent: "opencode", global: false, includeAgents: false },
            }),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes made; existing agent assets were left in place.\n",
        });
        expect(
            await readFile(
                join(projectRoot, ".opencode", "agents", "initiative-manager.md"),
                "utf8",
            ),
        ).toBe("keep\n");
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
    });

    test("reports no changes for a successful rerun of init", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init"] as const;
        await captureOutput(() => parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)));
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes required.\n",
        });
    });

    test("reports no changes for a successful rerun of init -i", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init", "-i"] as const;
        await captureOutput(() => parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)));
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes required.\n",
        });
    });

    test("reports no changes for a successful rerun of init -a <agent>", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const init = createInitCommand(async () => true);
        const path = join(projectRoot, ".opencode", "agents", "initiative-manager.md");
        const when = new Date("2000-01-01T00:00:00.000Z");
        await captureOutput(() =>
            runCommandTarget(
                init,
                ["-a", "opencode"],
                createContext(projectRoot, home, ["init", "-a", "opencode"]),
                init.usage,
            ),
        );
        const before = await readFile(path, "utf8");
        await utimes(path, when, when);
        const stamp = (await stat(path)).mtimeMs;
        const result = await captureOutput(() =>
            runCommandTarget(
                init,
                ["-a", "opencode"],
                createContext(projectRoot, home, ["init", "-a", "opencode"]),
                init.usage,
            ),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes required.\n",
        });
        expect(await readFile(path, "utf8")).toBe(before);
        expect((await stat(path)).mtimeMs).toBe(stamp);
    });

    test("reports no changes for a successful rerun of init -g -a <agent>", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const init = createInitCommand(async () => true);
        const path = join(home, ".config", "opencode", "agents", "initiative-manager.md");
        const when = new Date("2000-01-01T00:00:00.000Z");
        await captureOutput(() =>
            runCommandTarget(
                init,
                ["-g", "-a", "opencode"],
                createContext(projectRoot, home, ["init", "-g", "-a", "opencode"]),
                init.usage,
            ),
        );
        const before = await readFile(path, "utf8");
        await utimes(path, when, when);
        const stamp = (await stat(path)).mtimeMs;
        const result = await captureOutput(() =>
            runCommandTarget(
                init,
                ["-g", "-a", "opencode"],
                createContext(projectRoot, home, ["init", "-g", "-a", "opencode"]),
                init.usage,
            ),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "No changes required.\n",
        });
        expect(await readFile(path, "utf8")).toBe(before);
        expect((await stat(path)).mtimeMs).toBe(stamp);
    });
});

import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { runCommandTarget } from "../../src/cmd/runner.js";
import { parseCommand } from "../../src/utils/parsers/cmd.js";
import { createInitCommand } from "../../src/cmd/surface/init.js";
import type { CommandContext } from "../../src/utils/types/command.d.js";

const tempRoots: string[] = [];

const pathExists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

const captureOutput = async (run: () => Promise<number>) => {
    let stdout = "";
    let stderr = "";
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;

    process.stdout.write = ((chunk: string | Uint8Array) => {
        stdout += chunk.toString();
        return true;
    }) as typeof process.stdout.write;

    process.stderr.write = ((chunk: string | Uint8Array) => {
        stderr += chunk.toString();
        return true;
    }) as typeof process.stderr.write;

    try {
        const exitCode = await run();
        return { exitCode, stderr, stdout };
    } finally {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    }
};

const createContext = (cwd: string, home: string, rawArgs: readonly string[]): CommandContext => ({
    cwd,
    env: { HOME: home },
    rawArgs: [...rawArgs],
});

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
        expect(result.stderr).toBe("");
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
        expect(result.stderr).toBe("");
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

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");
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
            stderr: "The -i option only initializes target-project initiative documents/workspace and cannot be used with -g.\n\nUsage: mawm init [-g] [-i] [-a <agent>]\n",
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
            stderr: `Refusing to overwrite existing global config: ${join(home, ".config", "mawm")}\n\nUsage: mawm init [-g] [-i] [-a <agent>]\n`,
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
            stderr: "Missing value for option: -a\n\nUsage: mawm init [-g] [-i] [-a <agent>]\n",
            stdout: "",
        });
    });

    test("initializes project agent assets with -a <agent>", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init", "-a", "opencode"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");
        expect(await pathExists(join(projectRoot, ".opencode", "agents", "manager.md"))).toBe(
            true,
        );
        expect(
            await pathExists(join(projectRoot, ".opencode", "tools", "execute-graph.ts")),
        ).toBe(true);
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

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");
        expect(
            await pathExists(join(projectRoot, ".mawm", "agents", "initiatives", "manifest.json")),
        ).toBe(true);
        expect(await pathExists(join(projectRoot, ".opencode", "agents", "manager.md"))).toBe(
            true,
        );
    });

    test("initializes global agent assets with -g -a <agent>", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["init", "-g", "-a", "opencode"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");
        expect(await pathExists(join(home, ".config", "opencode", "agents", "manager.md"))).toBe(
            true,
        );
        expect(await pathExists(join(projectRoot, ".opencode"))).toBe(false);
    });

    test("overwrites existing agent assets when overwrite is confirmed", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        await mkdir(join(projectRoot, ".opencode", "agents"), { recursive: true });
        await writeFile(join(projectRoot, ".opencode", "agents", "manager.md"), "stale\n");

        const init = createInitCommand(async () => true);
        const result = await captureOutput(() =>
            runCommandTarget(
                init,
                ["-a", "opencode"],
                createContext(projectRoot, home, ["init", "-a", "opencode"]),
                init.usage,
            ),
        );

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");
        expect(await readFile(join(projectRoot, ".opencode", "agents", "manager.md"), "utf8")).toContain(
            "execute-graph",
        );
        expect(await pathExists(join(projectRoot, ".mawm", "graphs", "manifest.json"))).toBe(true);
    });

    test("fails before prompting when an existing global config blocks -g -a", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        await mkdir(join(home, ".config", "mawm"), { recursive: true });
        await mkdir(join(home, ".config", "opencode"), { recursive: true });

        const init = createInitCommand(async () => {
            throw new Error("prompt should not run");
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
            exitCode: 1,
            stderr: `Refusing to overwrite existing global config: ${join(home, ".config", "mawm")}\n\nUsage: mawm init [-g] [-i] [-a <agent>]\n`,
            stdout: "",
        });
    });

    test("exits immediately when overwrite is declined for existing agent assets", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        await mkdir(join(projectRoot, ".opencode", "agents"), { recursive: true });
        await writeFile(join(projectRoot, ".opencode", "agents", "manager.md"), "keep\n");

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
            stdout: "",
        });
        expect(await readFile(join(projectRoot, ".opencode", "agents", "manager.md"), "utf8")).toBe(
            "keep\n",
        );
        expect(await pathExists(join(projectRoot, ".mawm"))).toBe(false);
    });
});

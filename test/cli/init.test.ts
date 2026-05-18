import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { parseCommand } from "../../src/cli/parsers/cmd.js";
import type { CommandContext } from "../../src/types/interfaces/command.d.js";

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

    test("initializes project assets without copying agent scaffolds by default", async () => {
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
        expect(await readFile(join(projectRoot, ".mawm", "agents", "adhoc", "README.md"), "utf8")).toContain(
            "adhoc",
        );
        expect(
            await pathExists(join(projectRoot, ".mawm", "agents", "initiatives", "manifest.json")),
        ).toBe(true);
    });
});

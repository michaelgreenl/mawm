import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { parseCommand } from "../../src/utils/parsers/cmd.js";
import type { CommandContext } from "../../src/utils/types/command.d.js";

const tempRoots: string[] = [];

const readJson = async <T>(path: string): Promise<T> => {
    return JSON.parse(await readFile(path, "utf8")) as T;
};

const writeJson = async (path: string, value: unknown): Promise<void> => {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

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

describe("remove command", () => {
    afterEach(async () => {
        await Promise.all(
            tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
        );
    });

    test("accepts the `rm` alias", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["rm", "--help"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Usage: mawm {rm,remove} [-g] <workflow> - Removes workflows from a project or from user config\n",
        });
    });

    test("removes a workflow installed in the target project", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const projectGraphsRoot = join(projectRoot, ".mawm", "graphs");
        const demoWorkflowRoot = join(projectGraphsRoot, "demo-workflow");
        const keepWorkflowRoot = join(projectGraphsRoot, "keep-workflow");
        await mkdir(join(demoWorkflowRoot, "dist"), { recursive: true });
        await mkdir(join(keepWorkflowRoot, "dist"), { recursive: true });
        await writeFile(join(demoWorkflowRoot, "dist", "index.js"), "export const graph = {}\n");
        await writeFile(join(keepWorkflowRoot, "dist", "index.js"), "export const graph = {}\n");
        await writeJson(join(projectGraphsRoot, "manifest.json"), [
            {
                displayName: "Demo Workflow",
                id: "demo-workflow",
                path: "./demo-workflow",
                workflowVersion: "1.0.0",
            },
            {
                displayName: "Keep Workflow",
                id: "keep-workflow",
                path: "./keep-workflow",
                workflowVersion: "1.0.0",
            },
        ]);

        const rawArgs = ["remove", "demo-workflow"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: "Removed workflow `demo-workflow` from .mawm/graphs/demo-workflow.\n",
        });
        expect(await pathExists(demoWorkflowRoot)).toBe(false);
        expect(await pathExists(keepWorkflowRoot)).toBe(true);
        expect(await readJson(join(projectGraphsRoot, "manifest.json"))).toEqual([
            {
                displayName: "Keep Workflow",
                id: "keep-workflow",
                path: "./keep-workflow",
                workflowVersion: "1.0.0",
            },
        ]);
    });

    test("removes a globally installed workflow with -g", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        tempRoots.push(home);

        const configRoot = join(home, ".config", "mawm");
        const demoWorkflowRoot = join(configRoot, "demo-workflow");
        const keepWorkflowRoot = join(configRoot, "keep-workflow");
        await mkdir(join(demoWorkflowRoot, "dist"), { recursive: true });
        await mkdir(join(keepWorkflowRoot, "dist"), { recursive: true });
        await writeFile(join(demoWorkflowRoot, "dist", "index.js"), "export const graph = {}\n");
        await writeFile(join(keepWorkflowRoot, "dist", "index.js"), "export const graph = {}\n");
        await writeJson(join(configRoot, "manifest.json"), [
            {
                absolutePath: "/tmp/demo-workflow/dist",
                displayName: "Demo Workflow",
                id: "demo-workflow",
                path: "./demo-workflow",
                workflowVersion: "1.0.0",
            },
            {
                absolutePath: "/tmp/keep-workflow/dist",
                displayName: "Keep Workflow",
                id: "keep-workflow",
                path: "./keep-workflow",
                workflowVersion: "1.0.0",
            },
        ]);

        const rawArgs = ["remove", "-g", "demo-workflow"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(home, home, rawArgs)),
        );

        expect(result).toEqual({
            exitCode: 0,
            stderr: "",
            stdout: `Removed workflow \`demo-workflow\` from ${demoWorkflowRoot}.\n`,
        });
        expect(await pathExists(demoWorkflowRoot)).toBe(false);
        expect(await pathExists(keepWorkflowRoot)).toBe(true);
        expect(await readJson(join(configRoot, "manifest.json"))).toEqual([
            {
                absolutePath: "/tmp/keep-workflow/dist",
                displayName: "Keep Workflow",
                id: "keep-workflow",
                path: "./keep-workflow",
                workflowVersion: "1.0.0",
            },
        ]);
    });

    test("requires a workflow argument", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        const projectRoot = await mkdtemp(join(tmpdir(), "mawm-project-"));
        tempRoots.push(home, projectRoot);

        const rawArgs = ["remove"] as const;
        const result = await captureOutput(() =>
            parseCommand(rawArgs, createContext(projectRoot, home, rawArgs)),
        );

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain("Missing required argument: workflow");
        expect(result.stderr).toContain("Usage: mawm {rm,remove} [-g] <workflow>");
    });
});

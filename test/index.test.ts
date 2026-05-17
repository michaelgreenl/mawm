import { expect, test } from "bun:test";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import init from "../src/cli/cmd/init.js";
import { parseCommand } from "../src/cli/parser.js";
import { runCli } from "../src/index.js";

const pathExists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

const captureOutput = async <T>(
    callback: () => Promise<T>,
): Promise<{
    result: T;
    stdout: string;
    stderr: string;
}> => {
    let stdout = "";
    let stderr = "";
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;

    process.stdout.write = ((chunk: string | Uint8Array) => {
        stdout += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
        return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
        stderr += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
        return true;
    }) as typeof process.stderr.write;

    try {
        return {
            result: await callback(),
            stdout,
            stderr,
        };
    } finally {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    }
};

test("runCli returns success when invoked without arguments", async () => {
    await expect(runCli([])).resolves.toBe(0);
});

test("init scaffolds project-local assets and user config without overwriting files", async () => {
    if (!init.run) {
        throw new Error("init command is missing its run handler");
    }

    const sandboxRoot = await mkdtemp(join(tmpdir(), "mawm-init-"));
    const projectRoot = join(sandboxRoot, "project");
    const homeRoot = join(sandboxRoot, "home");
    const existingProjectFile = join(projectRoot, ".mawm", "agents", "initiatives", "README.md");

    try {
        await mkdir(join(projectRoot, ".mawm", "agents", "initiatives"), { recursive: true });
        await mkdir(homeRoot, { recursive: true });
        await writeFile(existingProjectFile, "keep project edits\n");

        await expect(
            init.run({
                context: {
                    cwd: projectRoot,
                    env: { ...process.env, HOME: homeRoot },
                    rawArgs: ["init"],
                },
            }),
        ).resolves.toBe(0);

        await expect(
            pathExists(join(projectRoot, ".mawm", "graphs", "manifest.json")),
        ).resolves.toBe(true);
        await expect(
            pathExists(join(projectRoot, ".mawm", "agents", "adhoc", "README.md")),
        ).resolves.toBe(true);
        await expect(readFile(existingProjectFile, "utf8")).resolves.toBe("keep project edits\n");
        await expect(pathExists(join(homeRoot, ".config", "mawm", "manifest.json"))).resolves.toBe(
            true,
        );
    } finally {
        await rm(sandboxRoot, { recursive: true, force: true });
    }
});

test("init leaves an existing user config untouched", async () => {
    if (!init.run) {
        throw new Error("init command is missing its run handler");
    }

    const sandboxRoot = await mkdtemp(join(tmpdir(), "mawm-init-"));
    const projectRoot = join(sandboxRoot, "project");
    const homeRoot = join(sandboxRoot, "home");
    const existingConfigFile = join(homeRoot, ".config", "mawm", "manifest.json");

    try {
        await mkdir(projectRoot, { recursive: true });
        await mkdir(join(homeRoot, ".config", "mawm"), { recursive: true });
        await writeFile(existingConfigFile, '["keep config edits"]\n');

        await expect(
            init.run({
                context: {
                    cwd: projectRoot,
                    env: { ...process.env, HOME: homeRoot },
                    rawArgs: ["init"],
                },
            }),
        ).resolves.toBe(0);

        await expect(readFile(existingConfigFile, "utf8")).resolves.toBe('["keep config edits"]\n');
    } finally {
        await rm(sandboxRoot, { recursive: true, force: true });
    }
});

test("install copies a registered workflow from ~/.config/mawm into .mawm/graphs and refreshes the global manifest", async () => {
    const sandboxRoot = await mkdtemp(join(tmpdir(), "mawm-install-"));
    const projectRoot = join(sandboxRoot, "project");
    const homeRoot = join(sandboxRoot, "home");
    const configRoot = join(homeRoot, ".config", "mawm");
    const workflowRoot = join(configRoot, "alpha");
    const workflowMetadata = {
        id: "alpha",
        displayName: "Alpha Workflow",
        workflowVersion: "1.2.3",
    };
    const langgraphConfig = {
        graphs: {
            agent: "./index.js:graph",
        },
    };
    const workflowSource = 'export const graph = { id: "alpha" };\n';

    try {
        await mkdir(projectRoot, { recursive: true });
        await mkdir(workflowRoot, { recursive: true });
        await writeFile(join(configRoot, "manifest.json"), "[]\n");
        await writeFile(
            join(workflowRoot, "mawm.json"),
            `${JSON.stringify(workflowMetadata, null, 2)}\n`,
        );
        await writeFile(
            join(workflowRoot, "langgraph.json"),
            `${JSON.stringify(langgraphConfig, null, 2)}\n`,
        );
        await writeFile(join(workflowRoot, "index.js"), workflowSource);

        const { result, stdout, stderr } = await captureOutput(async () => {
            return await parseCommand(["install", "alpha"], {
                cwd: projectRoot,
                env: { ...process.env, HOME: homeRoot },
                rawArgs: ["install", "alpha"],
            });
        });

        expect(result).toBe(0);
        expect(stdout).toBe("Installed workflow `alpha` into .mawm/graphs/alpha.\n");
        expect(stderr).toBe("");
        await expect(
            readFile(join(projectRoot, ".mawm", "graphs", "alpha", "mawm.json"), "utf8"),
        ).resolves.toBe(`${JSON.stringify(workflowMetadata, null, 2)}\n`);
        await expect(
            readFile(join(projectRoot, ".mawm", "graphs", "alpha", "langgraph.json"), "utf8"),
        ).resolves.toBe(`${JSON.stringify(langgraphConfig, null, 2)}\n`);
        await expect(
            readFile(join(projectRoot, ".mawm", "graphs", "alpha", "index.js"), "utf8"),
        ).resolves.toBe(workflowSource);
        await expect(pathExists(join(projectRoot, ".mawm", "maws", "alpha"))).resolves.toBe(false);

        expect(JSON.parse(await readFile(join(configRoot, "manifest.json"), "utf8"))).toEqual([
            {
                ...workflowMetadata,
                path: "./alpha",
            },
        ]);
    } finally {
        await rm(sandboxRoot, { recursive: true, force: true });
    }
});

test("list -g lists globally registered workflows from ~/.config/mawm", async () => {
    const sandboxRoot = await mkdtemp(join(tmpdir(), "mawm-list-"));
    const projectRoot = join(sandboxRoot, "project");
    const homeRoot = join(sandboxRoot, "home");

    try {
        await mkdir(join(projectRoot, ".mawm", "maws", "project-workflow"), { recursive: true });
        await mkdir(join(homeRoot, ".config", "mawm", "beta-workflow"), { recursive: true });
        await mkdir(join(homeRoot, ".config", "mawm", "alpha-workflow"), { recursive: true });

        const { result, stdout, stderr } = await captureOutput(async () => {
            return await parseCommand(["list", "-g"], {
                cwd: projectRoot,
                env: { ...process.env, HOME: homeRoot },
                rawArgs: ["list", "-g"],
            });
        });

        expect(result).toBe(0);
        expect(stdout).toBe("alpha-workflow\nbeta-workflow\n");
        expect(stderr).toBe("");
    } finally {
        await rm(sandboxRoot, { recursive: true, force: true });
    }
});

test("list without flags lists project workflows from .mawm/maws", async () => {
    const sandboxRoot = await mkdtemp(join(tmpdir(), "mawm-list-"));
    const projectRoot = join(sandboxRoot, "project");
    const homeRoot = join(sandboxRoot, "home");

    try {
        await mkdir(join(projectRoot, ".mawm", "maws", "beta-workflow"), { recursive: true });
        await mkdir(join(projectRoot, ".mawm", "maws", "alpha-workflow"), { recursive: true });
        await mkdir(join(homeRoot, ".config", "mawm", "global-workflow"), { recursive: true });

        const { result, stdout, stderr } = await captureOutput(async () => {
            return await parseCommand(["list"], {
                cwd: projectRoot,
                env: { ...process.env, HOME: homeRoot },
                rawArgs: ["list"],
            });
        });

        expect(result).toBe(0);
        expect(stdout).toBe("alpha-workflow\nbeta-workflow\n");
        expect(stderr).toBe("");
    } finally {
        await rm(sandboxRoot, { recursive: true, force: true });
    }
});

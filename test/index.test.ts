import { expect, test } from "bun:test";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import init from "../src/cli/cmd/init.js";
import { runCli } from "../src/index.js";

const pathExists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
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
        await expect(pathExists(join(homeRoot, ".config", ".mawm", "manifest.json"))).resolves.toBe(
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
    const existingConfigFile = join(homeRoot, ".config", ".mawm", "manifest.json");

    try {
        await mkdir(projectRoot, { recursive: true });
        await mkdir(join(homeRoot, ".config", ".mawm"), { recursive: true });
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

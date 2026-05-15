#!/usr/bin/env bun

import { spawn } from "node:child_process";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const smokeRoot = join(repoRoot, "tests", "smoke");
const scratchRoot = join(smokeRoot, ".tmp");
const artifactsRoot = join(scratchRoot, "artifacts");
const targetRoot = join(scratchRoot, "target-project");
const cliPackageRoot = join(repoRoot, "packages", "cli");
const tarballFileName = "mawm-cli-smoke.tgz";
const stagedTarballPath = join(repoRoot, tarballFileName);
const tarballPath = join(artifactsRoot, tarballFileName);

const runCommand = async (command: string, args: readonly string[], cwd: string): Promise<void> => {
    await new Promise<void>((resolvePromise, rejectPromise) => {
        const child = spawn(command, args, {
            cwd,
            env: process.env,
            stdio: "inherit",
        });

        child.on("error", rejectPromise);
        child.on("exit", (code) => {
            if (code === 0) {
                resolvePromise();
                return;
            }

            rejectPromise(new Error(`${command} exited with code ${String(code ?? "unknown")}`));
        });
    });
};

const formatRepoPath = (path: string): string => {
    const repoRelativePath = relative(repoRoot, path);

    return repoRelativePath.length > 0 ? repoRelativePath : ".";
};

const resetSmokeWorkspace = async (): Promise<void> => {
    await rm(artifactsRoot, { recursive: true, force: true });
    await rm(targetRoot, { recursive: true, force: true });
    await mkdir(artifactsRoot, { recursive: true });
    await mkdir(targetRoot, { recursive: true });
};

const writeTargetProject = async (): Promise<void> => {
    await writeFile(
        join(targetRoot, "package.json"),
        `${JSON.stringify(
            {
                name: "mawm-smoke-target",
                private: true,
                type: "module",
                scripts: {
                    mawm: "mawm",
                },
            },
            null,
            2,
        )}\n`,
    );
    await writeFile(join(targetRoot, "index.ts"), "export const smokeTarget = true;\n");
};

const main = async (): Promise<void> => {
    console.log(`Preparing smoke workspace at ${formatRepoPath(scratchRoot)}...`);
    await resetSmokeWorkspace();
    await writeTargetProject();

    console.log(`Building @mawm/cli from ${formatRepoPath(cliPackageRoot)}...`);
    await runCommand("bun", ["run", "build"], cliPackageRoot);

    console.log(`Packing @mawm/cli to ${formatRepoPath(tarballPath)}...`);
    await rm(stagedTarballPath, { force: true });
    await runCommand(
        "bun",
        [
            "pm",
            "pack",
            "--quiet",
            "--filename",
            tarballFileName,
        ],
        cliPackageRoot,
    );
    await rename(stagedTarballPath, tarballPath);

    console.log(`Installing packed CLI into ${formatRepoPath(targetRoot)}...`);
    await runCommand("bun", ["add", relative(targetRoot, tarballPath)], targetRoot);

    console.log("Verifying installed CLI entrypoint...");
    await runCommand(
        "node",
        [join(targetRoot, "node_modules", "@mawm", "cli", "bin", "mawm.js"), "--help"],
        targetRoot,
    );

    console.log(`Smoke target ready: ${formatRepoPath(targetRoot)}`);
    console.log(`Packed tarball: ${formatRepoPath(tarballPath)}`);
};

main().catch((error: unknown) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
});

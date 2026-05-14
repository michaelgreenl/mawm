import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
    copyCliAssetsToDist,
    getRepoRoot,
    runCommand,
    syncWorkflowDistToCliAssets,
} from "../../../scripts/build/workflow-bundle.js";

export const getDefaultCliBuildPaths = (repoRoot = getRepoRoot()) => {
    return {
        repoRoot,
        cliAssetsRoot: join(repoRoot, "packages", "cli", "assets"),
        cliWorkflowAssetsRoot: join(repoRoot, "packages", "cli", "assets", "workflows"),
        cliDistAssetsRoot: join(repoRoot, "packages", "cli", "dist", "assets"),
    };
};

const runCliTypeScriptBuild = async ({ repoRoot }) => {
    await runCommand("bun", ["x", "tsc", "-p", "packages/cli/tsconfig.json"], { cwd: repoRoot });
};

export const buildCliPackage = async (
    { repoRoot = getRepoRoot() } = {},
    { buildTypeScript = runCliTypeScriptBuild } = {},
) => {
    const cliPaths = getDefaultCliBuildPaths(repoRoot);

    await syncWorkflowDistToCliAssets({
        repoRoot,
        cliWorkflowAssetsRoot: cliPaths.cliWorkflowAssetsRoot,
    });
    await buildTypeScript({ repoRoot });
    await copyCliAssetsToDist({
        cliAssetsRoot: cliPaths.cliAssetsRoot,
        cliDistAssetsRoot: cliPaths.cliDistAssetsRoot,
    });
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    buildCliPackage().catch((error) => {
        const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
    });
}

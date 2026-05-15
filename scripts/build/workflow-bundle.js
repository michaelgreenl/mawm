import { spawn } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const getRepoRoot = () => {
    return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
};

export const getWorkflowBundlePaths = (workflowRoot) => {
    return {
        workflowRoot,
        outputRoot: join(workflowRoot, "dist"),
    };
};

export const emptyDirectory = async (dirPath) => {
    await rm(dirPath, { recursive: true, force: true });
    await mkdir(dirPath, { recursive: true });
};

const copyFile = async (sourcePath, targetPath) => {
    await mkdir(dirname(targetPath), { recursive: true });
    await cp(sourcePath, targetPath, { force: true });
};

const copyPath = async (sourcePath, targetPath, shouldCopy) => {
    const entry = await stat(sourcePath);

    if (entry.isDirectory()) {
        await mkdir(targetPath, { recursive: true });

        for (const childName of await readdir(sourcePath)) {
            await copyPath(join(sourcePath, childName), join(targetPath, childName), shouldCopy);
        }

        return;
    }

    if (!shouldCopy(sourcePath)) {
        return;
    }

    await copyFile(sourcePath, targetPath);
};

export const copyDirectory = async (sourceDir, targetDir, shouldCopy = () => true) => {
    await mkdir(targetDir, { recursive: true });

    for (const childName of await readdir(sourceDir)) {
        await copyPath(join(sourceDir, childName), join(targetDir, childName), shouldCopy);
    }
};

const readJson = async (filePath) => {
    return JSON.parse(await readFile(filePath, "utf8"));
};

const writeJson = async (filePath, value) => {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

export const runCommand = async (command, args, options = {}) => {
    await new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(command, args, {
            stdio: "inherit",
            ...options,
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

export const defaultBuildEntry = async ({ entrypoint, outfile }) => {
    await mkdir(dirname(outfile), { recursive: true });
    await runCommand(
        "bun",
        ["build", "--target=node", "--format=esm", "--outfile", outfile, entrypoint],
        { cwd: getRepoRoot() },
    );
};

const changeExtension = (filePath, nextExtension) => {
    return `${filePath.slice(0, -extname(filePath).length)}${nextExtension}`;
};

const resolveSharedAssetPath = (specifier, workflowRoot) => {
    return createRequire(join(workflowRoot, "package.json")).resolve(specifier);
};

const resolveCoreUtilsAsset = (assetPath, workflowRoot, outputRoot) => {
    const relativeAssetPath = assetPath.startsWith("src/") ? assetPath.slice(4) : assetPath;
    const parts = relativeAssetPath.split("/");
    const assetName = parts.at(-1);

    if (!assetName) {
        throw new Error(`Invalid workflow core asset path: ${assetPath}`);
    }

    if (parts[0] === "prompts") {
        return {
            sourcePath: resolveSharedAssetPath(`@mawm/utils/${relativeAssetPath}`, workflowRoot),
            targetPath: join(outputRoot, "assets", "prompts", assetName),
        };
    }

    if (parts[0] === "plugins") {
        return {
            sourcePath: resolveSharedAssetPath(`@mawm/utils/plugins/${assetName}`, workflowRoot),
            targetPath: join(outputRoot, "assets", "plugins", assetName),
        };
    }

    if (parts[0] === "tools") {
        return {
            sourcePath: resolveSharedAssetPath(`@mawm/utils/tools/${assetName}`, workflowRoot),
            targetPath: join(outputRoot, "assets", "tools", assetName),
        };
    }

    throw new Error(`Unsupported workflow core asset path: ${assetPath}`);
};

const buildCoreUtilsAssets = async ({ workflowDefinition, workflowRoot, outputRoot }) => {
    for (const assetPath of workflowDefinition.coreUtils?.assets ?? []) {
        const resolvedAsset = resolveCoreUtilsAsset(assetPath, workflowRoot, outputRoot);
        await copyFile(resolvedAsset.sourcePath, resolvedAsset.targetPath);
    }
};

const bundleGraphEntries = async ({ workflowRoot, outputRoot, buildEntry }) => {
    const langgraphConfig = await readJson(join(workflowRoot, "langgraph.json"));
    const bundledGraphs = {};

    for (const [graphName, graphEntry] of Object.entries(langgraphConfig.graphs ?? {})) {
        const [sourcePath, exportName = "graph"] = graphEntry.split(":");
        const outputName = changeExtension(basename(sourcePath), ".js");

        await buildEntry({
            entrypoint: resolve(workflowRoot, sourcePath),
            outfile: join(outputRoot, "graph", outputName),
        });

        bundledGraphs[graphName] = `./${outputName}:${exportName}`;
    }

    const bundledConfig = {
        ...langgraphConfig,
        graphs: bundledGraphs,
    };

    delete bundledConfig.dependencies;

    await writeJson(join(outputRoot, "graph", "langgraph.json"), bundledConfig);
};

export const buildWorkflowBundle = async (
    { workflowRoot, outputRoot },
    { buildEntry = defaultBuildEntry } = {},
) => {
    const workflowDefinition = await readJson(join(workflowRoot, "src", "maw.json"));

    await emptyDirectory(outputRoot);
    await copyFile(join(workflowRoot, "src", "maw.json"), join(outputRoot, "maw.json"));
    await copyDirectory(
        join(workflowRoot, "src", "assets"),
        join(outputRoot, "assets"),
        (filePath) => {
            return !filePath.endsWith("index.ts");
        },
    );
    await buildCoreUtilsAssets({ workflowDefinition, workflowRoot, outputRoot });
    await bundleGraphEntries({ workflowRoot, outputRoot, buildEntry });
};

const expandWorkspacePattern = async (repoRoot, workspacePattern) => {
    const starIndex = workspacePattern.indexOf("*");

    if (starIndex === -1) {
        return [join(repoRoot, workspacePattern)];
    }

    if (workspacePattern.indexOf("*", starIndex + 1) !== -1) {
        throw new Error(`Unsupported workspace pattern: ${workspacePattern}`);
    }

    const prefix = workspacePattern.slice(0, starIndex);
    const suffix = workspacePattern.slice(starIndex + 1);
    const parentDir = join(repoRoot, prefix);
    const children = await readdir(parentDir, { withFileTypes: true });

    return children
        .filter((child) => child.isDirectory())
        .map((child) => join(parentDir, child.name, suffix));
};

export const discoverWorkflowRoots = async (repoRoot = getRepoRoot()) => {
    const rootPackage = await readJson(join(repoRoot, "package.json"));
    const workflowPatterns = (rootPackage.workspaces ?? []).filter((workspacePattern) => {
        return workspacePattern.startsWith("packages/workflows/");
    });
    const discoveredWorkflowRoots = [];

    for (const workflowPattern of workflowPatterns) {
        for (const workflowRoot of await expandWorkspacePattern(repoRoot, workflowPattern)) {
            try {
                await readJson(join(workflowRoot, "package.json"));
                await readJson(join(workflowRoot, "src", "maw.json"));

                discoveredWorkflowRoots.push(resolve(workflowRoot));
            } catch {
                // Ignore non-package matches inside the workspace glob.
            }
        }
    }

    return discoveredWorkflowRoots.sort();
};

const buildWorkspaceWorkflow = async ({ workflowRoot }) => {
    await runCommand("bun", ["run", "build"], { cwd: workflowRoot });
};

const readWorkflowManifestEntry = async (workflowDistRoot) => {
    const workflowDefinition = await readJson(join(workflowDistRoot, "maw.json"));

    return {
        id: workflowDefinition.id,
        displayName: workflowDefinition.displayName,
        description: workflowDefinition.description,
        path: `./${workflowDefinition.id}`,
        workflowVersion: workflowDefinition.workflowVersion,
        runtimeRegistryKey: workflowDefinition.runtimeRegistryKey,
    };
};

export const syncWorkflowDistToCliAssets = async (
    {
        repoRoot = getRepoRoot(),
        cliWorkflowAssetsRoot = join(repoRoot, "packages", "cli", "src", "assets", "workflows"),
    } = {},
    { buildWorkflow = buildWorkspaceWorkflow, findWorkflowRoots = discoverWorkflowRoots } = {},
) => {
    const workflowRoots = await findWorkflowRoots(repoRoot);
    const manifestEntries = [];

    await emptyDirectory(cliWorkflowAssetsRoot);

    for (const workflowRoot of workflowRoots) {
        await buildWorkflow({ workflowRoot, repoRoot });

        const workflowDistRoot = join(workflowRoot, "dist");
        const manifestEntry = await readWorkflowManifestEntry(workflowDistRoot);

        await copyDirectory(workflowDistRoot, join(cliWorkflowAssetsRoot, manifestEntry.id));
        manifestEntries.push(manifestEntry);
    }

    manifestEntries.sort((left, right) => left.id.localeCompare(right.id));

    await writeJson(join(cliWorkflowAssetsRoot, "manifest.json"), {
        workflows: manifestEntries,
    });
};

export const copyCliAssetsToDist = async ({ cliAssetsRoot, cliDistAssetsRoot }) => {
    await emptyDirectory(cliDistAssetsRoot);
    await copyDirectory(cliAssetsRoot, cliDistAssetsRoot);
};

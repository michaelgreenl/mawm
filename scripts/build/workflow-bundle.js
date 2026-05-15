import { spawn } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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

const SHARED_ASSET_SPECIFIER_PREFIX = "@mawm/utils/";

const resolveSharedAssetPath = (specifier, workflowRoot) => {
    return createRequire(join(workflowRoot, "package.json")).resolve(specifier);
};

const resolveSharedAsset = (specifier, workflowRoot, outputRoot) => {
    if (!specifier.startsWith(SHARED_ASSET_SPECIFIER_PREFIX)) {
        throw new Error(`Invalid workflow shared asset specifier: ${specifier}`);
    }

    const relativeAssetPath = specifier.slice(SHARED_ASSET_SPECIFIER_PREFIX.length);
    const parts = relativeAssetPath.split("/");
    const assetName = parts.at(-1);

    if (!assetName) {
        throw new Error(`Invalid workflow shared asset specifier: ${specifier}`);
    }

    if (parts[0] === "prompts") {
        return {
            sourcePath: resolveSharedAssetPath(specifier, workflowRoot),
            targetPath: join(outputRoot, "assets", "prompts", assetName),
        };
    }

    if (parts[0] === "plugins") {
        return {
            sourcePath: resolveSharedAssetPath(specifier, workflowRoot),
            targetPath: join(outputRoot, "assets", "plugins", assetName),
        };
    }

    if (parts[0] === "tools") {
        return {
            sourcePath: resolveSharedAssetPath(specifier, workflowRoot),
            targetPath: join(outputRoot, "assets", "tools", assetName),
        };
    }

    throw new Error(`Unsupported workflow shared asset specifier: ${specifier}`);
};

const collectAssetIndexFiles = async (rootDir) => {
    const indexFiles = [];

    for (const entry of await readdir(rootDir, { withFileTypes: true })) {
        const entryPath = join(rootDir, entry.name);

        if (entry.isDirectory()) {
            indexFiles.push(...(await collectAssetIndexFiles(entryPath)));
            continue;
        }

        if (entry.name === "index.ts") {
            indexFiles.push(entryPath);
        }
    }

    return indexFiles.sort();
};

const discoverSharedAssetSpecifiers = async (workflowRoot) => {
    const assetIndexFiles = await collectAssetIndexFiles(join(workflowRoot, "src", "assets"));
    const discoveredSpecifiers = new Set();

    for (const indexFile of assetIndexFiles) {
        const sourceText = await readFile(indexFile, "utf8");
        const sourceFile = ts.createSourceFile(
            indexFile,
            sourceText,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TS,
        );

        const visit = (node) => {
            if (
                (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
                node.text.startsWith(SHARED_ASSET_SPECIFIER_PREFIX)
            ) {
                discoveredSpecifiers.add(node.text);
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
    }

    return [...discoveredSpecifiers].sort();
};

const copySharedAssets = async ({ workflowRoot, outputRoot }) => {
    for (const specifier of await discoverSharedAssetSpecifiers(workflowRoot)) {
        const resolvedAsset = resolveSharedAsset(specifier, workflowRoot, outputRoot);
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
    await emptyDirectory(outputRoot);
    await copyFile(join(workflowRoot, "src", "mawm.json"), join(outputRoot, "mawm.json"));
    await copyDirectory(
        join(workflowRoot, "src", "assets"),
        join(outputRoot, "assets"),
        (filePath) => {
            return !filePath.endsWith("index.ts");
        },
    );
    await copySharedAssets({ workflowRoot, outputRoot });
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
                await readJson(join(workflowRoot, "src", "mawm.json"));

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
    const workflowDefinition = await readJson(join(workflowDistRoot, "mawm.json"));

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

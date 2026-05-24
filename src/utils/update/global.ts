import { rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { copyDirectoryContents, copyRecursive, exists } from "../fs.js";
import { resolveUserConfigRoot } from "../../config/user-config.js";
import { refreshManifest } from "../../config/workflow/manifest.js";
import { resolveWorkflowMetadata, writeWorkflowMetadata } from "../../config/workflow/metadata.js";
import { resolveWorkflowRoot } from "../../config/workflow/root.js";
import type { WorkflowManifestEntry } from "../../config/workflow/manifest.js";
import { getGlobalRepairInstruction } from "./shared.js";

const resolveGlobalSource = async (
    sourcePath: string,
): Promise<{
    sourceDistRoot: string;
    sourceWorkflowRoot: string;
}> => {
    const sourceEntry = await stat(sourcePath);

    if (!sourceEntry.isFile() && !sourceEntry.isDirectory()) {
        throw new Error(`Path is not a file or directory: ${sourcePath}`);
    }

    const sourceStartPath = sourceEntry.isDirectory() ? sourcePath : dirname(sourcePath);
    const sourceWorkflowRoot = await resolveWorkflowRoot(sourceStartPath);
    const sourceDistRoot =
        resolve(sourceStartPath) === resolve(sourceWorkflowRoot)
            ? sourceWorkflowRoot
            : sourceStartPath;

    return {
        sourceDistRoot,
        sourceWorkflowRoot,
    };
};

/**
 * Update a globally installed workflow from its recorded source path.
 *
 * @param workflow - Manifest entry being refreshed
 * @param env - Process-like environment object
 */
export const updateGlobalWorkflow = async (
    workflow: WorkflowManifestEntry,
    env: NodeJS.ProcessEnv,
): Promise<void> => {
    const configRoot = resolveUserConfigRoot(env);
    const manifestPath = join(configRoot, "manifest.json");
    const targetWorkflowRoot = join(configRoot, workflow.id);

    if (!(await exists(targetWorkflowRoot))) {
        throw new Error(`Workflow \`${workflow.id}\` is not installed globally.`);
    }

    if (!workflow.absolutePath) {
        throw new Error(
            `Missing absolutePath for workflow \`${workflow.id}\`. ${getGlobalRepairInstruction(
                workflow.id,
                manifestPath,
            )}`,
        );
    }

    if (!(await exists(workflow.absolutePath))) {
        throw new Error(
            `Source workflow path does not exist: ${
                workflow.absolutePath
            }. ${getGlobalRepairInstruction(workflow.id, manifestPath)}`,
        );
    }

    const { sourceDistRoot, sourceWorkflowRoot } = await resolveGlobalSource(workflow.absolutePath);
    const workflowMetadata = await resolveWorkflowMetadata(sourceWorkflowRoot);

    if (workflowMetadata.id !== workflow.id) {
        throw new Error(
            `Workflow id mismatch: expected ${workflow.id}, found ${
                workflowMetadata.id
            }. ${getGlobalRepairInstruction(workflow.id, manifestPath)}`,
        );
    }

    const installArtifactsAtWorkflowRoot = resolve(sourceDistRoot) === resolve(sourceWorkflowRoot);
    const targetArtifactRoot = installArtifactsAtWorkflowRoot
        ? targetWorkflowRoot
        : join(targetWorkflowRoot, "dist");
    const sourceLanggraphConfigPath = join(sourceWorkflowRoot, "langgraph.json");
    const targetLanggraphConfigPath = join(targetWorkflowRoot, "langgraph.json");

    if (resolve(sourceDistRoot) !== resolve(targetArtifactRoot)) {
        await rm(targetWorkflowRoot, { force: true, recursive: true });

        if (installArtifactsAtWorkflowRoot) {
            await copyDirectoryContents(sourceDistRoot, targetWorkflowRoot);
        } else {
            await copyRecursive(sourceDistRoot, targetArtifactRoot);
        }

        await copyRecursive(sourceLanggraphConfigPath, targetLanggraphConfigPath);
    }

    await writeWorkflowMetadata(targetWorkflowRoot, workflowMetadata);
    await refreshManifest(manifestPath, workflowMetadata, {
        absolutePath: sourceDistRoot,
    });

    process.stdout.write(`Updated workflow \`${workflow.id}\` in ${targetWorkflowRoot}.\n`);
};

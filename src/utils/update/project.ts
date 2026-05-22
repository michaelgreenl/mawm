import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { copyRecursive, exists } from "../fs.js";
import { resolveUserConfigRoot } from "../../config/user-config.js";
import { refreshManifest } from "../../config/workflow/manifest.js";
import { readWorkflowMetadata, writeWorkflowMetadata } from "../../config/workflow/metadata.js";

const replacePath = async (sourcePath: string, targetPath: string): Promise<void> => {
    if (resolve(sourcePath) === resolve(targetPath)) {
        return;
    }

    await rm(targetPath, { force: true, recursive: true });
    await copyRecursive(sourcePath, targetPath);
};

/**
 * Update a project-local workflow from the matching global install.
 *
 * @param workflowId - Workflow to update
 * @param cwd - Project root
 * @param env - Process-like environment object
 */
export const updateProjectWorkflow = async (
    workflowId: string,
    cwd: string,
    env: NodeJS.ProcessEnv,
): Promise<void> => {
    const configRoot = resolveUserConfigRoot(env);
    const sourceWorkflowRoot = join(configRoot, workflowId);
    const targetGraphsRoot = join(cwd, ".mawm", "graphs");
    const targetWorkflowRoot = join(targetGraphsRoot, workflowId);

    if (!(await exists(targetWorkflowRoot))) {
        throw new Error(`Workflow \`${workflowId}\` is not installed in this project.`);
    }

    if (!(await exists(sourceWorkflowRoot))) {
        throw new Error(`Workflow \`${workflowId}\` is not installed globally.`);
    }

    const workflowMetadata = await readWorkflowMetadata(sourceWorkflowRoot);

    if (workflowMetadata.id !== workflowId) {
        throw new Error(
            `Workflow id mismatch: expected ${workflowId}, found ${workflowMetadata.id}`,
        );
    }

    await replacePath(sourceWorkflowRoot, targetWorkflowRoot);
    await writeWorkflowMetadata(targetWorkflowRoot, workflowMetadata);
    await refreshManifest(join(targetGraphsRoot, "manifest.json"), workflowMetadata);

    process.stdout.write(`Updated workflow \`${workflowId}\` in .mawm/graphs/${workflowId}.\n`);
};

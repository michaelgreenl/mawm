import { rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { copyRecursive, exists } from "../../utils/fs.js";
import { resolveUserConfigRoot } from "../../utils/user-config.js";
import { readManifest, refreshManifest } from "../../utils/workflow/manifest.js";
import {
    readWorkflowMetadata,
    resolveWorkflowMetadata,
    writeWorkflowMetadata,
} from "../../utils/workflow/metadata.js";
import { resolveWorkflowRoot } from "../../utils/workflow/root.js";
import { arg, defineCommand, option } from "../../types/builders/command-builder.js";
import type { WorkflowManifestEntry } from "../../types/interfaces/workflow.d.js";

const replacePath = async (sourcePath: string, targetPath: string): Promise<void> => {
    if (resolve(sourcePath) === resolve(targetPath)) {
        return;
    }

    await rm(targetPath, { force: true, recursive: true });
    await copyRecursive(sourcePath, targetPath);
};

const getManifestTargets = (
    manifest: readonly WorkflowManifestEntry[],
    workflowId: string | undefined,
    missingMessage: string,
): readonly WorkflowManifestEntry[] => {
    if (!workflowId) {
        return manifest;
    }

    const workflow = manifest.find((candidate) => candidate.id === workflowId);

    if (!workflow) {
        throw new Error(missingMessage);
    }

    return [workflow];
};

const getGlobalRepairInstruction = (workflowId: string, manifestPath: string): string => {
    return `Please reinstall workflow \`${workflowId}\` or remove it from ${manifestPath}.`;
};

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
            ? join(sourceWorkflowRoot, "dist")
            : sourceStartPath;

    return {
        sourceDistRoot,
        sourceWorkflowRoot,
    };
};

const updateProjectWorkflow = async (
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
    await refreshManifest(join(targetGraphsRoot, "manifest.json"), workflowMetadata);

    process.stdout.write(`Updated workflow \`${workflowId}\` in .mawm/graphs/${workflowId}.\n`);
};

const updateGlobalWorkflow = async (
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
            `Missing absolutePath for workflow \`${workflow.id}\`. ${getGlobalRepairInstruction(workflow.id, manifestPath)}`,
        );
    }

    if (!(await exists(workflow.absolutePath))) {
        throw new Error(
            `Source workflow path does not exist: ${workflow.absolutePath}. ${getGlobalRepairInstruction(workflow.id, manifestPath)}`,
        );
    }

    const { sourceDistRoot, sourceWorkflowRoot } = await resolveGlobalSource(workflow.absolutePath);
    const workflowMetadata = await resolveWorkflowMetadata(sourceWorkflowRoot);

    if (workflowMetadata.id !== workflow.id) {
        throw new Error(
            `Workflow id mismatch: expected ${workflow.id}, found ${workflowMetadata.id}. ${getGlobalRepairInstruction(workflow.id, manifestPath)}`,
        );
    }

    const targetDistRoot = join(targetWorkflowRoot, "dist");
    const sourceLanggraphConfigPath = join(sourceWorkflowRoot, "langgraph.json");
    const targetLanggraphConfigPath = join(targetWorkflowRoot, "langgraph.json");

    if (resolve(sourceDistRoot) !== resolve(targetDistRoot)) {
        await rm(targetWorkflowRoot, { force: true, recursive: true });
        await copyRecursive(sourceDistRoot, targetDistRoot);
        await copyRecursive(sourceLanggraphConfigPath, targetLanggraphConfigPath);
    }

    await writeWorkflowMetadata(targetWorkflowRoot, workflowMetadata);
    await refreshManifest(manifestPath, workflowMetadata, {
        absolutePath: sourceDistRoot,
    });

    process.stdout.write(`Updated workflow \`${workflow.id}\` in ${targetWorkflowRoot}.\n`);
};

const outputWorkflowError = (workflowId: string, error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Unable to update workflow \`${workflowId}\`: ${message}\n`);
};

const update = defineCommand({
    name: "update",
    description: "Reinstalls workflows into a project or into user config",
    usage: "update [-g] [workflow]",
    args: [arg("workflow", { type: "string" })] as const,
    options: [
        option("global", {
            alias: "g",
            type: "boolean",
        }),
    ] as const,
    async run({ args, context, options }) {
        try {
            const workflowId = args.workflow;

            if (options.global) {
                const configRoot = resolveUserConfigRoot(context.env);
                const manifest = await readManifest(join(configRoot, "manifest.json"));
                const workflows = getManifestTargets(
                    manifest,
                    workflowId,
                    `Workflow \`${workflowId}\` is not installed globally.`,
                );

                let hasErrors = false;

                for (const workflow of workflows) {
                    try {
                        await updateGlobalWorkflow(workflow, context.env);
                    } catch (error) {
                        hasErrors = true;
                        outputWorkflowError(workflow.id, error);
                    }
                }

                return hasErrors ? 1 : 0;
            }

            const targetGraphsRoot = join(context.cwd, ".mawm", "graphs");
            const manifest = await readManifest(join(targetGraphsRoot, "manifest.json"));
            const workflows = getManifestTargets(
                manifest,
                workflowId,
                `Workflow \`${workflowId}\` is not installed in this project.`,
            );
            let hasErrors = false;

            for (const workflow of workflows) {
                try {
                    await updateProjectWorkflow(workflow.id, context.cwd, context.env);
                } catch (error) {
                    hasErrors = true;
                    outputWorkflowError(workflow.id, error);
                }
            }

            return hasErrors ? 1 : 0;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            return 1;
        }
    },
});

export default update;

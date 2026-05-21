import type { WorkflowManifestEntry } from "../../../types/workflow.d.js";

/**
 * Resolve the workflows targeted by an update command.
 *
 * @param manifest - Installed workflows available in the selected scope
 * @param workflowId - Optional specific workflow id filter
 * @param missingMessage - Error message when the requested workflow is absent
 * @returns Target workflows to update
 */
export const getManifestTargets = (
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

/**
 * Describe how to repair a broken global workflow installation.
 *
 * @param workflowId - Workflow identifier
 * @param manifestPath - Manifest path to repair
 * @returns User-facing repair instruction
 */
export const getGlobalRepairInstruction = (workflowId: string, manifestPath: string): string => {
    return `Please reinstall workflow \`${workflowId}\` or remove it from ${manifestPath}.`;
};

/**
 * Write a workflow-specific update failure to stderr.
 *
 * @param workflowId - Workflow that failed to update
 * @param error - Original failure
 */
export const outputWorkflowError = (workflowId: string, error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Unable to update workflow \`${workflowId}\`: ${message}\n`);
};

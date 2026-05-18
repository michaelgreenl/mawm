import { exists, readJson, writeJson } from "../fs.js";
import type { WorkflowManifestEntry, WorkflowMetadata } from "../../types/interfaces/workflow.d.js";
import { isWorkflowManifestEntry } from "./validator.js";

/**
 * Read and validate a workflow manifest file.
 *
 * @param manifestPath - Path to manifest.json
 * @returns Manifest entries, or an empty list when missing
 * @throws Error when the manifest has an invalid shape
 */
export const readManifest = async (manifestPath: string): Promise<WorkflowManifestEntry[]> => {
    if (!(await exists(manifestPath))) {
        return [];
    }

    const manifest = await readJson<unknown>(manifestPath);

    if (!Array.isArray(manifest) || !manifest.every(isWorkflowManifestEntry)) {
        throw new Error(`Invalid workflow manifest: ${manifestPath}`);
    }

    return manifest;
};

/**
 * Upsert workflow metadata into a manifest file.
 *
 * @param manifestPath - Path to manifest.json
 * @param workflowMetadata - Workflow metadata to register
 */
export const refreshManifest = async (
    manifestPath: string,
    workflowMetadata: WorkflowMetadata,
): Promise<void> => {
    const nextManifest = [
        ...(await readManifest(manifestPath)).filter(
            (candidate) => candidate.id !== workflowMetadata.id,
        ),
        {
            ...workflowMetadata,
            path: `./${workflowMetadata.id}`,
        },
    ].sort((left, right) => left.id.localeCompare(right.id));

    await writeJson(manifestPath, nextManifest);
};

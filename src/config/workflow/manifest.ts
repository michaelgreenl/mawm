import { exists, readJson, writeJson } from "../../utils/fs.js";
import type { WorkflowMetadata } from "./metadata.js";
import { normalizeWorkflowMetadata } from "./metadata.js";

/** Manifest entry pointing to an installed workflow. */
export interface WorkflowManifestEntry extends WorkflowMetadata {
    path: string;
    absolutePath?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

const normalizeWorkflowManifestEntry = (value: unknown): WorkflowManifestEntry | undefined => {
    if (
        !isRecord(value) ||
        typeof value["path"] !== "string" ||
        (typeof value["absolutePath"] !== "undefined" && typeof value["absolutePath"] !== "string")
    ) {
        return undefined;
    }

    const workflowMetadata = normalizeWorkflowMetadata(value);

    if (!workflowMetadata) {
        return undefined;
    }

    return {
        ...workflowMetadata,
        ...(typeof value["absolutePath"] === "string"
            ? { absolutePath: value["absolutePath"] }
            : {}),
        path: value["path"],
    };
};

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

    if (!Array.isArray(manifest)) {
        throw new Error(`Invalid workflow manifest: ${manifestPath}`);
    }

    const normalizedManifest = manifest.map(normalizeWorkflowManifestEntry);

    if (
        !normalizedManifest.every(
            (entry): entry is WorkflowManifestEntry => typeof entry !== "undefined",
        )
    ) {
        throw new Error(`Invalid workflow manifest: ${manifestPath}`);
    }

    return normalizedManifest;
};

/**
 * Upsert workflow metadata into a manifest file.
 *
 * @param manifestPath - Path to manifest.json
 * @param workflowMetadata - Workflow metadata to upsert
 */
export const refreshManifest = async (
    manifestPath: string,
    workflowMetadata: WorkflowMetadata,
    options?: {
        absolutePath?: string;
    },
): Promise<void> => {
    const nextManifest = [
        ...(await readManifest(manifestPath)).filter(
            (candidate) => candidate.id !== workflowMetadata.id,
        ),
        {
            ...workflowMetadata,
            path: `./${workflowMetadata.id}`,
            ...(options?.absolutePath ? { absolutePath: options.absolutePath } : {}),
        },
    ].sort((left, right) => left.id.localeCompare(right.id));

    await writeJson(manifestPath, nextManifest);
};

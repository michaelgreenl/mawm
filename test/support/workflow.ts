import type { WorkflowManifestEntry } from "../../src/config/workflow/manifest.js";
import type { WorkflowMetadata } from "../../src/config/workflow/metadata.js";

interface MetadataInput {
    displayName?: string;
    id: string;
    workflowVersion?: string;
}

interface ManifestEntryInput extends MetadataInput {
    absolutePath?: string;
}

/** Builds normalized workflow metadata that matches current persisted test fixtures. */
export const metadata = (input: MetadataInput): WorkflowMetadata => {
    return {
        displayName: input.displayName ?? input.id,
        executionContract: {
            optionalContext: [],
            optionalInput: [],
            requiredContext: [],
            requiredInput: [],
            supportsResume: false,
        },
        id: input.id,
        kind: "standalone",
        workflowVersion: input.workflowVersion ?? "1.0.0",
    };
};

/** Builds a normalized manifest entry that matches current persisted test fixtures. */
export const manifestEntry = (input: ManifestEntryInput): WorkflowManifestEntry => {
    return {
        ...metadata(input),
        ...(typeof input.absolutePath === "string" ? { absolutePath: input.absolutePath } : {}),
        path: `./${input.id}`,
    };
};

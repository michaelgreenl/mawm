import type { WorkflowManifestEntry } from "../../src/config/workflow/manifest.js";
import type { WorkflowMetadata } from "../../src/config/workflow/metadata.js";

interface MetadataInput {
    agents?: string[];
    displayName?: string;
    id: string;
    phases?: string[];
    workflowVersion?: string;
}

interface ManifestEntryInput extends MetadataInput {
    absolutePath?: string;
}

/** Builds normalized workflow metadata that matches current persisted test fixtures. */
export const metadata = (input: MetadataInput): WorkflowMetadata => {
    return {
        id: input.id,
        displayName: input.displayName ?? input.id,
        workflowVersion: input.workflowVersion ?? "1.0.0",
        kind: "standalone",
        ...(typeof input.agents !== "undefined" ? { agents: [...input.agents] } : {}),
        ...(typeof input.phases !== "undefined" ? { phases: [...input.phases] } : {}),
        executionContract: {
            optionalContext: [],
            optionalInput: [],
            requiredContext: [],
            requiredInput: [],
            supportsResume: false,
        },
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

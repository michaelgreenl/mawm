/** Metadata stored in a workflow's mawm.json file. */
export interface WorkflowMetadata {
    id: string;
    displayName: string;
    workflowVersion: string;
}

/** Manifest entry pointing to an installed workflow. */
export interface WorkflowManifestEntry extends WorkflowMetadata {
    path: string;
}

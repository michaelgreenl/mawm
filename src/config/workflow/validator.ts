import type { WorkflowManifestEntry } from "./manifest.js";
import type { WorkflowMetadata } from "./metadata.js";

const WORKFLOW_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null;
};

/** Check whether a workflow id contains only supported characters. */
export const isValidWorkflowId = (workflowId: string): boolean => {
    return WORKFLOW_ID_PATTERN.test(workflowId);
};

/** Check whether a value is valid workflow metadata. */
export const isWorkflowMetadata = (value: unknown): value is WorkflowMetadata => {
    return (
        isObjectRecord(value) &&
        typeof value["id"] === "string" &&
        typeof value["displayName"] === "string" &&
        typeof value["workflowVersion"] === "string"
    );
};

/** Check whether a value is valid workflow manifest entry. */
export const isWorkflowManifestEntry = (value: unknown): value is WorkflowManifestEntry => {
    return (
        isObjectRecord(value) &&
        typeof value["path"] === "string" &&
        (value["absolutePath"] === undefined || typeof value["absolutePath"] === "string") &&
        isWorkflowMetadata(value)
    );
};

/** Throw when a workflow id contains unsupported characters. */
export const assertValidWorkflowId = (workflowId: string): void => {
    if (!isValidWorkflowId(workflowId)) {
        throw new Error(`Invalid workflow id: ${workflowId}`);
    }
};

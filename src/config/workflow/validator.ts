const WORKFLOW_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Check whether a workflow id contains only supported characters. */
export const isValidWorkflowId = (workflowId: string): boolean => {
    return WORKFLOW_ID_PATTERN.test(workflowId);
};

/** Throw when a workflow id contains unsupported characters. */
export const assertValidWorkflowId = (workflowId: string): void => {
    if (!isValidWorkflowId(workflowId)) {
        throw new Error(`Invalid workflow id: ${workflowId}`);
    }
};

import { join } from "node:path";
import { readJson } from "../fs.js";
import type { WorkflowMetadata } from "../../types/interfaces/workflow.d.js";
import { isWorkflowMetadata } from "./validator.js";

/**
 * Read and validate workflow metadata from a workflow root.
 *
 * @param workflowRoot - Directory containing mawm.json
 * @returns Parsed workflow metadata
 * @throws Error when mawm.json has an invalid shape
 */
export const readWorkflowMetadata = async (workflowRoot: string): Promise<WorkflowMetadata> => {
    const workflowMetadataPath = join(workflowRoot, "mawm.json");
    const workflowMetadata = await readJson<unknown>(workflowMetadataPath);

    if (!isWorkflowMetadata(workflowMetadata)) {
        throw new Error(`Invalid workflow metadata: ${workflowMetadataPath}`);
    }

    return workflowMetadata;
};

import { dirname, join } from "node:path";
import { exists } from "../../utils/fs.js";

/**
 * Find the nearest workflow root above a starting path.
 *
 * @param startPath - Path inside or at a workflow root
 * @returns Directory containing langgraph.json
 * @throws Error when no workflow root can be found
 */
export const resolveWorkflowRoot = async (startPath: string): Promise<string> => {
    let currentPath = startPath;

    while (true) {
        if (await exists(join(currentPath, "langgraph.json"))) {
            return currentPath;
        }

        const parentPath = dirname(currentPath);

        if (parentPath === currentPath) {
            throw new Error(
                `Unable to find a workflow root for ${startPath}. Expected langgraph.json in the provided path or one of its parents.`,
            );
        }

        currentPath = parentPath;
    }
};

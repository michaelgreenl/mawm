import { basename, dirname, join } from "node:path";
import { exists, readJson, writeJson } from "../../cores/lib/fs.js";
import type { WorkflowMetadata } from "../../../types/interfaces/workflow.d.js";
import { assertValidWorkflowId, isValidWorkflowId, isWorkflowMetadata } from "./validator.js";

type PackageMetadata = {
    name?: unknown;
    version?: unknown;
};

const isNonEmptyString = (value: unknown): value is string => {
    return typeof value === "string" && value.length > 0;
};

const getPackageWorkflowId = (packageMetadata: PackageMetadata): string | undefined => {
    const packageName = isNonEmptyString(packageMetadata.name) ? packageMetadata.name : undefined;
    const packageNameId = packageName?.split("/").at(-1);

    return packageNameId && isValidWorkflowId(packageNameId) ? packageNameId : undefined;
};

const toWorkflowMetadata = (
    workflowId: string,
    packageMetadata: PackageMetadata,
): WorkflowMetadata => {
    return {
        id: workflowId,
        displayName: isNonEmptyString(packageMetadata.name) ? packageMetadata.name : workflowId,
        workflowVersion: isNonEmptyString(packageMetadata.version)
            ? packageMetadata.version
            : "0.0.0",
    };
};

const deriveWorkflowId = (workflowRoot: string, packageMetadata: PackageMetadata): string => {
    const packageNameId = getPackageWorkflowId(packageMetadata);

    if (packageNameId) {
        return packageNameId;
    }

    const directoryName = basename(workflowRoot);

    if (isValidWorkflowId(directoryName)) {
        return directoryName;
    }

    throw new Error(
        `Unable to derive workflow metadata for ${workflowRoot}. Add mawm.json or package.json with a valid workflow name.`,
    );
};

const readPackageMetadata = async (workflowRoot: string): Promise<PackageMetadata> => {
    const packageMetadataPath = join(workflowRoot, "package.json");

    if (!(await exists(packageMetadataPath))) {
        return {};
    }

    return await readJson<PackageMetadata>(packageMetadataPath);
};

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

/** Read workflow metadata, deriving it from package.json when mawm.json is missing. */
export const resolveWorkflowMetadata = async (workflowRoot: string): Promise<WorkflowMetadata> => {
    const workflowMetadataPath = join(workflowRoot, "mawm.json");

    if (await exists(workflowMetadataPath)) {
        return await readWorkflowMetadata(workflowRoot);
    }

    const packageMetadata = await readPackageMetadata(workflowRoot);

    if (getPackageWorkflowId(packageMetadata)) {
        return toWorkflowMetadata(deriveWorkflowId(workflowRoot, packageMetadata), packageMetadata);
    }

    if (basename(workflowRoot) === "dist") {
        const parentWorkflowRoot = dirname(workflowRoot);
        const parentWorkflowMetadataPath = join(parentWorkflowRoot, "mawm.json");

        if (await exists(parentWorkflowMetadataPath)) {
            return await readWorkflowMetadata(parentWorkflowRoot);
        }

        const parentPackageMetadata = await readPackageMetadata(parentWorkflowRoot);

        if (getPackageWorkflowId(parentPackageMetadata)) {
            return toWorkflowMetadata(
                deriveWorkflowId(parentWorkflowRoot, parentPackageMetadata),
                parentPackageMetadata,
            );
        }
    }

    const workflowId = deriveWorkflowId(workflowRoot, packageMetadata);

    assertValidWorkflowId(workflowId);

    return toWorkflowMetadata(workflowId, packageMetadata);
};

/** Write workflow metadata to mawm.json in the target workflow root. */
export const writeWorkflowMetadata = async (
    workflowRoot: string,
    workflowMetadata: WorkflowMetadata,
): Promise<void> => {
    await writeJson(join(workflowRoot, "mawm.json"), workflowMetadata);
};

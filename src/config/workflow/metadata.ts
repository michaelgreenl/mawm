import { basename, dirname, join } from "node:path";
import { exists, readJson, writeJson } from "../../utils/fs.js";
import { assertValidWorkflowId, isValidWorkflowId } from "./validator.js";

export type WorkflowKind = "initiative-run" | "standalone";

export interface WorkflowExecutionContract {
    requiredInput: string[];
    optionalInput: string[];
    requiredContext: string[];
    optionalContext: string[];
    supportsResume: boolean;
}

/** Metadata stored in a workflow's mawm.json file. */
export interface WorkflowMetadata {
    id: string;
    displayName: string;
    workflowVersion: string;
    kind: WorkflowKind;
    agents?: string[];
    phases?: string[];
    executionContract: WorkflowExecutionContract;
}

type PackageMetadata = {
    name?: unknown;
    version?: unknown;
};

type RecordValue = Record<string, unknown>;

const DEFAULT_WORKFLOW_KIND: WorkflowKind = "standalone";
const TOPOLOGY_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createDefaultExecutionContract = (): WorkflowExecutionContract => {
    return {
        optionalContext: [],
        optionalInput: [],
        requiredContext: [],
        requiredInput: [],
        supportsResume: false,
    };
};

const isNonEmptyString = (value: unknown): value is string => {
    return typeof value === "string" && value.length > 0;
};

const isRecord = (value: unknown): value is RecordValue => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isStringArray = (value: unknown): value is string[] => {
    return Array.isArray(value) && value.every((entry) => typeof entry === "string");
};

const toStringArray = (value: unknown): string[] | undefined => {
    if (typeof value === "undefined") {
        return [];
    }

    return isStringArray(value) ? [...value] : undefined;
};

const toBoolean = (value: unknown, fallback: boolean): boolean | undefined => {
    if (typeof value === "undefined") {
        return fallback;
    }

    return typeof value === "boolean" ? value : undefined;
};

const normalizeTopology = (value: unknown): string[] | undefined => {
    if (typeof value === "undefined") {
        return undefined;
    }

    if (!isStringArray(value)) {
        return undefined;
    }

    const ids = new Set<string>();

    for (const entry of value) {
        if (!TOPOLOGY_ID_PATTERN.test(entry) || ids.has(entry)) {
            return undefined;
        }

        ids.add(entry);
    }

    return [...value];
};

const normalizeExecutionContract = (value: unknown): WorkflowExecutionContract | undefined => {
    if (typeof value === "undefined") {
        return createDefaultExecutionContract();
    }

    if (!isRecord(value)) {
        return undefined;
    }

    const requiredInput = toStringArray(value["requiredInput"]);
    const optionalInput = toStringArray(value["optionalInput"]);
    const requiredContext = toStringArray(value["requiredContext"]);
    const optionalContext = toStringArray(value["optionalContext"]);
    const supportsResume = toBoolean(value["supportsResume"], false);

    if (
        !requiredInput ||
        !optionalInput ||
        !requiredContext ||
        !optionalContext ||
        typeof supportsResume !== "boolean"
    ) {
        return undefined;
    }

    return {
        optionalContext,
        optionalInput,
        requiredContext,
        requiredInput,
        supportsResume,
    };
};

/**
 * Normalizes workflow metadata, filling in default contract values for legacy files.
 *
 * @param value - Parsed mawm.json payload.
 * @returns Normalized workflow metadata, or `undefined` when invalid.
 */
export const normalizeWorkflowMetadata = (value: unknown): WorkflowMetadata | undefined => {
    if (
        !isRecord(value) ||
        typeof value["id"] !== "string" ||
        typeof value["displayName"] !== "string" ||
        typeof value["workflowVersion"] !== "string"
    ) {
        return undefined;
    }

    const kind =
        typeof value["kind"] === "undefined"
            ? DEFAULT_WORKFLOW_KIND
            : value["kind"] === "initiative-run" || value["kind"] === "standalone"
              ? value["kind"]
              : undefined;
    const agents = normalizeTopology(value["agents"]);
    const phases = normalizeTopology(value["phases"]);
    const executionContract = normalizeExecutionContract(value["executionContract"]);

    if (
        !kind ||
        !executionContract ||
        (typeof value["agents"] !== "undefined" && typeof agents === "undefined") ||
        (typeof value["phases"] !== "undefined" && typeof phases === "undefined")
    ) {
        return undefined;
    }

    return {
        id: value["id"],
        displayName: value["displayName"],
        workflowVersion: value["workflowVersion"],
        kind,
        ...(typeof agents !== "undefined" ? { agents } : {}),
        ...(typeof phases !== "undefined" ? { phases } : {}),
        executionContract,
    };
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
        kind: DEFAULT_WORKFLOW_KIND,
        executionContract: createDefaultExecutionContract(),
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
    const workflowMetadata = normalizeWorkflowMetadata(
        await readJson<unknown>(workflowMetadataPath),
    );

    if (!workflowMetadata) {
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

import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { arg, defineCommand } from "../../types/commands.js";

type WorkflowMetadata = {
    id: string;
    displayName: string;
    workflowVersion: string;
};

type WorkflowManifestEntry = WorkflowMetadata & {
    path: string;
};

const WORKFLOW_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const USER_CONFIG_ASSETS_ROOT = fileURLToPath(
    new URL("../../assets/.config/mawm", import.meta.url),
);

const exists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

const readJson = async <T>(path: string): Promise<T> => {
    return JSON.parse(await readFile(path, "utf8")) as T;
};

const writeJson = async (path: string, value: unknown): Promise<void> => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

const copyMissing = async (sourcePath: string, targetPath: string): Promise<void> => {
    const sourceEntry = await stat(sourcePath);

    if (sourceEntry.isDirectory()) {
        await mkdir(targetPath, { recursive: true });

        for (const childName of await readdir(sourcePath)) {
            await copyMissing(join(sourcePath, childName), join(targetPath, childName));
        }

        return;
    }

    if (await exists(targetPath)) {
        return;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
};

const copyRecursive = async (sourcePath: string, targetPath: string): Promise<void> => {
    const sourceEntry = await stat(sourcePath);

    if (sourceEntry.isDirectory()) {
        await mkdir(targetPath, { recursive: true });

        for (const childName of await readdir(sourcePath)) {
            await copyRecursive(join(sourcePath, childName), join(targetPath, childName));
        }

        return;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
};

const resolveHomeDirectory = (env: NodeJS.ProcessEnv): string => {
    const home = env["HOME"];

    if (home) {
        return home;
    }

    const userProfile = env["USERPROFILE"];

    if (userProfile) {
        return userProfile;
    }

    const homeDrive = env["HOMEDRIVE"];
    const homePath = env["HOMEPATH"];

    if (homeDrive && homePath) {
        return `${homeDrive}${homePath}`;
    }

    return homedir();
};

const resolveUserConfigRoot = (env: NodeJS.ProcessEnv): string => {
    return join(resolveHomeDirectory(env), ".config", "mawm");
};

const initializeUserConfig = async (env: NodeJS.ProcessEnv): Promise<void> => {
    const configRoot = resolveUserConfigRoot(env);

    if (await exists(configRoot)) {
        return;
    }

    await copyMissing(USER_CONFIG_ASSETS_ROOT, configRoot);
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null;
};

const isWorkflowMetadata = (value: unknown): value is WorkflowMetadata => {
    return (
        isObjectRecord(value) &&
        typeof value["id"] === "string" &&
        typeof value["displayName"] === "string" &&
        typeof value["workflowVersion"] === "string"
    );
};

const isWorkflowManifestEntry = (value: unknown): value is WorkflowManifestEntry => {
    return (
        isObjectRecord(value) &&
        typeof value["id"] === "string" &&
        typeof value["displayName"] === "string" &&
        typeof value["workflowVersion"] === "string" &&
        typeof value["path"] === "string"
    );
};

const readWorkflowMetadata = async (workflowRoot: string): Promise<WorkflowMetadata> => {
    const workflowMetadataPath = join(workflowRoot, "mawm.json");
    const workflowMetadata = await readJson<unknown>(workflowMetadataPath);

    if (!isWorkflowMetadata(workflowMetadata)) {
        throw new Error(`Invalid workflow metadata: ${workflowMetadataPath}`);
    }

    if (!WORKFLOW_ID_PATTERN.test(workflowMetadata.id)) {
        throw new Error(`Invalid workflow id: ${workflowMetadata.id}`);
    }

    return workflowMetadata;
};

const readManifest = async (manifestPath: string): Promise<WorkflowManifestEntry[]> => {
    if (!(await exists(manifestPath))) {
        return [];
    }

    const manifest = await readJson<unknown>(manifestPath);

    if (!Array.isArray(manifest) || !manifest.every(isWorkflowManifestEntry)) {
        throw new Error(`Invalid workflow manifest: ${manifestPath}`);
    }

    return manifest;
};

const resolveWorkflowRoot = async (executablePath: string): Promise<string> => {
    let currentPath = dirname(executablePath);

    while (true) {
        if (
            (await exists(join(currentPath, "mawm.json"))) &&
            (await exists(join(currentPath, "langgraph.json")))
        ) {
            return currentPath;
        }

        const parentPath = dirname(currentPath);

        if (parentPath === currentPath) {
            throw new Error(
                `Unable to find a workflow root for ${executablePath}. Expected mawm.json and langgraph.json in the executable directory or one of its parents.`,
            );
        }

        currentPath = parentPath;
    }
};

const register = defineCommand({
    name: "register",
    description: "Registers a LangGraph workflow executable",
    usage: "register <path-to-langgraph-executable>",
    args: [arg("executablePath", { required: true, type: "string" })] as const,
    async run({ args, context }) {
        try {
            const sourceExecutablePath = resolve(context.cwd, args.executablePath);
            const sourceExecutableStat = await stat(sourceExecutablePath);

            if (!sourceExecutableStat.isFile()) {
                throw new Error(`Path is not a file: ${args.executablePath}`);
            }

            const workflowRoot = await resolveWorkflowRoot(sourceExecutablePath);
            const workflowMetadata = await readWorkflowMetadata(workflowRoot);
            await initializeUserConfig(context.env);
            const configRoot = resolveUserConfigRoot(context.env);
            const targetWorkflowRoot = join(configRoot, workflowMetadata.id);

            if (resolve(workflowRoot) !== resolve(targetWorkflowRoot)) {
                await copyRecursive(workflowRoot, targetWorkflowRoot);
            }

            const manifestPath = join(configRoot, "manifest.json");
            const manifestEntry: WorkflowManifestEntry = {
                ...workflowMetadata,
                path: `./${workflowMetadata.id}`,
            };
            const nextManifest = [
                ...(await readManifest(manifestPath)).filter(
                    (workflow) => workflow.id !== workflowMetadata.id,
                ),
                manifestEntry,
            ].sort((left, right) => left.id.localeCompare(right.id));

            await writeJson(manifestPath, nextManifest);

            console.log(
                `Registered workflow \`${workflowMetadata.id}\` into ${targetWorkflowRoot}.`,
            );
            return 0;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            return 1;
        }
    },
});

export default register;

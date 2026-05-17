import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { defineCommand, arg } from "../../types/commands.js";

type WorkflowMetadata = {
    id: string;
    displayName: string;
    workflowVersion: string;
};

type WorkflowManifestEntry = WorkflowMetadata & {
    path: string;
};

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

const refreshManifest = async (
    manifestPath: string,
    workflowMetadata: WorkflowMetadata,
): Promise<void> => {
    const nextManifest = [
        ...(await readManifest(manifestPath)).filter(
            (candidate) => candidate.id !== workflowMetadata.id,
        ),
        {
            ...workflowMetadata,
            path: `./${workflowMetadata.id}`,
        },
    ].sort((left, right) => left.id.localeCompare(right.id));

    await writeJson(manifestPath, nextManifest);
};

const install = defineCommand({
    name: "install",
    aliases: ["i"],
    description: "Installs workflows into a target project",
    usage: "{i,install} <workflow>",
    args: [arg("workflow", { required: true, type: "string" })] as const,
    async run({ args, context }) {
        try {
            const workflow = args.workflow;
            const configRoot = resolveUserConfigRoot(context.env);
            const sourceWorkflowRoot = join(configRoot, workflow);

            if (!(await exists(sourceWorkflowRoot))) {
                process.stderr.write(`Unknown workflow: ${workflow}\n`);
                return 1;
            }

            const workflowMetadata = await readWorkflowMetadata(sourceWorkflowRoot);

            if (workflowMetadata.id !== workflow) {
                throw new Error(
                    `Workflow id mismatch: expected ${workflow}, found ${workflowMetadata.id}`,
                );
            }

            const targetWorkflowRoot = join(context.cwd, ".mawm", "graphs", workflow);

            await copyMissing(sourceWorkflowRoot, targetWorkflowRoot);
            await refreshManifest(join(configRoot, "manifest.json"), workflowMetadata);

            process.stdout.write(
                `Installed workflow \`${workflow}\` into .mawm/graphs/${workflow}.\n`,
            );
            return 0;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            return 1;
        }
    },
});

export default install;

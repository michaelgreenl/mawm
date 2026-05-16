import { spawn } from "node:child_process";
import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineCommand, arg } from "../../types/commands.js";

const WORKFLOW_ASSETS_ROOT = fileURLToPath(new URL("../../assets/workflows", import.meta.url));

type WorkflowManifest = {
    workflows: {
        id: string;
        path: string;
    }[];
};

type SkillfishManifestFile = {
    skillfish?: Record<string, unknown>;
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

const writeJsonIfMissing = async (path: string, value: unknown): Promise<void> => {
    if (await exists(path)) {
        return;
    }

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

const copyBundledWorkflow = async (sourceRoot: string, targetRoot: string): Promise<void> => {
    await mkdir(targetRoot, { recursive: true });

    for (const entryName of await readdir(sourceRoot)) {
        const sourcePath = join(sourceRoot, entryName);

        if (entryName === "graph") {
            continue;
        }

        if (entryName !== "assets") {
            await copyMissing(sourcePath, join(targetRoot, entryName));
            continue;
        }

        for (const assetName of await readdir(sourcePath)) {
            const assetPath = join(sourcePath, assetName);

            if (assetName === "skills") {
                const skillsManifestPath = join(assetPath, "skills.json");

                if (await exists(skillsManifestPath)) {
                    const skillsManifest =
                        await readJson<SkillfishManifestFile>(skillsManifestPath);

                    if (!skillsManifest.skillfish) {
                        throw new Error(`Invalid workflow skills manifest: ${skillsManifestPath}`);
                    }

                    await writeJsonIfMissing(
                        join(targetRoot, "skillfish.json"),
                        skillsManifest.skillfish,
                    );
                }

                for (const childName of await readdir(assetPath)) {
                    if (childName === "skills.json") {
                        continue;
                    }

                    await copyMissing(
                        join(assetPath, childName),
                        join(targetRoot, "skills", childName),
                    );
                }

                continue;
            }

            if (assetName === "opencode.json") {
                await copyMissing(assetPath, join(targetRoot, "opencode.json"));
                continue;
            }

            await copyMissing(assetPath, join(targetRoot, assetName));
        }
    }
};

const runCommand = async (
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
): Promise<void> => {
    await new Promise<void>((resolvePromise, rejectPromise) => {
        const child = spawn(command, args, {
            cwd,
            env,
            stdio: "inherit",
        });

        child.on("error", rejectPromise);
        child.on("exit", (code) => {
            if (code === 0) {
                resolvePromise();
                return;
            }

            rejectPromise(new Error(`${command} exited with code ${String(code ?? "unknown")}`));
        });
    });
};

const isSpawnNotFound = (error: unknown): boolean => {
    return (
        typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
    );
};

const installWorkflowSkills = async (
    workflowRoot: string,
    env: NodeJS.ProcessEnv,
): Promise<void> => {
    if (!(await exists(join(workflowRoot, "skillfish.json")))) {
        return;
    }

    if (await exists(join(workflowRoot, "skills"))) {
        return;
    }

    const commandCandidates = [
        { command: "skillfish", args: ["install", "--project", "--yes"] },
        ...(process.versions.bun
            ? [{ command: "bunx", args: ["--yes", "skillfish", "install", "--project", "--yes"] }]
            : []),
        { command: "npx", args: ["--yes", "skillfish", "install", "--project", "--yes"] },
        ...(!process.versions.bun
            ? [{ command: "bunx", args: ["--yes", "skillfish", "install", "--project", "--yes"] }]
            : []),
    ];
    let lastError: unknown;

    for (const candidate of commandCandidates) {
        try {
            await runCommand(candidate.command, candidate.args, workflowRoot, env);
            return;
        } catch (error) {
            if (!isSpawnNotFound(error)) {
                throw error;
            }

            lastError = error;
        }
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error(
        "Unable to run skillfish. Install `skillfish`, or make `npx` or `bunx` available on PATH.",
    );
};

const install = defineCommand({
    name: "install",
    aliases: ["i"],
    description: "Installs workflows into a target project",
    usage: "{i,install} <workflow>",
    args: [arg("workflow", { required: true })],
    async run({ args, context }) {
        try {
            const workflow = args.workflow;
            const manifest = await readJson<WorkflowManifest>(
                join(WORKFLOW_ASSETS_ROOT, "manifest.json"),
            );
            const bundledWorkflow = manifest.workflows.find(
                (candidate) => candidate.id === workflow,
            );

            if (!bundledWorkflow) {
                process.stderr.write(`Unknown workflow: ${workflow}\n`);
                return 1;
            }

            const bundledWorkflowRoot = join(WORKFLOW_ASSETS_ROOT, bundledWorkflow.path);
            const targetWorkflowRoot = join(context.cwd, ".mawm", "maws", workflow);

            await copyBundledWorkflow(bundledWorkflowRoot, targetWorkflowRoot);
            await installWorkflowSkills(targetWorkflowRoot, context.env);

            console.log(`Installed workflow \`${workflow}\` into .mawm/maws/${workflow}.`);
            return 0;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            return 1;
        }
    },
});

export default install;

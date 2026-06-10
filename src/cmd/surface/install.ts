import { stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { copyDirectoryContents, copyMissing, copyRecursive, exists } from "../../utils/fs.js";
import { initializeUserConfig, resolveUserConfigRoot } from "../../config/user-config.js";
import { refreshManifest } from "../../config/workflow/manifest.js";
import {
    readWorkflowMetadata,
    resolveWorkflowMetadata,
    writeWorkflowMetadata,
} from "../../config/workflow/metadata.js";
import { resolveWorkflowRoot } from "../../config/workflow/root.js";
import { assertValidWorkflowId } from "../../config/workflow/validator.js";
import { arg, defineCommand, option } from "../../utils/builders/command-builder.js";

const install = defineCommand({
    name: "install",
    aliases: ["i"],
    description: "Installs workflows globally or into a target project",
    usage: "{i,install} [-g] [workflow-or-path]",
    args: [arg("workflowOrPath", { type: "string" })] as const,
    options: [
        option("global", {
            alias: "g",
            type: "boolean",
        }),
    ] as const,
    async run({ args, context, options }) {
        try {
            if (options.global) {
                const sourceWorkflowPath = resolve(context.cwd, args.workflowOrPath ?? ".");
                const sourceWorkflowStat = await stat(sourceWorkflowPath);

                if (!sourceWorkflowStat.isFile() && !sourceWorkflowStat.isDirectory()) {
                    throw new Error(
                        `Path is not a file or directory: ${args.workflowOrPath ?? "."}`,
                    );
                }

                const sourceDistRoot = sourceWorkflowStat.isDirectory()
                    ? sourceWorkflowPath
                    : dirname(sourceWorkflowPath);
                const workflowRoot = await resolveWorkflowRoot(sourceDistRoot);

                const workflowMetadata = await resolveWorkflowMetadata(workflowRoot);
                assertValidWorkflowId(workflowMetadata.id);

                await initializeUserConfig(context.env);

                const configRoot = resolveUserConfigRoot(context.env);
                const targetWorkflowRoot = join(configRoot, workflowMetadata.id);
                const installArtifactsAtWorkflowRoot =
                    resolve(sourceDistRoot) === resolve(workflowRoot);
                const targetArtifactRoot = installArtifactsAtWorkflowRoot
                    ? targetWorkflowRoot
                    : join(targetWorkflowRoot, "dist");

                const sourceLanggraphConfigPath = join(workflowRoot, "langgraph.json");
                const targetLanggraphConfigPath = join(targetWorkflowRoot, "langgraph.json");

                if (resolve(sourceDistRoot) !== resolve(targetArtifactRoot)) {
                    if (installArtifactsAtWorkflowRoot) {
                        await copyDirectoryContents(sourceDistRoot, targetWorkflowRoot);
                    } else {
                        await copyRecursive(sourceDistRoot, targetArtifactRoot);
                    }
                }

                if (resolve(sourceLanggraphConfigPath) !== resolve(targetLanggraphConfigPath)) {
                    await copyRecursive(sourceLanggraphConfigPath, targetLanggraphConfigPath);
                }

                await writeWorkflowMetadata(targetWorkflowRoot, workflowMetadata);
                await refreshManifest(join(configRoot, "manifest.json"), workflowMetadata, {
                    absolutePath: sourceDistRoot,
                });

                process.stdout.write(
                    `Installed workflow \`${workflowMetadata.id}\` into ${targetWorkflowRoot}.\n`,
                );
                return 0;
            }

            if (!args.workflowOrPath) {
                throw new Error("Missing required argument: workflow");
            }

            const workflow = args.workflowOrPath;
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

            const targetGraphsRoot = join(context.cwd, ".mawm", "graphs");
            const targetWorkflowRoot = join(targetGraphsRoot, workflow);

            await copyMissing(sourceWorkflowRoot, targetWorkflowRoot);
            await writeWorkflowMetadata(targetWorkflowRoot, workflowMetadata);
            await refreshManifest(join(targetGraphsRoot, "manifest.json"), workflowMetadata);

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

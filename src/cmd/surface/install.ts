import { stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { copyDirectoryContents, copyRecursive } from "../../utils/fs.js";
import { initializeUserConfig, resolveUserConfigRoot } from "../../config/user-config.js";
import { refreshManifest } from "../../config/workflow/manifest.js";
import { resolveWorkflowMetadata, writeWorkflowMetadata } from "../../config/workflow/metadata.js";
import { resolveWorkflowRoot } from "../../config/workflow/root.js";
import { assertValidWorkflowId } from "../../config/workflow/validator.js";
import { arg, defineCommand } from "../../utils/builders/command-builder.js";

const install = defineCommand({
    name: "install",
    aliases: ["i"],
    description: "Installs workflows into global user config",
    usage: "{i,install} [workflow-or-path]",
    args: [arg("workflowOrPath", { type: "string" })] as const,
    async run({ args, context }) {
        try {
            const sourceWorkflowPath = resolve(context.cwd, args.workflowOrPath ?? ".");
            const sourceWorkflowStat = await stat(sourceWorkflowPath);

            if (!sourceWorkflowStat.isFile() && !sourceWorkflowStat.isDirectory()) {
                throw new Error(`Path is not a file or directory: ${args.workflowOrPath ?? "."}`);
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
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            return 1;
        }
    },
});

export default install;

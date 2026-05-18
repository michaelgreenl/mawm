import { rm } from "node:fs/promises";
import { join } from "node:path";
import { arg, defineCommand, option } from "../../types/builders/command-builder.js";
import { exists, writeJson } from "../../utils/fs.js";
import { resolveUserConfigRoot } from "../../utils/user-config.js";
import { readManifest } from "../../utils/workflow/manifest.js";
import { assertValidWorkflowId } from "../../utils/workflow/validator.js";

const removeManifestEntry = async (manifestPath: string, workflowId: string): Promise<boolean> => {
    const manifest = await readManifest(manifestPath);
    const nextManifest = manifest.filter((candidate) => candidate.id !== workflowId);

    if (nextManifest.length === manifest.length) {
        return false;
    }

    await writeJson(manifestPath, nextManifest);
    return true;
};

const removeInstalledWorkflow = async ({
    manifestPath,
    missingMessage,
    outputPath,
    workflowId,
    workflowRoot,
}: {
    manifestPath: string;
    missingMessage: string;
    outputPath: string;
    workflowId: string;
    workflowRoot: string;
}): Promise<void> => {
    assertValidWorkflowId(workflowId);

    const removedFromManifest = await removeManifestEntry(manifestPath, workflowId);
    const hasWorkflowRoot = await exists(workflowRoot);

    if (!hasWorkflowRoot && !removedFromManifest) {
        throw new Error(missingMessage);
    }

    await rm(workflowRoot, { force: true, recursive: true });
    process.stdout.write(`Removed workflow \`${workflowId}\` from ${outputPath}.\n`);
};

const remove = defineCommand({
    name: "remove",
    aliases: ["rm"],
    description: "Removes workflows from a project or from user config",
    usage: "{rm,remove} [-g] <workflow>",
    args: [
        arg("workflow", {
            required: true,
            type: "string",
        }),
    ] as const,
    options: [
        option("global", {
            alias: "g",
            type: "boolean",
        }),
    ] as const,
    async run({ args, context, options }) {
        try {
            if (options.global) {
                const configRoot = resolveUserConfigRoot(context.env);

                await removeInstalledWorkflow({
                    manifestPath: join(configRoot, "manifest.json"),
                    missingMessage: `Workflow \`${args.workflow}\` is not installed globally.`,
                    outputPath: join(configRoot, args.workflow),
                    workflowId: args.workflow,
                    workflowRoot: join(configRoot, args.workflow),
                });
                return 0;
            }

            const targetGraphsRoot = join(context.cwd, ".mawm", "graphs");

            await removeInstalledWorkflow({
                manifestPath: join(targetGraphsRoot, "manifest.json"),
                missingMessage: `Workflow \`${args.workflow}\` is not installed in this project.`,
                outputPath: `.mawm/graphs/${args.workflow}`,
                workflowId: args.workflow,
                workflowRoot: join(targetGraphsRoot, args.workflow),
            });
            return 0;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            return 1;
        }
    },
});

export default remove;

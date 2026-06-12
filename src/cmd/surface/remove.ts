import { rm } from "node:fs/promises";
import { join } from "node:path";
import { arg, defineCommand } from "../../utils/builders/command-builder.js";
import { exists, writeJson } from "../../utils/fs.js";
import { resolveUserConfigRoot } from "../../config/user-config.js";
import { readManifest } from "../../config/workflow/manifest.js";
import { assertValidWorkflowId } from "../../config/workflow/validator.js";

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
    description: "Removes workflows from global user config",
    usage: "{rm,remove} <workflow>",
    args: [
        arg("workflow", {
            required: true,
            type: "string",
        }),
    ] as const,
    async run({ args, context }) {
        try {
            const configRoot = resolveUserConfigRoot(context.env);

            await removeInstalledWorkflow({
                manifestPath: join(configRoot, "manifest.json"),
                missingMessage: `Workflow \`${args.workflow}\` is not installed globally.`,
                outputPath: join(configRoot, args.workflow),
                workflowId: args.workflow,
                workflowRoot: join(configRoot, args.workflow),
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

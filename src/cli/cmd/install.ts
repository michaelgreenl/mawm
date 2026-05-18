import { join } from "node:path";
import { copyMissing, exists } from "../../utils/fs.js";
import { resolveUserConfigRoot } from "../../utils/user-config.js";
import { refreshManifest } from "../../utils/workflow/manifest.js";
import { readWorkflowMetadata } from "../../utils/workflow/metadata.js";
import { arg, defineCommand } from "../../types/builders/command-builder.js";

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

            const targetGraphsRoot = join(context.cwd, ".mawm", "graphs");
            const targetWorkflowRoot = join(targetGraphsRoot, workflow);

            await copyMissing(sourceWorkflowRoot, targetWorkflowRoot);
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

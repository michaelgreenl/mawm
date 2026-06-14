import { join } from "node:path";
import { arg, defineCommand, option } from "../../utils/builders/command-builder.js";
import { resolveUserConfigRoot } from "../../config/user-config.js";
import { readManifest } from "../../config/workflow/manifest.js";
import { updateGlobalWorkflow } from "../../utils/update/global.js";
import { updateProjectPlanningAssets } from "../../utils/update/planning.js";
import { getManifestTargets, outputWorkflowError } from "../../utils/update/shared.js";

const UPDATE_USAGE = "{u,update} [workflow] | {u,update} -i";
const PLANNING_WORKFLOW_ERROR =
    "The -i option refreshes project .mawm assets and does not accept a workflow argument.";

const update = defineCommand({
    name: "update",
    aliases: ["u"],
    description: "Reinstalls global workflows or refreshes project .mawm assets",
    usage: UPDATE_USAGE,
    args: [arg("workflow", { type: "string" })] as const,
    options: [
        option("planning", {
            alias: "i",
            type: "boolean",
        }),
    ] as const,
    async run({ args, context, options }) {
        try {
            const workflowId = args.workflow;

            if (options.planning) {
                if (workflowId) {
                    throw new Error(PLANNING_WORKFLOW_ERROR);
                }

                const changed = await updateProjectPlanningAssets(context.cwd);
                process.stdout.write(
                    changed ? "Updated project MAWM assets in .mawm/.\n" : "No changes required.\n",
                );
                return 0;
            }

            const configRoot = resolveUserConfigRoot(context.env);
            const manifest = await readManifest(join(configRoot, "manifest.json"));
            const workflows = getManifestTargets(
                manifest,
                workflowId,
                `Workflow \`${workflowId}\` is not installed globally.`,
            );
            let hasErrors = false;

            for (const workflow of workflows) {
                try {
                    await updateGlobalWorkflow(workflow, context.env);
                } catch (error) {
                    hasErrors = true;
                    outputWorkflowError(workflow.id, error);
                }
            }

            return hasErrors ? 1 : 0;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            return 1;
        }
    },
});

export default update;

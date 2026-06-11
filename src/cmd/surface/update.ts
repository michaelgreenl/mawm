import { join } from "node:path";
import { arg, defineCommand, option } from "../../utils/builders/command-builder.js";
import { resolveUserConfigRoot } from "../../config/user-config.js";
import { readManifest } from "../../config/workflow/manifest.js";
import { updateGlobalWorkflow } from "../../utils/update/global.js";
import { updateProjectPlanningAssets } from "../../utils/update/planning.js";
import { updateProjectWorkflow } from "../../utils/update/project.js";
import { getManifestTargets, outputWorkflowError } from "../../utils/update/shared.js";

const UPDATE_USAGE = "{u,update} [-g] [workflow] | {u,update} -i";
const GLOBAL_PLANNING_ERROR =
    "The -i option refreshes project planning assets only and cannot be used with -g.";
const PLANNING_WORKFLOW_ERROR =
    "The -i option refreshes project planning assets and does not accept a workflow argument.";

const update = defineCommand({
    name: "update",
    aliases: ["u"],
    description: "Reinstalls workflows or refreshes project planning assets",
    usage: UPDATE_USAGE,
    args: [arg("workflow", { type: "string" })] as const,
    options: [
        option("global", {
            alias: "g",
            type: "boolean",
        }),
        option("planning", {
            alias: "i",
            type: "boolean",
        }),
    ] as const,
    async run({ args, context, options }) {
        try {
            const workflowId = args.workflow;

            if (options.planning) {
                if (options.global) {
                    throw new Error(GLOBAL_PLANNING_ERROR);
                }

                if (workflowId) {
                    throw new Error(PLANNING_WORKFLOW_ERROR);
                }

                const changed = await updateProjectPlanningAssets(context.cwd);
                process.stdout.write(
                    changed
                        ? "Updated project planning assets in .mawm/agents.\n"
                        : "No changes required.\n",
                );
                return 0;
            }

            if (options.global) {
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
            }

            const targetGraphsRoot = join(context.cwd, ".mawm", "graphs");
            const manifest = await readManifest(join(targetGraphsRoot, "manifest.json"));
            const workflows = getManifestTargets(
                manifest,
                workflowId,
                `Workflow \`${workflowId}\` is not installed in this project.`,
            );
            let hasErrors = false;

            for (const workflow of workflows) {
                try {
                    await updateProjectWorkflow(workflow.id, context.cwd, context.env);
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

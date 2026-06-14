import { join } from "node:path";
import { resolveUserConfigRoot } from "../../config/user-config.js";
import { readManifest } from "../../config/workflow/manifest.js";
import { defineCommand } from "../../utils/builders/command-builder.js";

const list = defineCommand({
    name: "list",
    description: "Lists workflows in global user config",
    usage: "list",
    async run({ context }) {
        try {
            const workflows = (
                await readManifest(join(resolveUserConfigRoot(context.env), "manifest.json"))
            )
                .slice()
                .sort((left, right) => left.id.localeCompare(right.id));

            if (workflows.length > 0) {
                process.stdout.write(
                    `${workflows
                        .map((workflow) => {
                            const parts = [
                                workflow.agents && workflow.agents.length > 0
                                    ? `agents: ${workflow.agents.join(", ")}`
                                    : undefined,
                                workflow.phases && workflow.phases.length > 0
                                    ? `phases: ${workflow.phases.join(", ")}`
                                    : undefined,
                            ].filter((part): part is string => typeof part === "string");

                            if (parts.length === 0) {
                                return workflow.id;
                            }

                            return `${workflow.id} (${parts.join("; ")})`;
                        })
                        .join("\n")}\n`,
                );
            }

            return 0;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            return 1;
        }
    },
});

export default list;

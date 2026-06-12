import { readdir } from "node:fs/promises";
import { resolveUserConfigRoot } from "../../config/user-config.js";
import { defineCommand } from "../../utils/builders/command-builder.js";

const list = defineCommand({
    name: "list",
    description: "Lists workflows in global user config",
    usage: "list",
    async run({ context }) {
        try {
            const workflowsRoot = resolveUserConfigRoot(context.env);
            const workflows = (await readdir(workflowsRoot, { withFileTypes: true }))
                .filter((entry) => entry.isDirectory())
                .map((entry) => entry.name)
                .sort((left, right) => left.localeCompare(right));

            if (workflows.length > 0) {
                process.stdout.write(`${workflows.join("\n")}\n`);
            }

            return 0;
        } catch (error) {
            if (error instanceof Error && "code" in error && error.code === "ENOENT") {
                return 0;
            }

            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            return 1;
        }
    },
});

export default list;

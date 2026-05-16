import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { defineCommand } from "../../types/commands.js";

const list = defineCommand({
    name: "list",
    description: "Lists installed workflows",
    usage: "list",
    async run({ context }) {
        try {
            const workflowsRoot = join(context.cwd, ".mawm", "maws");
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

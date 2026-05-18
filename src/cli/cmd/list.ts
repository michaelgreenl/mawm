import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { resolveUserConfigRoot } from "../../utils/user-config.js";
import { defineCommand, option } from "../../types/builders/command-builder.js";

const list = defineCommand({
    name: "list",
    description: "Lists installed workflows",
    usage: "list [-g]",
    options: [
        option("global", {
            alias: "g",
            type: "boolean",
        }),
    ] as const,
    async run({ context, options }) {
        try {
            const workflowsRoot = options.global
                ? resolveUserConfigRoot(context.env)
                : join(context.cwd, ".mawm", "graphs");
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

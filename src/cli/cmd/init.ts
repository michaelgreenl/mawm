import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyMissing } from "../../lib/core/fs.js";
import { initializeUserConfig } from "../../lib/core/user-config.js";
import { defineCommand, option } from "../../types/builders/command-builder.js";

const PROJECT_LOCAL_ASSETS_ROOT = fileURLToPath(
    new URL("../../assets/.mawm.project-local", import.meta.url),
);
const PROJECT_LOCAL_GRAPHS_ROOT = join(PROJECT_LOCAL_ASSETS_ROOT, "graphs");
const PROJECT_LOCAL_AGENTS_ROOT = join(PROJECT_LOCAL_ASSETS_ROOT, "agents");

const init = defineCommand({
    name: "init",
    description: "Initializing MAWM within a project",
    usage: "init [-i]",
    options: [
        option("includeAgents", {
            alias: "i",
            type: "boolean",
        }),
    ] as const,
    async run({ context, options }) {
        const mawmRoot = join(context.cwd, ".mawm");

        await copyMissing(PROJECT_LOCAL_GRAPHS_ROOT, join(mawmRoot, "graphs"));

        if (options.includeAgents) {
            await copyMissing(PROJECT_LOCAL_AGENTS_ROOT, join(mawmRoot, "agents"));
        }

        await initializeUserConfig(context.env);

        console.log("Initialized .mawm scaffold.");
        return 0;
    },
});

export default init;

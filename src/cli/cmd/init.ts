import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyMissing } from "../../utils/fs.js";
import { initializeUserConfig } from "../../utils/user-config.js";
import { defineCommand } from "../../types/builders/command-builder.js";

const PROJECT_LOCAL_ASSETS_ROOT = fileURLToPath(
    new URL("../../assets/.mawm.project-local", import.meta.url),
);

const init = defineCommand({
    name: "init",
    description: "Initializing MAWM within a project",
    usage: "init",
    async run({ context }) {
        const mawmRoot = join(context.cwd, ".mawm");

        await copyMissing(PROJECT_LOCAL_ASSETS_ROOT, mawmRoot);
        await initializeUserConfig(context.env);

        console.log("Initialized .mawm scaffold.");
        return 0;
    },
});

export default init;

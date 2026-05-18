import { stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { copyRecursive } from "../../utils/fs.js";
import { initializeUserConfig, resolveUserConfigRoot } from "../../utils/user-config.js";
import { refreshManifest } from "../../utils/workflow/manifest.js";
import { readWorkflowMetadata } from "../../utils/workflow/metadata.js";
import { resolveWorkflowRoot } from "../../utils/workflow/root.js";
import { assertValidWorkflowId } from "../../utils/workflow/validator.js";
import { arg, defineCommand } from "../../types/builders/command-builder.js";

const register = defineCommand({
    name: "register",
    description: "Registers a LangGraph workflow",
    usage: "register <path-to-langgraph-dist>",
    args: [arg("workflowPath", { required: true, type: "string" })] as const,
    async run({ args, context }) {
        try {
            const sourceWorkflowPath = resolve(context.cwd, args.workflowPath);
            const sourceWorkflowStat = await stat(sourceWorkflowPath);

            if (!sourceWorkflowStat.isFile() && !sourceWorkflowStat.isDirectory()) {
                throw new Error(`Path is not a file or directory: ${args.workflowPath}`);
            }

            const workflowRoot = await resolveWorkflowRoot(
                sourceWorkflowStat.isDirectory() ? sourceWorkflowPath : dirname(sourceWorkflowPath),
            );
            const workflowMetadata = await readWorkflowMetadata(workflowRoot);
            assertValidWorkflowId(workflowMetadata.id);
            await initializeUserConfig(context.env);
            const configRoot = resolveUserConfigRoot(context.env);
            const targetWorkflowRoot = join(configRoot, workflowMetadata.id);

            if (resolve(workflowRoot) !== resolve(targetWorkflowRoot)) {
                await copyRecursive(workflowRoot, targetWorkflowRoot);
            }

            await refreshManifest(join(configRoot, "manifest.json"), workflowMetadata);

            console.log(
                `Registered workflow \`${workflowMetadata.id}\` into ${targetWorkflowRoot}.`,
            );
            return 0;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
            return 1;
        }
    },
});

export default register;

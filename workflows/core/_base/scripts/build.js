import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildWorkflowBundle, getWorkflowBundlePaths } from "../../../../scripts/build/workflow-bundle.js";

const workflowRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

buildWorkflowBundle(getWorkflowBundlePaths(workflowRoot)).catch((error) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
});

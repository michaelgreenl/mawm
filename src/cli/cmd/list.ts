import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { defineCommand, option } from "../../types/commands.js";

const resolveHomeDirectory = (env: NodeJS.ProcessEnv): string => {
    const home = env["HOME"];

    if (home) {
        return home;
    }

    const userProfile = env["USERPROFILE"];

    if (userProfile) {
        return userProfile;
    }

    const homeDrive = env["HOMEDRIVE"];
    const homePath = env["HOMEPATH"];

    if (homeDrive && homePath) {
        return `${homeDrive}${homePath}`;
    }

    return homedir();
};

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
                ? join(resolveHomeDirectory(context.env), ".config", "graphs")
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

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { copyMissing, copyRecursive, exists } from "../../lib/core/fs.js";
import {
    initializeUserConfig,
    resolveHomeDirectory,
    resolveUserConfigRoot,
    scaffoldUserConfig,
} from "../../lib/core/user-config.js";
import { defineCommand, option } from "../../types/builders/command-builder.js";

const PROJECT_LOCAL_ASSETS_ROOT = fileURLToPath(
    new URL("../../assets/.mawm.project-local", import.meta.url),
);
const PROJECT_LOCAL_GRAPHS_ROOT = join(PROJECT_LOCAL_ASSETS_ROOT, "graphs");
const PROJECT_LOCAL_AGENTS_ROOT = join(PROJECT_LOCAL_ASSETS_ROOT, "agents");
const AGENT_ASSETS_ROOT = fileURLToPath(new URL("../../assets/.config/agents", import.meta.url));
const INIT_USAGE = "init [-g] [-i] [-a <agent>]";
const GLOBAL_INIT_INCLUDE_AGENTS_ERROR =
    "The -i option only initializes target-project initiative documents/workspace and cannot be used with -g.";

type ConfirmOverwrite = (targetPath: string) => Promise<boolean>;

const resolveAgentSourceRoot = async (agent: string): Promise<string> => {
    const sourceRoot = join(AGENT_ASSETS_ROOT, agent);

    if (!(await exists(sourceRoot))) {
        throw new Error(`Unknown agent: ${agent}`);
    }

    if ((await readdir(sourceRoot)).length === 0) {
        throw new Error(`Unknown agent: ${agent}`);
    }

    return sourceRoot;
};

const resolveAgentTargetRoot = (
    agent: string,
    cwd: string,
    env: NodeJS.ProcessEnv,
    global: boolean,
): string => {
    switch (agent) {
        case "opencode":
            return global
                ? join(resolveHomeDirectory(env), ".config", "opencode")
                : join(cwd, ".opencode");
        default:
            throw new Error(`Unknown agent: ${agent}`);
    }
};

const confirmOverwritePrompt: ConfirmOverwrite = async (targetPath) => {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });

    try {
        const answer = await prompt.question(
            `Overwrite existing agent assets at ${targetPath}? y/n: `,
        );
        return answer.trim().toLowerCase() === "y";
    } finally {
        prompt.close();
    }
};

export const createInitCommand = (confirmOverwrite: ConfirmOverwrite = confirmOverwritePrompt) =>
    defineCommand({
        name: "init",
        description: "Initializes MAWM in a project or user config",
        usage: INIT_USAGE,
        options: [
            option("global", {
                alias: "g",
                type: "boolean",
            }),
            option("includeAgents", {
                alias: "i",
                type: "boolean",
            }),
            option("agent", {
                alias: "a",
                type: "string",
            }),
        ] as const,
        async run({ context, options }) {
            if (options.global && options.includeAgents) {
                throw new Error(GLOBAL_INIT_INCLUDE_AGENTS_ERROR);
            }

            const globalConfigRoot = resolveUserConfigRoot(context.env);

            const agentSourceRoot = options.agent
                ? await resolveAgentSourceRoot(options.agent)
                : undefined;
            const agentTargetRoot = options.agent
                ? resolveAgentTargetRoot(options.agent, context.cwd, context.env, options.global)
                : undefined;

            if (options.global && (await exists(globalConfigRoot))) {
                throw new Error(
                    `Refusing to overwrite existing global config: ${globalConfigRoot}`,
                );
            }

            if (agentTargetRoot && (await exists(agentTargetRoot))) {
                const shouldOverwrite = await confirmOverwrite(agentTargetRoot);

                if (!shouldOverwrite) {
                    return 0;
                }
            }

            if (options.global) {
                await scaffoldUserConfig(context.env);
            } else {
                const mawmRoot = join(context.cwd, ".mawm");

                await copyMissing(PROJECT_LOCAL_GRAPHS_ROOT, join(mawmRoot, "graphs"));

                if (options.includeAgents) {
                    await copyMissing(PROJECT_LOCAL_AGENTS_ROOT, join(mawmRoot, "agents"));
                }

                await initializeUserConfig(context.env);
            }

            if (agentSourceRoot && agentTargetRoot) {
                if (await exists(agentTargetRoot)) {
                    await copyRecursive(agentSourceRoot, agentTargetRoot);
                } else {
                    await copyMissing(agentSourceRoot, agentTargetRoot);
                }
            }

            process.stdout.write(
                `${options.global ? `Initialized ${globalConfigRoot}` : "Initialized .mawm"} scaffold.\n`,
            );
            return 0;
        },
    });

const init = createInitCommand();

export default init;

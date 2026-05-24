import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { copyMissing, copyRecursive, exists } from "../../utils/fs.js";
import {
    initializeUserConfig,
    resolveHomeDirectory,
    resolveUserConfigRoot,
    scaffoldUserConfig,
} from "../../config/user-config.js";
import { defineCommand, option } from "../../utils/builders/command-builder.js";

const PROJECT_LOCAL_ASSETS_ROOT = fileURLToPath(
    new URL("../../assets/.mawm.project-local", import.meta.url),
);
const PROJECT_LOCAL_GRAPHS_ROOT = join(PROJECT_LOCAL_ASSETS_ROOT, "graphs");
const PROJECT_LOCAL_AGENTS_ROOT = join(PROJECT_LOCAL_ASSETS_ROOT, "agents");
const AGENT_ASSETS_ROOT = fileURLToPath(new URL("../../assets/.config/agents", import.meta.url));
const TEMPLATE_ASSETS_ROOT = fileURLToPath(
    new URL("../../../dist/assets/workflow-templates", import.meta.url),
);
const INIT_USAGE = "init [-g] [-i] [-a <agent>] [-t [type]]";
const GLOBAL_INIT_INCLUDE_AGENTS_ERROR =
    "The -i option only initializes target-project initiative documents/workspace and cannot be used with -g.";
const TEMPLATE_MODE_ERROR = "The -t option cannot be combined with -g, -i, or -a.";
const TEMPLATE_TYPES = ["base", "initiative"] as const;

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

const removeLegacyAgentAssets = async (agent: string, targetRoot: string): Promise<boolean> => {
    if (agent !== "opencode") {
        return false;
    }

    const path = join(targetRoot, "agents", "manager.md");

    if (!(await exists(path))) {
        return false;
    }

    await rm(path, { force: true });
    return true;
};

const hasExistingTargetAssets = async (
    sourcePath: string,
    targetPath: string,
): Promise<boolean> => {
    const sourceEntry = await stat(sourcePath);

    if (sourceEntry.isDirectory()) {
        for (const childName of await readdir(sourcePath)) {
            if (
                await hasExistingTargetAssets(
                    join(sourcePath, childName),
                    join(targetPath, childName),
                )
            ) {
                return true;
            }
        }

        return false;
    }

    return exists(targetPath);
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
            option("template", {
                alias: "t",
                omittedValue: "base",
                type: "string",
            }),
        ] as const,
        async run({ context, options }) {
            if (options.template !== undefined) {
                if (options.global || options.includeAgents || options.agent) {
                    throw new Error(TEMPLATE_MODE_ERROR);
                }

                if (options.template !== "base" && options.template !== "initiative") {
                    throw new Error(
                        `Unknown template type: ${options.template}. Expected one of: ${TEMPLATE_TYPES.join(
                            ", ",
                        )}.`,
                    );
                }

                if (
                    !(await copyMissing(join(TEMPLATE_ASSETS_ROOT, options.template), context.cwd))
                ) {
                    process.stdout.write("No changes required.\n");
                    return 0;
                }

                process.stdout.write(`Initialized ${options.template} template scaffold.\n`);
                return 0;
            }

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
            const hasExistingAgentAssets =
                agentSourceRoot && agentTargetRoot
                    ? await hasExistingTargetAssets(agentSourceRoot, agentTargetRoot)
                    : false;

            if (options.global && !agentSourceRoot && (await exists(globalConfigRoot))) {
                throw new Error(
                    `Refusing to overwrite existing global config: ${globalConfigRoot}`,
                );
            }

            if (agentTargetRoot && hasExistingAgentAssets) {
                const shouldOverwrite = await confirmOverwrite(agentTargetRoot);

                if (!shouldOverwrite) {
                    process.stdout.write(
                        "No changes made; existing agent assets were left in place.\n",
                    );
                    return 0;
                }
            }

            let graphs = false;
            let workspace = false;
            let config = false;
            let projectAssets = false;
            let globalAssets = false;

            if (options.global) {
                if (agentSourceRoot) {
                    config = await initializeUserConfig(context.env);
                } else {
                    config = await scaffoldUserConfig(context.env);
                }
            } else {
                const mawmRoot = join(context.cwd, ".mawm");

                graphs = await copyMissing(PROJECT_LOCAL_GRAPHS_ROOT, join(mawmRoot, "graphs"));

                if (options.includeAgents) {
                    workspace = await copyMissing(
                        PROJECT_LOCAL_AGENTS_ROOT,
                        join(mawmRoot, "agents"),
                    );
                }

                config = await initializeUserConfig(context.env);
            }

            if (agentSourceRoot && agentTargetRoot) {
                const removed = await removeLegacyAgentAssets(options.agent!, agentTargetRoot);
                const changed = (await exists(agentTargetRoot))
                    ? await copyRecursive(agentSourceRoot, agentTargetRoot)
                    : await copyMissing(agentSourceRoot, agentTargetRoot);

                if (options.global) {
                    globalAssets = removed || changed;
                } else {
                    projectAssets = removed || changed;
                }
            }

            const lines = [
                graphs ? "Initialized local MAWM graphs scaffold." : undefined,
                workspace ? "Initialized project initiative workspace." : undefined,
                config ? "Initialized global MAWM config." : undefined,
                projectAssets ? "Initialized project agent assets." : undefined,
                globalAssets ? "Initialized global agent assets." : undefined,
            ].filter((line): line is string => line !== undefined);

            process.stdout.write(
                lines.length === 0 ? "No changes required.\n" : `${lines.join("\n")}\n`,
            );
            return 0;
        },
    });

const init = createInitCommand();

export default init;

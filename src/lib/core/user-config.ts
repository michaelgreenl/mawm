import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyMissing, exists } from "./fs.js";

const USER_CONFIG_ASSETS_ROOT = fileURLToPath(
    new URL("../../assets/.config/mawm", import.meta.url),
);

/**
 * Resolve the current user's home directory from an environment object.
 *
 * @param env - Process-like environment object
 * @returns Resolved home directory path
 */
export const resolveHomeDirectory = (env: NodeJS.ProcessEnv): string => {
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

/** Resolve the MAWM user configuration root. */
export const resolveUserConfigRoot = (env: NodeJS.ProcessEnv): string => {
    return join(resolveHomeDirectory(env), ".config", "mawm");
};

/** Initialize the MAWM user configuration scaffold when it is missing. */
export const initializeUserConfig = async (env: NodeJS.ProcessEnv): Promise<void> => {
    const configRoot = resolveUserConfigRoot(env);

    if (await exists(configRoot)) {
        return;
    }

    await copyMissing(USER_CONFIG_ASSETS_ROOT, configRoot);
};

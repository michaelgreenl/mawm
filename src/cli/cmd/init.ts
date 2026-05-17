import { access, copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineCommand } from "../../types/commands.js";

const PROJECT_LOCAL_ASSETS_ROOT = fileURLToPath(
    new URL("../../assets/.mawm.project-local", import.meta.url),
);
const USER_CONFIG_ASSETS_ROOT = fileURLToPath(
    new URL("../../assets/.config/mawm", import.meta.url),
);

const exists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

const copyMissing = async (sourcePath: string, targetPath: string): Promise<void> => {
    const sourceEntry = await stat(sourcePath);

    if (sourceEntry.isDirectory()) {
        await mkdir(targetPath, { recursive: true });

        for (const childName of await readdir(sourcePath)) {
            await copyMissing(join(sourcePath, childName), join(targetPath, childName));
        }

        return;
    }

    if (await exists(targetPath)) {
        return;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
};

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

const initializeUserConfig = async (env: NodeJS.ProcessEnv): Promise<void> => {
    const configRoot = join(resolveHomeDirectory(env), ".config", ".mawm");

    if (await exists(configRoot)) {
        return;
    }

    await copyMissing(USER_CONFIG_ASSETS_ROOT, configRoot);
};

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

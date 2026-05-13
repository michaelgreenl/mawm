import { access, copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineCommand } from "../types/commands.js";

const CLI_ASSETS_ROOT = fileURLToPath(new URL("../../assets", import.meta.url));
const INITIATIVES_ASSETS_ROOT = join(CLI_ASSETS_ROOT, "state", "initiatives");
const OPENVIKING_ASSETS_ROOT = join(CLI_ASSETS_ROOT, "openviking");

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

const init = defineCommand({
    name: "init",
    description: "Initializing MAWM within a project",
    usage: "init",
    async run({ context }) {
        const mawmRoot = join(context.cwd, ".mawm");

        await mkdir(mawmRoot, { recursive: true });
        await mkdir(join(mawmRoot, "maws"), { recursive: true });
        await mkdir(join(mawmRoot, "openviking"), { recursive: true });

        await copyMissing(INITIATIVES_ASSETS_ROOT, join(mawmRoot, "initiatives"));
        await copyMissing(join(OPENVIKING_ASSETS_ROOT, "ov.conf"), join(mawmRoot, "ov.conf"));
        await copyMissing(join(OPENVIKING_ASSETS_ROOT, "ovcli.conf"), join(mawmRoot, "ovcli.conf"));

        console.log("Initialized .mawm scaffold.");
        return 0;
    },
});

export default init;

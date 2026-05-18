import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Check whether a path is accessible.
 *
 * @param path - Filesystem path to check
 * @returns True when the path exists and can be accessed
 */
export const exists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

/** Read a JSON file and parse it as the requested type. */
export const readJson = async <T>(path: string): Promise<T> => {
    return JSON.parse(await readFile(path, "utf8")) as T;
};

/** Write a value as formatted JSON, creating parent directories first. */
export const writeJson = async (path: string, value: unknown): Promise<void> => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

/**
 * Copy files recursively without overwriting existing targets.
 *
 * @param sourcePath - Source file or directory
 * @param targetPath - Target file or directory
 */
export const copyMissing = async (sourcePath: string, targetPath: string): Promise<void> => {
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

/**
 * Copy files recursively, overwriting existing files.
 *
 * @param sourcePath - Source file or directory
 * @param targetPath - Target file or directory
 */
export const copyRecursive = async (sourcePath: string, targetPath: string): Promise<void> => {
    const sourceEntry = await stat(sourcePath);

    if (sourceEntry.isDirectory()) {
        await mkdir(targetPath, { recursive: true });

        for (const childName of await readdir(sourcePath)) {
            await copyRecursive(join(sourcePath, childName), join(targetPath, childName));
        }

        return;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
};

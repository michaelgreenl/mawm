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
 * @returns True when the copy created a missing file or directory
 */
export const copyMissing = async (sourcePath: string, targetPath: string): Promise<boolean> => {
    const sourceEntry = await stat(sourcePath);

    if (sourceEntry.isDirectory()) {
        const missing = !(await exists(targetPath));
        await mkdir(targetPath, { recursive: true });
        let changed = missing;

        for (const childName of await readdir(sourcePath)) {
            changed =
                (await copyMissing(join(sourcePath, childName), join(targetPath, childName))) ||
                changed;
        }

        return changed;
    }

    if (await exists(targetPath)) {
        return false;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
    return true;
};

/**
 * Copy files recursively, overwriting existing files.
 *
 * @param sourcePath - Source file or directory
 * @param targetPath - Target file or directory
 * @returns True when the copy created or updated a file or directory
 */
export const copyRecursive = async (sourcePath: string, targetPath: string): Promise<boolean> => {
    const sourceEntry = await stat(sourcePath);

    if (sourceEntry.isDirectory()) {
        const missing = !(await exists(targetPath));
        await mkdir(targetPath, { recursive: true });
        let changed = missing;

        for (const childName of await readdir(sourcePath)) {
            changed =
                (await copyRecursive(join(sourcePath, childName), join(targetPath, childName))) ||
                changed;
        }

        return changed;
    }

    if (!(await exists(targetPath))) {
        await mkdir(dirname(targetPath), { recursive: true });
        await copyFile(sourcePath, targetPath);
        return true;
    }

    const [source, target] = await Promise.all([readFile(sourcePath), readFile(targetPath)]);

    if (source.equals(target)) {
        return false;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
    return true;
};

/** Copy the contents of a directory into a target directory. */
export const copyDirectoryContents = async (
    sourceDirectory: string,
    targetDirectory: string,
): Promise<void> => {
    await mkdir(targetDirectory, { recursive: true });

    for (const childName of await readdir(sourceDirectory)) {
        await copyRecursive(join(sourceDirectory, childName), join(targetDirectory, childName));
    }
};

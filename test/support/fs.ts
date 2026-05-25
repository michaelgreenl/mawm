import { access, readFile, writeFile } from "node:fs/promises";

/** Reads and parses a JSON file at the given path. */
export const readJson = async <T>(path: string): Promise<T> => {
    return JSON.parse(await readFile(path, "utf8")) as T;
};

/** Serializes a value as indented JSON and writes it to path. */
export const writeJson = async (path: string, value: unknown): Promise<void> => {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** Returns true when path exists and is accessible; false otherwise. */
export const pathExists = async (path: string): Promise<boolean> => {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
};

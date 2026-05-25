import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Tracks temp directories for a test file and removes them during cleanup. */
export const trackRoots = () => {
    const roots: string[] = [];

    return {
        async cleanup(): Promise<void> {
            await Promise.all(
                roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
            );
        },
        async dir(prefix: string): Promise<string> {
            const root = await mkdtemp(join(tmpdir(), prefix));
            roots.push(root);
            return root;
        },
    };
};

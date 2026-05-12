import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import init from "../dist/cmd/init.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const exampleRoot = join(repoRoot, "tests", "smoke", "example-target-project", ".mawm");

async function collectFiles(root: string): Promise<Map<string, string>> {
    const files = new Map<string, string>();

    async function walk(currentDir: string): Promise<void> {
        const entries = await readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const absolutePath = join(currentDir, entry.name);

            if (entry.isDirectory()) {
                await walk(absolutePath);
                continue;
            }

            files.set(relative(root, absolutePath), await readFile(absolutePath, "utf8"));
        }
    }

    await walk(root);

    return files;
}

async function withTempProject(run: (projectRoot: string) => Promise<void>): Promise<void> {
    const projectRoot = await mkdtemp(join(tmpdir(), "mawm-init-"));

    try {
        await run(projectRoot);
    } finally {
        await rm(projectRoot, { recursive: true, force: true });
    }
}

describe("init command", () => {
    it("creates the minimal non-workflow .mawm scaffold", async () => {
        await withTempProject(async (projectRoot) => {
            const exitCode = await init.run?.({
                context: {
                    cwd: projectRoot,
                    env: {},
                    rawArgs: [],
                },
            });

            assert.equal(exitCode, 0);
            assert.deepEqual(
                await collectFiles(join(projectRoot, ".mawm", "initiatives")),
                await collectFiles(join(exampleRoot, "initiatives")),
            );
            assert.equal(
                await readFile(join(projectRoot, ".mawm", "ov.conf"), "utf8"),
                await readFile(join(exampleRoot, "ov.conf"), "utf8"),
            );
            assert.equal(
                await readFile(join(projectRoot, ".mawm", "ovcli.conf"), "utf8"),
                await readFile(join(exampleRoot, "ovcli.conf"), "utf8"),
            );
            assert.deepEqual(await readdir(join(projectRoot, ".mawm", "maws")), []);
            assert.deepEqual(await readdir(join(projectRoot, ".mawm", "openviking")), []);
        });
    });

    it("preserves existing scaffold files and installed workflows on rerun", async () => {
        await withTempProject(async (projectRoot) => {
            await init.run?.({
                context: {
                    cwd: projectRoot,
                    env: {},
                    rawArgs: [],
                },
            });

            await writeFile(join(projectRoot, ".mawm", "ov.conf"), "custom ov config\n");
            await writeFile(join(projectRoot, ".mawm", "ovcli.conf"), "custom ov cli config\n");
            await writeFile(join(projectRoot, ".mawm", "initiatives", "roadmap.md"), "# Custom roadmap\n");
            await mkdir(join(projectRoot, ".mawm", "maws", "custom-workflow"), { recursive: true });
            await writeFile(
                join(projectRoot, ".mawm", "maws", "custom-workflow", "sentinel.txt"),
                "preserve me\n",
            );

            const exitCode = await init.run?.({
                context: {
                    cwd: projectRoot,
                    env: {},
                    rawArgs: [],
                },
            });

            assert.equal(exitCode, 0);
            assert.equal(await readFile(join(projectRoot, ".mawm", "ov.conf"), "utf8"), "custom ov config\n");
            assert.equal(
                await readFile(join(projectRoot, ".mawm", "ovcli.conf"), "utf8"),
                "custom ov cli config\n",
            );
            assert.equal(
                await readFile(join(projectRoot, ".mawm", "initiatives", "roadmap.md"), "utf8"),
                "# Custom roadmap\n",
            );
            assert.equal(
                await readFile(
                    join(projectRoot, ".mawm", "maws", "custom-workflow", "sentinel.txt"),
                    "utf8",
                ),
                "preserve me\n",
            );
        });
    });
});

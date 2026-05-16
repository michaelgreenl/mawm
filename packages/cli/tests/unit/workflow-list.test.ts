import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import list from "../../dist/cmd/workflow/list.js";

async function withTempProject(run: (projectRoot: string) => Promise<void>): Promise<void> {
    const projectRoot = await mkdtemp(join(tmpdir(), "mawm-workflow-list-"));

    try {
        await run(projectRoot);
    } finally {
        await rm(projectRoot, { recursive: true, force: true });
    }
}

async function captureStdout(
    run: () => Promise<number>,
): Promise<{ exitCode: number; output: string }> {
    const chunks: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);

    process.stdout.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));

        const callback = args.at(-1);

        if (typeof callback === "function") {
            callback();
        }

        return true;
    }) as typeof process.stdout.write;

    try {
        const exitCode = await run();

        return {
            exitCode,
            output: chunks.join(""),
        };
    } finally {
        process.stdout.write = originalWrite;
    }
}

describe("list command", () => {
    it("prints installed workflow ids in sorted order", async () => {
        await withTempProject(async (projectRoot) => {
            await mkdir(join(projectRoot, ".mawm", "maws", "zeta"), { recursive: true });
            await mkdir(join(projectRoot, ".mawm", "maws", "alpha"), { recursive: true });
            await writeFile(join(projectRoot, ".mawm", "maws", "README.md"), "ignore me\n");

            const { exitCode, output } = await captureStdout(async () => {
                return list.run({
                    context: {
                        cwd: projectRoot,
                        env: {},
                        rawArgs: [],
                    },
                });
            });

            assert.equal(exitCode, 0);
            assert.equal(output, "alpha\nzeta\n");
        });
    });

    it("returns an empty list when no workflows are installed", async () => {
        await withTempProject(async (projectRoot) => {
            const { exitCode, output } = await captureStdout(async () => {
                return list.run({
                    context: {
                        cwd: projectRoot,
                        env: {},
                        rawArgs: [],
                    },
                });
            });

            assert.equal(exitCode, 0);
            assert.equal(output, "");
        });
    });
});

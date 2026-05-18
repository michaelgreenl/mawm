import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import list from "../../src/cli/cmd/list.js";

const tempRoots: string[] = [];

const captureStdout = async (run: () => Promise<number>) => {
    let output = "";
    const originalWrite = process.stdout.write;

    process.stdout.write = ((chunk: string | Uint8Array) => {
        output += chunk.toString();
        return true;
    }) as typeof process.stdout.write;

    try {
        const exitCode = await run();
        return { exitCode, output };
    } finally {
        process.stdout.write = originalWrite;
    }
};

describe("list command", () => {
    afterEach(async () => {
        await Promise.all(
            tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
        );
    });

    test("lists global workflows from the user config root", async () => {
        const home = await mkdtemp(join(tmpdir(), "mawm-home-"));
        tempRoots.push(home);
        await mkdir(join(home, ".config", "mawm", "alpha"), { recursive: true });
        await mkdir(join(home, ".config", "mawm", "beta"), { recursive: true });

        const result = await captureStdout(
            () =>
                list.run?.({
                    args: {},
                    context: { cwd: home, env: { HOME: home }, rawArgs: ["list", "-g"] },
                    options: { global: true },
                }) ?? Promise.resolve(1),
        );

        expect(result).toEqual({ exitCode: 0, output: "alpha\nbeta\n" });
    });
});

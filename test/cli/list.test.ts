import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import list from "../../src/cmd/surface/list.js";
import { captureOutput } from "../support/capture.js";

const tempRoots: string[] = [];

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

        const result = await captureOutput(
            () =>
                list.run?.({
                    args: {},
                    context: { cwd: home, env: { HOME: home }, rawArgs: ["list", "-g"] },
                    options: { global: true },
                }) ?? Promise.resolve(1),
        );

        expect(result).toEqual({ exitCode: 0, stderr: "", stdout: "alpha\nbeta\n" });
    });
});

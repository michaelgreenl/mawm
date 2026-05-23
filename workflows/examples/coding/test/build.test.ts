import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

describe("workflow build", () => {
    test("writes runtime state ignores into the generated gitignore", async () => {
        const result = Bun.spawnSync(["bun", "scripts/build.js"], {
            cwd: root,
            stderr: "pipe",
            stdout: "pipe",
        });

        expect(result.exitCode).toBe(0);

        const gitignore = await readFile(join(root, "dist", ".gitignore"), "utf8");

        expect(gitignore).toContain(".langgraph-dev.json");
        expect(gitignore).toContain(".langgraph-dev.log");
    });
});

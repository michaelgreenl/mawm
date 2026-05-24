import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

describe("workflow build", () => {
    test("does not keep a separate dist langgraph config", () => {
        expect(existsSync(join(root, "langgraph.dist.json"))).toBe(false);
    });

    test("derives the dist langgraph config and writes runtime state ignores", async () => {
        const result = Bun.spawnSync(["bun", "scripts/build.js"], {
            cwd: root,
            stderr: "pipe",
            stdout: "pipe",
        });

        expect(result.exitCode).toBe(0);

        const sourceLanggraph = JSON.parse(await readFile(join(root, "langgraph.json"), "utf8")) as {
            env?: string;
            graphs: Record<string, string>;
            node_version: string;
        };
        const distLanggraph = JSON.parse(
            await readFile(join(root, "dist", "langgraph.json"), "utf8"),
        ) as {
            env?: string;
            graphs: Record<string, string>;
            node_version: string;
        };
        const gitignore = await readFile(join(root, "dist", ".gitignore"), "utf8");

        expect(distLanggraph).toEqual({
            ...sourceLanggraph,
            graphs: {
                ...sourceLanggraph.graphs,
                agent: "./graph.js:graph",
            },
        });
        expect(gitignore).toContain(".langgraph-dev.json");
        expect(gitignore).toContain(".langgraph-dev.log");
    });
});

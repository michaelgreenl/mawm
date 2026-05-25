import { afterAll, describe, expect, test } from "vitest";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGraph } from "../../src/assets/workflow-templates/base/src/graph/index.ts";
import { spawnSync } from "../support/process.js";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const templates = join(root, "src", "assets", "workflow-templates");
const shared = join(templates, "shared");
const base = join(templates, "base");
const workspaces: string[] = [];

const createWorkspace = async () => {
    const dir = await mkdtemp(join(tmpdir(), "mawm-base-template-"));
    workspaces.push(dir);
    await cp(shared, dir, { recursive: true });
    await cp(base, dir, { recursive: true });
    return dir;
};

afterAll(async () => {
    await Promise.all(workspaces.map(async (dir) => rm(dir, { recursive: true, force: true })));
});

describe("base template assets", () => {
    test("matches the standalone metadata contract", async () => {
        const meta = JSON.parse(await readFile(join(base, "mawm.json"), "utf8")) as {
            displayName: string;
            executionContract: {
                optionalContext: string[];
                optionalInput: string[];
                requiredContext: string[];
                requiredInput: string[];
                supportsResume: boolean;
            };
            id: string;
            kind: string;
        };

        expect(meta.id).toBe("base-template");
        expect(meta.displayName).toBe("Base Template");
        expect(meta.kind).toBe("standalone");
        expect(meta.executionContract).toEqual({
            optionalContext: [],
            optionalInput: [],
            requiredContext: [],
            requiredInput: [],
            supportsResume: false,
        });
    });

    test("declares the base-owned overlay paths", async () => {
        const overlay = JSON.parse(await readFile(join(base, "overlay.json"), "utf8")) as {
            variant: string;
            variantOwnedPaths: string[];
        };

        expect(overlay.variant).toBe("base");
        expect(overlay.variantOwnedPaths).toEqual([
            "overlay.json",
            "mawm.json",
            join("src", "graph", "index.ts"),
            join("test", "workflow.test.ts"),
        ]);
    });

    test("returns a standalone summary from the base graph", async () => {
        const result = await createGraph().invoke(
            {},
            {
                configurable: {
                    thread_id: "base-template-source-test",
                },
            },
        );

        expect(result).toEqual({
            summary: "Standalone workflow completed.",
        });
    });

    test("materializes a temp workspace that installs, builds, typechecks, tests, and loads the standalone graph", async () => {
        const dir = await createWorkspace();

        const install = spawnSync(["bun", "install"], { cwd: dir });
        expect(install.exitCode).toBe(0);

        const typecheck = spawnSync(["bun", "run", "typecheck"], { cwd: dir });
        expect(typecheck.exitCode).toBe(0);

        const build = spawnSync(["bun", "run", "build"], { cwd: dir });
        expect(build.exitCode).toBe(0);

        const tests = spawnSync(["bun", "test"], { cwd: dir });
        expect(tests.exitCode).toBe(0);

        const meta = JSON.parse(await readFile(join(dir, "dist", "mawm.json"), "utf8")) as {
            kind: string;
        };
        const langgraph = JSON.parse(
            await readFile(join(dir, "dist", "langgraph.json"), "utf8"),
        ) as {
            graphs: Record<string, string>;
        };
        const module = (await import(pathToFileURL(join(dir, "dist", "graph.js")).href)) as {
            graph: {
                invoke(values: unknown): Promise<unknown>;
            };
        };

        expect(meta.kind).toBe("standalone");
        expect(langgraph.graphs.agent).toBe("./graph.js:graph");
        expect(
            await module.graph.invoke(
                {},
                {
                    configurable: {
                        thread_id: "base-template-dist-test",
                    },
                },
            ),
        ).toEqual({
            summary: "Standalone workflow completed.",
        });
    });
});

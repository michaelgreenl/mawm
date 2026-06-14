import { afterAll, describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createGraph } from "../../src/assets/workflow-templates/base/src/graph/index.ts";
import { spawnSync } from "../support/process.js";
import { templateDir, trackTemplateWorkspaces } from "../support/template.js";

const base = templateDir("base");
const workspaces = trackTemplateWorkspaces();

afterAll(async () => {
    await workspaces.cleanup();
});

describe("base template assets", () => {
    test("matches the standalone metadata contract", async () => {
        const meta = JSON.parse(await readFile(join(base, "mawm.json"), "utf8")) as {
            agents?: string[];
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
        expect(meta.agents).toEqual(["agent"]);
        expect(meta.executionContract).toEqual({
            optionalContext: [],
            optionalInput: [],
            requiredContext: [],
            requiredInput: [],
            supportsResume: false,
        });
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
        const dir = await workspaces.create("base");
        const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8")) as {
            devDependencies?: {
                vitest?: string;
            };
            scripts?: {
                test?: string;
            };
        };

        expect(pkg.scripts?.test).toBe("vitest run");
        expect(pkg.devDependencies?.vitest).toBeDefined();

        const install = spawnSync(["bun", "install"], { cwd: dir });
        expect(install.exitCode).toBe(0);

        const typecheck = spawnSync(["bun", "run", "typecheck"], { cwd: dir });
        expect(typecheck.exitCode).toBe(0);

        const build = spawnSync(["bun", "run", "build"], { cwd: dir });
        expect(build.exitCode).toBe(0);

        const tests = spawnSync(["bun", "run", "test"], { cwd: dir });
        expect(tests.exitCode).toBe(0);

        const meta = JSON.parse(await readFile(join(dir, "dist", "mawm.json"), "utf8")) as {
            agents?: string[];
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
        expect(meta.agents).toEqual(["agent"]);
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

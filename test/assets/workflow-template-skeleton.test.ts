import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..", "src", "assets", "workflow-templates");
const shared = join(root, "shared");
const base = join(root, "base");
const initiative = join(root, "initiative");

const required = [
    "package.json",
    "langgraph.json",
    join("scripts", "build.js"),
    join("src", "graph", "index.ts"),
    "test",
] as const;

const banned = [
    "@opencode-ai/sdk",
    "initiativeSpecPath",
    "opencode",
    "OpenCode",
    "runSpecPath",
    "selectedRunLabel",
] as const;

const files = (dir: string): string[] => {
    const entries = readdirSync(dir, { withFileTypes: true });

    return entries.flatMap((entry) => {
        const path = join(dir, entry.name);

        if (entry.isDirectory()) {
            return files(path);
        }

        return [path];
    });
};

describe("workflow template skeleton assets", () => {
    test("creates the canonical source directories", () => {
        expect(existsSync(root)).toBe(true);
        expect(existsSync(shared)).toBe(true);
        expect(existsSync(base)).toBe(true);
        expect(existsSync(initiative)).toBe(true);
    });

    test("provides the required shared skeleton paths", () => {
        for (const path of required) {
            expect(existsSync(join(shared, path))).toBe(true);
        }
    });

    test("keeps mawm.json variant-owned", () => {
        expect(existsSync(join(shared, "mawm.json"))).toBe(false);
    });

    test("does not keep a separate dist langgraph config in the shared skeleton", () => {
        expect(existsSync(join(shared, "langgraph.dist.json"))).toBe(false);
    });

    test("keeps the shared typecheck script scoped to source files", () => {
        const pkg = JSON.parse(readFileSync(join(shared, "package.json"), "utf8")) as {
            scripts?: {
                typecheck?: string;
            };
        };

        expect(pkg.scripts?.typecheck).toContain("src/graph/index.ts");
        expect(pkg.scripts?.typecheck).not.toBe("tsc --noEmit");
    });

    test("declares variant ownership in overlay markers", () => {
        const baseOverlay = JSON.parse(readFileSync(join(base, "overlay.json"), "utf8")) as {
            variant: string;
            variantOwnedPaths: string[];
        };
        const initiativeOverlay = JSON.parse(
            readFileSync(join(initiative, "overlay.json"), "utf8"),
        ) as { variant: string; variantOwnedPaths: string[] };

        expect(baseOverlay.variant).toBe("base");
        expect(baseOverlay.variantOwnedPaths).toContain("overlay.json");
        expect(baseOverlay.variantOwnedPaths).toContain("mawm.json");
        expect(baseOverlay.variantOwnedPaths).toContain(join("src", "graph", "index.ts"));
        expect(baseOverlay.variantOwnedPaths).toContain(join("test", "workflow.test.ts"));

        expect(initiativeOverlay.variant).toBe("initiative");
        expect(initiativeOverlay.variantOwnedPaths).toContain("overlay.json");
        expect(initiativeOverlay.variantOwnedPaths).toContain("mawm.json");
        expect(initiativeOverlay.variantOwnedPaths).toContain(join("src", "graph", "index.ts"));
        expect(initiativeOverlay.variantOwnedPaths).toContain(join("src", "graph", "state.ts"));
        expect(initiativeOverlay.variantOwnedPaths).toContain(join("src", "graph", "gates.ts"));
        expect(initiativeOverlay.variantOwnedPaths).toContain(join("src", "graph", "planning.ts"));
        expect(initiativeOverlay.variantOwnedPaths).toContain(
            join("src", "graph", "implementing.ts"),
        );
        expect(initiativeOverlay.variantOwnedPaths).toContain(join("test", "graph.test.ts"));
        expect(initiativeOverlay.variantOwnedPaths).toContain(join("test", "gates.test.ts"));
        expect(initiativeOverlay.variantOwnedPaths).toContain(join("test", "workflow.test.ts"));
    });

    test("keeps the shared layer neutral", () => {
        const paths = [
            ...required.filter((path) => path !== "test").map((path) => join(shared, path)),
            ...files(join(shared, "test")),
        ];

        for (const path of paths) {
            const text = readFileSync(path, "utf8");

            for (const value of banned) {
                expect(text).not.toContain(value);
            }
        }
    });
});

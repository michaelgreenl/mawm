import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { readManifest, refreshManifest } from "../../src/config/workflow/manifest.js";
import { normalizeWorkflowMetadata } from "../../src/config/workflow/metadata.js";
import { writeJson } from "../support/fs.js";
import { trackRoots } from "../support/tmp.js";
import { manifestEntry, metadata } from "../support/workflow.js";

const roots = trackRoots();

describe("workflow metadata", () => {
    afterEach(async () => {
        await roots.cleanup();
    });

    test("normalizes valid workflow topology", () => {
        expect(
            normalizeWorkflowMetadata(
                metadata({
                    agents: ["agent", "reviewer"],
                    id: "demo-workflow",
                    phases: ["planning", "implementing"],
                }),
            ),
        ).toEqual(
            metadata({
                agents: ["agent", "reviewer"],
                id: "demo-workflow",
                phases: ["planning", "implementing"],
            }),
        );
    });

    test.each([
        {
            label: "rejects duplicate agents",
            value: {
                ...metadata({ id: "demo-workflow" }),
                agents: ["agent", "agent"],
            },
        },
        {
            label: "rejects empty phase ids",
            value: {
                ...metadata({ id: "demo-workflow" }),
                phases: [""],
            },
        },
        {
            label: "rejects non-kebab topology ids",
            value: {
                ...metadata({ id: "demo-workflow" }),
                agents: ["review_agent"],
            },
        },
    ])("$label", ({ value }) => {
        expect(normalizeWorkflowMetadata(value)).toBeUndefined();
    });

    test("keeps legacy metadata valid when topology is absent", () => {
        const value = normalizeWorkflowMetadata(metadata({ id: "legacy-workflow" }));

        expect(value).toEqual(metadata({ id: "legacy-workflow" }));
        expect(value).not.toHaveProperty("agents");
        expect(value).not.toHaveProperty("phases");
    });

    test("rejects manifest entries with invalid topology", async () => {
        const root = await roots.dir("mawm-config-");
        const path = join(root, "manifest.json");

        await writeJson(path, [
            {
                ...manifestEntry({ id: "demo-workflow" }),
                agents: ["review_agent"],
            },
        ]);

        await expect(readManifest(path)).rejects.toThrow(`Invalid workflow manifest: ${path}`);
    });

    test("round-trips topology through manifest refresh", async () => {
        const root = await roots.dir("mawm-config-");
        const path = join(root, "manifest.json");

        await refreshManifest(
            path,
            metadata({
                agents: ["agent", "reviewer"],
                id: "demo-workflow",
                phases: ["planning", "implementing"],
            }),
            { absolutePath: "/tmp/demo-workflow/dist" },
        );

        expect(await readManifest(path)).toEqual([
            manifestEntry({
                absolutePath: "/tmp/demo-workflow/dist",
                agents: ["agent", "reviewer"],
                id: "demo-workflow",
                phases: ["planning", "implementing"],
            }),
        ]);
    });
});

import { describe, expect, test } from "vitest";
import { createGraph, graph } from "../src/graph/index.ts";

describe("base template workflow", () => {
    test("returns a standalone summary", async () => {
        expect(graph).toBeDefined();
        expect(
            await createGraph().invoke(
                {},
                {
                    configurable: {
                        thread_id: "base-template-workflow-test",
                    },
                },
            ),
        ).toEqual({
            summary: "Standalone workflow completed.",
        });
    });
});

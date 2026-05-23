import { describe, expect, test } from "bun:test";

describe("workflow graph", () => {
    test("loads the top-level graph module", async () => {
        await expect(import("../src/graph/index.ts")).resolves.toHaveProperty("graph");
    });
});

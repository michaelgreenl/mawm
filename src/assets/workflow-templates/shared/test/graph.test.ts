import { describe, expect, test } from "bun:test";
import { createGraph, graph } from "../src/graph/index.ts";

describe("graph skeleton", () => {
    test("creates a graph instance", () => {
        expect(createGraph()).toBeDefined();
        expect(graph).toBeDefined();
    });
});

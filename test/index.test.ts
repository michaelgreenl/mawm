import { expect, test } from "bun:test";

import { runCli } from "../src/index.js";

test("runCli returns success when invoked without arguments", async () => {
    await expect(runCli([])).resolves.toBe(0);
});

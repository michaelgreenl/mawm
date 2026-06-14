import Ajv2020 from "ajv/dist/2020.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { readJson } from "../support/fs.js";

const repoRoot = dirname(fileURLToPath(new URL("../../package.json", import.meta.url)));
const configRoot = join(repoRoot, "src", "assets", ".mawm.project-local");

const validate = async (value: unknown): Promise<boolean> => {
    const schema = await readJson<object>(join(configRoot, "mawm.schema.json"));
    const ajv = new Ajv2020({ allErrors: true, strict: false });

    return ajv.compile(schema)(value) === true;
};

describe("project-local config schema", () => {
    test("accepts the scaffolded config and supported context shapes", async () => {
        expect(await validate(await readJson(join(configRoot, "mawm.json")))).toBe(true);
        expect(
            await validate({
                $schema: "./mawm.schema.json",
                context: {
                    global: ["docs/global.md"],
                    phases: {
                        planning: ["docs/phases/planning.md"],
                    },
                    workflows: {
                        coding: {
                            agent: {
                                agent: ["docs/workflows/coding/agent.md"],
                            },
                            global: ["docs/workflows/coding/global.md"],
                            phases: {
                                implementing: ["docs/workflows/coding/implementing.md"],
                            },
                        },
                    },
                },
            }),
        ).toBe(true);
    });

    test("rejects malformed context leaves", async () => {
        expect(
            await validate({
                $schema: "./mawm.schema.json",
                context: {
                    workflows: {
                        coding: {
                            agent: {
                                review_agent: ["docs/workflows/coding/review.md"],
                            },
                        },
                    },
                },
            }),
        ).toBe(false);
    });
});

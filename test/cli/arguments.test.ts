import { describe, expect, test } from "bun:test";
import { parseCommandInputs } from "../../src/cli/parsers/arguments.js";
import { arg, option } from "../../src/types/builders/command-builder.js";

describe("parseCommandInputs", () => {
    test("parses positional arguments and option aliases", () => {
        const argDefs = [arg("workflow", { required: true, type: "string" })] as const;
        const optionDefs = [
            option("global", { alias: "g", type: "boolean" }),
            option("limit", { defaultValue: 10, type: "number" }),
        ] as const;

        expect(parseCommandInputs(argDefs, optionDefs, ["-g", "--limit=3", "base"])).toEqual({
            args: { workflow: "base" },
            options: { global: true, limit: 3 },
        });
    });

    test("stops option parsing after separator", () => {
        const argDefs = [
            arg("values", { required: true, type: "string", variadic: true }),
        ] as const;
        const optionDefs = [option("global", { alias: "g", type: "boolean" })] as const;

        expect(parseCommandInputs(argDefs, optionDefs, ["--", "--literal"])).toEqual({
            args: { values: ["--literal"] },
            options: { global: false },
        });
    });
});

import { describe, expect, test } from "bun:test";
import { parseCommandInputs } from "../../src/utils/parsers/arguments.js";
import { arg, option } from "../../src/utils/builders/command-builder.js";

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

    test("parses grouped short options when the last option expects a value", () => {
        const optionDefs = [
            option("includeAgents", { alias: "i", type: "boolean" }),
            option("agent", { alias: "a", type: "string" }),
        ] as const;

        expect(parseCommandInputs(undefined, optionDefs, ["-ia", "opencode"])).toEqual({
            args: {},
            options: { agent: "opencode", includeAgents: true },
        });
    });

    test("uses the omitted option value when -t is present without an explicit type", () => {
        const optionDefs = [
            option("template", { alias: "t", omittedValue: "base", type: "string" }),
        ] as const;

        expect(parseCommandInputs(undefined, optionDefs, ["-t"])).toEqual({
            args: {},
            options: { template: "base" },
        });
    });

    test("parses an explicit template type when -t is followed by a value", () => {
        const optionDefs = [
            option("template", { alias: "t", omittedValue: "base", type: "string" }),
        ] as const;

        expect(parseCommandInputs(undefined, optionDefs, ["-t", "initiative"])).toEqual({
            args: {},
            options: { template: "initiative" },
        });
    });

    test("parses grouped short options when an omitted-value option appears last", () => {
        const optionDefs = [
            option("global", { alias: "g", type: "boolean" }),
            option("template", { alias: "t", omittedValue: "base", type: "string" }),
        ] as const;

        expect(parseCommandInputs(undefined, optionDefs, ["-gt"])).toEqual({
            args: {},
            options: { global: true, template: "base" },
        });
    });
});

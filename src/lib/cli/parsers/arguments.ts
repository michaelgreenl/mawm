import { coerceValue } from "../coerce-value.js";
import type { ParsedCommandInputs } from "../../../types/parse-result.d.js";
import type { InferArgs } from "../../../types/inference.d.js";
import type { AnyArgDef, AnyOptionDef } from "../../../types/value.d.js";
import { parseOptions } from "./options.js";

const parsePositionalArgs = <const TArgs extends readonly AnyArgDef[]>(
    defs: TArgs | undefined,
    tokens: readonly string[],
): InferArgs<TArgs> => {
    const result: Record<string, unknown> = {};

    if (!defs || defs.length === 0) {
        return result as InferArgs<TArgs>;
    }

    let index = 0;

    for (const def of defs) {
        const type = def.type ?? "string";

        if (def.variadic) {
            result[def.name] = tokens.slice(index).map((token) => coerceValue(type, token));
            index = tokens.length;
            continue;
        }

        const token = tokens[index];

        if (token !== undefined) {
            result[def.name] = coerceValue(type, token);
            index += 1;
            continue;
        }

        if (def.defaultValue !== undefined) {
            result[def.name] = def.defaultValue;
            continue;
        }

        if (def.required) {
            throw new Error(`Missing required argument: ${def.name}`);
        }

        result[def.name] = undefined;
    }

    return result as InferArgs<TArgs>;
};

/**
 * Parse all command inputs from raw tokens.
 *
 * @param argDefs - Positional argument definitions
 * @param optionDefs - Named option definitions
 * @param tokens - Raw command-line tokens after the command name
 * @returns Parsed arguments and options for a command handler
 */
export function parseCommandInputs<
    const TArgs extends readonly AnyArgDef[],
    const TOptions extends readonly AnyOptionDef[],
>(
    argDefs: TArgs | undefined,
    optionDefs: TOptions | undefined,
    tokens: readonly string[],
): ParsedCommandInputs<TArgs, TOptions> {
    const { positionalTokens, options } = parseOptions(optionDefs, tokens);

    return {
        args: parsePositionalArgs(argDefs, positionalTokens),
        options,
    };
}

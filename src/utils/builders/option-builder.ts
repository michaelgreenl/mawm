import type { CoercedValue, ParsedOptions } from "../parsers/types.d.js";
import type { AnyOptionDef } from "../types/value.d.js";

/**
 * Apply defaults and required checks to parsed option values.
 *
 * @param defs - Option definitions accepted by the command
 * @param optionValues - Parsed option values supplied by the user
 * @returns Complete option object for the command handler
 */
export function buildOptions<const TOptions extends readonly AnyOptionDef[]>(
    defs: TOptions,
    optionValues: Map<string, CoercedValue>,
): ParsedOptions<TOptions>["options"] {
    const options: Record<string, unknown> = {};

    for (const option of defs) {
        const type = option.type ?? "boolean";
        options[option.name] = optionValues.has(option.name)
            ? optionValues.get(option.name)
            : (option.defaultValue ?? (type === "boolean" ? false : undefined));

        if (option.required && options[option.name] === undefined) {
            throw new Error(`Missing required option: --${option.name}`);
        }
    }

    return options as ParsedOptions<TOptions>["options"];
}

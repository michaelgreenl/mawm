import { coerceValue } from "../coerce-value.js";
import type { CoercedValue } from "./types.d.js";
import type { AnyOptionDef } from "../types/value.d.js";

/** Parsed option values keyed by option name. */
export type OptionValueMap = Map<string, CoercedValue>;

/**
 * Assign a parsed option value and return the next token index.
 *
 * @param option - Option definition being parsed
 * @param optionLabel - Original option label used in errors
 * @param inlineValue - Optional inline value after equals
 * @param tokens - Raw command-line tokens
 * @param index - Current token index
 * @param optionValues - Mutable parsed option value map
 * @returns Index consumed by this option
 */
export const assignOptionValue = (
    option: AnyOptionDef,
    optionLabel: string,
    inlineValue: string | undefined,
    tokens: readonly string[],
    index: number,
    optionValues: OptionValueMap,
): number => {
    const type = option.type ?? "boolean";

    if (type === "boolean") {
        optionValues.set(
            option.name,
            inlineValue === undefined ? true : coerceValue(type, inlineValue),
        );
        return index;
    }

    const valueToken = inlineValue ?? tokens[index + 1];

    if (valueToken === undefined) {
        throw new Error(`Missing value for option: ${optionLabel}`);
    }

    optionValues.set(option.name, coerceValue(type, valueToken));
    return inlineValue === undefined ? index + 1 : index;
};

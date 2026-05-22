import { buildOptions } from "../builders/option-builder.js";
import type { ParsedOptions } from "./types.d.js";
import type { AnyOptionDef } from "../types/value.d.js";
import { splitOptionToken } from "./option-token.js";
import { assignOptionValue, type OptionValueMap } from "./option-value.js";

const buildOptionMaps = (defs: readonly AnyOptionDef[]) => {
    const optionsByName = new Map<string, AnyOptionDef>();
    const optionsByAlias = new Map<string, AnyOptionDef>();

    for (const option of defs) {
        optionsByName.set(option.name, option);

        if (option.alias) {
            optionsByAlias.set(option.alias, option);
        }
    }

    return { optionsByName, optionsByAlias };
};

const assignShortOptionCluster = (
    token: string,
    tokens: readonly string[],
    index: number,
    optionsByAlias: Map<string, AnyOptionDef>,
    optionValues: OptionValueMap,
): number => {
    const { key, inlineValue } = splitOptionToken(token, 1);

    if (key.length === 1) {
        const option = optionsByAlias.get(key);

        if (!option) {
            throw new Error(`Unknown option: -${key}`);
        }

        return assignOptionValue(option, `-${key}`, inlineValue, tokens, index, optionValues);
    }

    for (let optionIndex = 0; optionIndex < key.length; optionIndex += 1) {
        const alias = key[optionIndex];

        if (alias === undefined) {
            continue;
        }

        const option = optionsByAlias.get(alias);

        if (!option) {
            throw new Error(`Unknown option: -${alias}`);
        }

        const type = option.type ?? "boolean";
        const remaining = key.slice(optionIndex + 1);

        if (type === "boolean") {
            optionValues.set(option.name, true);
            continue;
        }

        return assignOptionValue(
            option,
            `-${alias}`,
            remaining.length > 0 ? remaining : inlineValue,
            tokens,
            index,
            optionValues,
        );
    }

    return index;
};

/**
 * Parse named CLI options and return the remaining positional tokens.
 *
 * @param defs - Option definitions accepted by the command
 * @param tokens - Raw command-line tokens after the command name
 * @returns Parsed options plus unconsumed positional tokens
 */
export function parseOptions<const TOptions extends readonly AnyOptionDef[]>(
    defs: TOptions | undefined,
    tokens: readonly string[],
): ParsedOptions<TOptions> {
    if (!defs || defs.length === 0) {
        return {
            positionalTokens: [...tokens],
            options: {} as ParsedOptions<TOptions>["options"],
        };
    }

    const { optionsByName, optionsByAlias } = buildOptionMaps(defs);
    const positionalTokens: string[] = [];
    const optionValues: OptionValueMap = new Map();
    let parseOnlyPositionals = false;

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];

        if (token === undefined) {
            continue;
        }

        if (parseOnlyPositionals || token === "--") {
            parseOnlyPositionals = token === "--" ? true : parseOnlyPositionals;

            if (token !== "--") {
                positionalTokens.push(token);
            }

            continue;
        }

        if (token.startsWith("--")) {
            const { key, inlineValue } = splitOptionToken(token, 2);
            const option = optionsByName.get(key);

            if (!option) {
                throw new Error(`Unknown option: --${key}`);
            }

            index = assignOptionValue(option, `--${key}`, inlineValue, tokens, index, optionValues);
            continue;
        }

        if (token.startsWith("-") && token !== "-") {
            index = assignShortOptionCluster(token, tokens, index, optionsByAlias, optionValues);
            continue;
        }

        positionalTokens.push(token);
    }

    return { positionalTokens, options: buildOptions(defs, optionValues) };
}

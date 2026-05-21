import type { OptionTokenParts } from "../../../types/interfaces/option-token.d.js";

/**
 * Split an option token into its key and inline value.
 *
 * @param token - Raw option token
 * @param prefixLength - Number of leading dash characters to skip
 * @returns Parsed option token parts
 */
export const splitOptionToken = (token: string, prefixLength: number): OptionTokenParts => {
    const separatorIndex = token.indexOf("=");

    if (separatorIndex === -1) {
        return { key: token.slice(prefixLength), inlineValue: undefined };
    }

    return {
        key: token.slice(prefixLength, separatorIndex),
        inlineValue: token.slice(separatorIndex + 1),
    };
};

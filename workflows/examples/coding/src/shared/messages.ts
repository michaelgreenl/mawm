/**
 * Flattens text-bearing structured content into plain text.
 *
 * @param value - Raw content value.
 * @param raw - Whether to serialize non-text structured items.
 * @returns The trimmed text representation.
 */
export const flattenTextContent = (value: unknown, raw = false): string => {
    if (typeof value === "string") {
        return value.trim();
    }

    if (!Array.isArray(value)) {
        return "";
    }

    return value
        .map((item) => {
            if (typeof item === "string") {
                return item.trim();
            }

            if (typeof item !== "object" || item === null) {
                return "";
            }

            if ("text" in item && typeof item.text === "string") {
                return item.text.trim();
            }

            return raw ? (JSON.stringify(item) ?? "") : "";
        })
        .filter((item) => item.length > 0)
        .join("\n")
        .trim();
};

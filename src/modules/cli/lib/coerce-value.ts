import type { CoercedValue } from "../../../types/interfaces/parse-result.d.js";
import type { ValueTypeName } from "../../../types/interfaces/value.d.js";

/**
 * Coerce a CLI token into the requested primitive type.
 *
 * @param type - Target value type
 * @param value - Raw CLI token
 * @returns Coerced primitive value
 */
export function coerceValue(type: ValueTypeName | undefined, value: string): CoercedValue {
    switch (type) {
        case "number":
            return Number(value);
        case "boolean":
            return value === "true";
        case "string":
        default:
            return value;
    }
}

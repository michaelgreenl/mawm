import type { AnyArgDef, AnyOptionDef, ValueTypeMap } from "../types/value.d.js";
import type { InferArgs, InferOptions } from "../types/inference.d.js";

/** Runtime value produced by CLI argument and option coercion. */
export type CoercedValue = ValueTypeMap[keyof ValueTypeMap];

/** Parsed options and remaining positional tokens. */
export type ParsedOptions<TOptions extends readonly AnyOptionDef[]> = {
    positionalTokens: string[];
    options: InferOptions<TOptions>;
};

/** Parsed command arguments and options. */
export type ParsedCommandInputs<
    TArgs extends readonly AnyArgDef[],
    TOptions extends readonly AnyOptionDef[],
> = {
    args: InferArgs<TArgs>;
    options: InferOptions<TOptions>;
};

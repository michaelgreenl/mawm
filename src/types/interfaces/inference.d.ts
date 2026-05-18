import type {
    AnyArgDef,
    AnyOptionDef,
    ArgDef,
    OptionDef,
    ValueTypeMap,
    ValueTypeName,
} from "./value.d.js";

export type Simplify<T> = {
    [K in keyof T]: T[K];
} & {};

export type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (
    arg: infer I,
) => void
    ? I
    : never;

type DefTypeName<D> =
    D extends ArgDef<string, infer T extends ValueTypeName, boolean, boolean, unknown>
        ? T
        : D extends OptionDef<string, infer T extends ValueTypeName, boolean, unknown>
          ? T
          : "string";

type HasDefault<D> =
    D extends ArgDef<string, ValueTypeName, boolean, boolean, infer Default>
        ? [Default] extends [undefined]
            ? false
            : true
        : D extends OptionDef<string, ValueTypeName, boolean, infer Default>
          ? [Default] extends [undefined]
              ? false
              : true
          : false;

/** Inferred runtime value for a positional argument definition. */
export type InferArgValue<D extends AnyArgDef> = D extends { variadic: true }
    ? ValueTypeMap[DefTypeName<D>][]
    : D extends { required: true }
      ? ValueTypeMap[DefTypeName<D>]
      : HasDefault<D> extends true
        ? ValueTypeMap[DefTypeName<D>]
        : ValueTypeMap[DefTypeName<D>] | undefined;

type ArgEntry<D extends AnyArgDef> = D extends { name: infer N extends string }
    ? { [K in N]: InferArgValue<D> }
    : never;

/** Inferred runtime value for an option definition. */
export type InferOptionValue<D extends AnyOptionDef> =
    DefTypeName<D> extends "boolean"
        ? boolean
        : D extends { required: true }
          ? ValueTypeMap[DefTypeName<D>]
          : HasDefault<D> extends true
            ? ValueTypeMap[DefTypeName<D>]
            : ValueTypeMap[DefTypeName<D>] | undefined;

type OptionEntry<D extends AnyOptionDef> = D extends { name: infer N extends string }
    ? { [K in N]: InferOptionValue<D> }
    : never;

type EmptyArgs = Record<never, never>;

/** Inferred positional argument object for command handlers. */
export type InferArgs<TArgs extends readonly AnyArgDef[]> = [TArgs[number]] extends [never]
    ? EmptyArgs
    : Simplify<UnionToIntersection<ArgEntry<TArgs[number]>>>;

/** Inferred option object for command handlers. */
export type InferOptions<TOptions extends readonly AnyOptionDef[]> = [TOptions[number]] extends [
    never,
]
    ? EmptyArgs
    : Simplify<UnionToIntersection<OptionEntry<TOptions[number]>>>;

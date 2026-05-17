import type { Simplify, UnionToIntersection } from "./utils.d.js";

export type ValueTypeName = "string" | "number" | "boolean";

export type ValueTypeMap = {
    string: string;
    number: number;
    boolean: boolean;
};

export interface CommandContext {
    cwd: string;
    env: NodeJS.ProcessEnv;
    rawArgs: string[];
}

export type ArgDef<
    Name extends string = string,
    T extends ValueTypeName = ValueTypeName,
    Required extends boolean = boolean,
    Variadic extends boolean = boolean,
    Default = undefined,
> = {
    name: Name;
    description?: string;
    usage?: string;
    type?: T;
    required?: Required;
    variadic?: Variadic;
    defaultValue?: Default;
};

export type AnyArgDef = ArgDef<string, ValueTypeName, boolean, boolean, unknown>;

export type OptionDef<
    Name extends string = string,
    T extends ValueTypeName = "boolean",
    Required extends boolean = boolean,
    Default = undefined,
> = {
    name: Name;
    alias?: string;
    description?: string;
    usage?: string;
    type?: T;
    required?: Required;
    defaultValue?: Default;
};

export type AnyOptionDef = OptionDef<string, ValueTypeName, boolean, unknown>;

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

type AnyArgDefs = readonly AnyArgDef[];
type AnyOptionDefs = readonly AnyOptionDef[];

type EmptyArgs = Record<never, never>;

export type InferArgs<TArgs extends readonly AnyArgDef[]> = [TArgs[number]] extends [never]
    ? EmptyArgs
    : Simplify<UnionToIntersection<ArgEntry<TArgs[number]>>>;

export type InferOptions<TOptions extends readonly AnyOptionDef[]> = [TOptions[number]] extends [
    never,
]
    ? EmptyArgs
    : Simplify<UnionToIntersection<OptionEntry<TOptions[number]>>>;

type CommandHandlerInput<
    TArgs extends Record<string, unknown>,
    TOptions extends Record<string, unknown>,
> = {
    context: CommandContext;
} & ([keyof TArgs] extends [never] ? { args?: TArgs } : { args: TArgs }) &
    ([keyof TOptions] extends [never] ? { options?: TOptions } : { options: TOptions });

export type CommandHandler<
    TArgs extends Record<string, unknown>,
    TOptions extends Record<string, unknown> = EmptyArgs,
> = (input: CommandHandlerInput<TArgs, TOptions>) => number | Promise<number>;

export type SubCommand<
    TArgs extends readonly AnyArgDef[] = AnyArgDefs,
    TOptions extends readonly AnyOptionDef[] = AnyOptionDefs,
> = {
    name: string;
    parent?: string;
    description?: string;
    usage?: string;
    args?: TArgs;
    options?: TOptions;
    run: CommandHandler<InferArgs<TArgs>, InferOptions<TOptions>>;
};

export type Command<
    TArgs extends readonly AnyArgDef[] = AnyArgDefs,
    TOptions extends readonly AnyOptionDef[] = AnyOptionDefs,
    TSubCommands extends readonly SubCommand[] = readonly SubCommand[],
    TAliases extends readonly string[] = readonly string[],
> = {
    name: string;
    description?: string;
    usage?: string;
    aliases?: TAliases;
    args?: TArgs;
    options?: TOptions;
    subCommands?: TSubCommands;
    run?: CommandHandler<InferArgs<TArgs>, InferOptions<TOptions>>;
};

export function arg<
    const Name extends string,
    const T extends ValueTypeName = "string",
    const Required extends boolean = false,
    const Variadic extends boolean = false,
    const Default extends ValueTypeMap[T] | undefined = undefined,
>(
    name: Name,
    config?: {
        description?: string;
        usage?: string;
        type?: T;
        required?: Required;
        variadic?: Variadic;
        defaultValue?: Default;
    },
): ArgDef<Name, T, Required, Variadic, Default> {
    return { name, ...config };
}

export function option<
    const Name extends string,
    const T extends ValueTypeName = "boolean",
    const Required extends boolean = false,
    const Default extends ValueTypeMap[T] | undefined = undefined,
>(
    name: Name,
    config?: {
        alias?: string;
        description?: string;
        usage?: string;
        type?: T;
        required?: Required;
        defaultValue?: Default;
    },
): OptionDef<Name, T, Required, Default> {
    return { name, ...config };
}

export function defineSubCommand<
    const TArgs extends readonly AnyArgDef[] = readonly [],
    const TOptions extends readonly AnyOptionDef[] = readonly [],
>(def: {
    name: string;
    parent?: string;
    description?: string;
    usage?: string;
    args?: TArgs;
    options?: TOptions;
    run: CommandHandler<NoInfer<InferArgs<TArgs>>, NoInfer<InferOptions<TOptions>>>;
}): SubCommand<TArgs, TOptions> {
    return def;
}

export function defineCommand<
    const TArgs extends readonly AnyArgDef[] = readonly [],
    const TOptions extends readonly AnyOptionDef[] = readonly [],
    const TSubCommands extends readonly SubCommand[] = readonly [],
    const TAliases extends readonly string[] = readonly [],
>(def: {
    name: string;
    description?: string;
    usage?: string;
    aliases?: TAliases;
    args?: TArgs;
    options?: TOptions;
    subCommands?: TSubCommands;
    run?: CommandHandler<NoInfer<InferArgs<TArgs>>, NoInfer<InferOptions<TOptions>>>;
}): Command<TArgs, TOptions, TSubCommands, TAliases> {
    return def;
}

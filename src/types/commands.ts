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

type DefTypeName<D> = D extends { type: infer T extends ValueTypeName } ? T : "string";

type HasDefault<D> =
    D extends ArgDef<string, ValueTypeName, boolean, boolean, infer Default>
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

type AnyArgDefs = readonly AnyArgDef[];

type EmptyArgs = Record<never, never>;

export type InferArgs<TArgs extends readonly AnyArgDef[]> = [TArgs[number]] extends [never]
    ? EmptyArgs
    : Simplify<UnionToIntersection<ArgEntry<TArgs[number]>>>;

export type CommandHandler<TArgs extends Record<string, unknown>> = [keyof TArgs] extends [never]
    ? (input: { args?: TArgs; context: CommandContext }) => number | Promise<number>
    : (input: { args: TArgs; context: CommandContext }) => number | Promise<number>;

export type SubCommand<TArgs extends readonly AnyArgDef[] = AnyArgDefs> = {
    name: string;
    parent?: string;
    description?: string;
    usage?: string;
    args?: TArgs;
    run: CommandHandler<InferArgs<TArgs>>;
};

export type Command<
    TArgs extends readonly AnyArgDef[] = AnyArgDefs,
    TSubCommands extends readonly SubCommand[] = readonly SubCommand[],
    TAliases extends readonly string[] = readonly string[],
> = {
    name: string;
    description?: string;
    usage?: string;
    aliases?: TAliases;
    args?: TArgs;
    subCommands?: TSubCommands;
    run?: CommandHandler<InferArgs<TArgs>>;
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

export function defineSubCommand<const TArgs extends readonly AnyArgDef[] = readonly []>(def: {
    name: string;
    parent?: string;
    description?: string;
    usage?: string;
    args?: TArgs;
    run: CommandHandler<InferArgs<TArgs>>;
}): SubCommand<TArgs> {
    return def;
}

export function defineCommand<
    const TArgs extends readonly AnyArgDef[] = readonly [],
    const TSubCommands extends readonly SubCommand[] = readonly [],
    const TAliases extends readonly string[] = readonly [],
>(def: {
    name: string;
    description?: string;
    usage?: string;
    aliases?: TAliases;
    args?: TArgs;
    subCommands?: TSubCommands;
    run?: CommandHandler<InferArgs<TArgs>>;
}): Command<TArgs, TSubCommands, TAliases> {
    return def;
}

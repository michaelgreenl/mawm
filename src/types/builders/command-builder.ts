import type { Command, CommandHandler, SubCommand } from "../interfaces/command.d.js";
import type { InferArgs, InferOptions } from "../interfaces/inference.d.js";
import type {
    AnyArgDef,
    AnyOptionDef,
    ArgDef,
    OptionDef,
    ValueTypeMap,
    ValueTypeName,
} from "../interfaces/value.d.js";

/** Create a typed positional argument definition. */
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

/** Create a typed named option definition. */
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

/** Define a typed sub-command for a parent command. */
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

/** Define a typed top-level command. */
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

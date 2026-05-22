import type { AnyArgDef, AnyOptionDef } from "./value.d.js";
import type { InferArgs, InferOptions } from "./inference.d.js";

type AnyArgDefs = readonly AnyArgDef[];
type AnyOptionDefs = readonly AnyOptionDef[];
type EmptyArgs = Record<never, never>;

/** Runtime context passed into every CLI command handler. */
export interface CommandContext {
    cwd: string;
    env: NodeJS.ProcessEnv;
    rawArgs: string[];
}

type CommandHandlerInput<
    TArgs extends Record<string, unknown>,
    TOptions extends Record<string, unknown>,
> = {
    context: CommandContext;
} & ([keyof TArgs] extends [never] ? { args?: TArgs } : { args: TArgs }) &
    ([keyof TOptions] extends [never] ? { options?: TOptions } : { options: TOptions });

/** Command handler signature with inferred argument and option objects. */
export type CommandHandler<
    TArgs extends Record<string, unknown>,
    TOptions extends Record<string, unknown> = EmptyArgs,
> = (input: CommandHandlerInput<TArgs, TOptions>) => number | Promise<number>;

/** Nested CLI command definition. */
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

/** Top-level CLI command definition. */
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

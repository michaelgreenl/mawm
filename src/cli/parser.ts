import commands from "./cmd/index.js";

import type {
    AnyArgDef,
    ArgDef,
    Command,
    CommandContext,
    InferArgs,
    SubCommand,
} from "../types/commands.js";

const HELP_FLAGS = new Set(["-h", "--help", "help"]);

type KnownCommand = (typeof commands)[number];

type CommandName = KnownCommand["name"];

type CommandAlias = Exclude<NonNullable<KnownCommand["aliases"]>[number], undefined>;

type CommandIdentifier = CommandName | CommandAlias;

const commandMap = new Map<CommandIdentifier, KnownCommand>();

for (const command of commands) {
    commandMap.set(command.name, command);

    for (const alias of command.aliases ?? []) {
        commandMap.set(alias, command);
    }
}

const isHelpFlag = (value: string | undefined): boolean =>
    value !== undefined && HELP_FLAGS.has(value);

const resolveCommand = (commandName: string | undefined): KnownCommand | undefined => {
    if (!commandName) {
        return undefined;
    }

    return commandMap.get(commandName as CommandIdentifier);
};

export const outputHelp = (): string =>
    [
        "Usage: mawm <command>",
        "",
        "Commands:",
        ...commands.map(
            (command) =>
                `  mawm ${command.usage ?? command.name}${command.description ? ` - ${command.description}` : ""}`,
        ),
    ].join("\n");

export const outputCommandHelp = (command: Command): string =>
    [
        `Usage: mawm ${command.usage ?? command.name}`,
        "",
        "Commands:",
        ...(command.subCommands?.map(
            (subCommand: SubCommand) =>
                `  mawm ${subCommand.usage ?? `${command.name} ${subCommand.name}`}${subCommand.description ? ` - ${subCommand.description}` : ""}`,
        ) ?? []),
    ].join("\n");

export const outputSubCommandHelp = (subCommand: SubCommand): string =>
    `Usage: mawm ${subCommand.usage ?? subCommand.name}${subCommand.description ? ` - ${subCommand.description}` : ""}`;

export const parseCommandName = (args: readonly string[]): CommandName | undefined => {
    const candidate = args[0];

    if (!candidate || isHelpFlag(candidate)) {
        return undefined;
    }

    return resolveCommand(candidate)?.name;
};

function coerceValue(type: ArgDef["type"], value: string): string | number | boolean {
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

function parsePositionalArgs<const TArgs extends readonly AnyArgDef[]>(
    defs: TArgs | undefined,
    tokens: readonly string[],
): InferArgs<TArgs> {
    const result: Record<string, unknown> = {};

    if (!defs || defs.length === 0) {
        return result as InferArgs<TArgs>;
    }

    let index = 0;

    for (const def of defs) {
        const type = def.type ?? "string";

        if (def.variadic) {
            result[def.name] = tokens.slice(index).map((token) => coerceValue(type, token));
            index = tokens.length;
            continue;
        }

        const token = tokens[index];

        if (token !== undefined) {
            result[def.name] = coerceValue(type, token);
            index += 1;
            continue;
        }

        if (def.defaultValue !== undefined) {
            result[def.name] = def.defaultValue;
            continue;
        }

        if (def.required) {
            throw new Error(`Missing required argument: ${def.name}`);
        }

        result[def.name] = undefined;
    }

    return result as InferArgs<TArgs>;
}

function outputArgumentError(message: string, usage: string | undefined): number {
    process.stderr.write(`${message}\n${usage ? `\nUsage: mawm ${usage}\n` : ""}`);
    return 1;
}

async function runCommandTarget<const TArgs extends readonly AnyArgDef[]>(
    target: Pick<Command<TArgs> | SubCommand<TArgs>, "args" | "run">,
    tokens: readonly string[],
    context: CommandContext,
    usage: string | undefined,
): Promise<number> {
    try {
        const args = parsePositionalArgs(target.args, tokens);
        return target.run ? await target.run({ args, context }) : 0;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return outputArgumentError(message, usage);
    }
}

async function parseSubCommand(
    command: Command,
    remaining: readonly string[],
    context: CommandContext,
): Promise<number> {
    const [subCommandName, ...subCommandTokens] = remaining;

    if (!subCommandName || isHelpFlag(subCommandName)) {
        process.stdout.write(`${outputCommandHelp(command)}\n`);
        return 0;
    }

    const subCommand = command.subCommands?.find((candidate) => candidate.name === subCommandName);

    if (!subCommand) {
        process.stderr.write(
            `Unknown sub-command: ${command.name} ${subCommandName}\n\n${outputCommandHelp(command)}\n`,
        );
        return 1;
    }

    if (isHelpFlag(subCommandTokens[0])) {
        process.stdout.write(`${outputSubCommandHelp(subCommand)}\n`);
        return 0;
    }

    return runCommandTarget(
        subCommand,
        subCommandTokens,
        context,
        subCommand.usage ?? `${command.name} ${subCommand.name}`,
    );
}

export async function parseCommand(
    args: readonly string[],
    context: CommandContext,
): Promise<number> {
    const [commandName, ...remaining] = args;

    if (!commandName || isHelpFlag(commandName)) {
        process.stdout.write(`${outputHelp()}\n`);
        return 0;
    }

    const command = resolveCommand(commandName);

    if (!command) {
        process.stderr.write(`Unknown command: ${commandName}\n\n${outputHelp()}\n`);
        return 1;
    }

    if (command.subCommands?.length) {
        return parseSubCommand(command, remaining, context);
    }

    if (isHelpFlag(remaining[0])) {
        process.stdout.write(
            `Usage: mawm ${command.usage ?? command.name}${command.description ? ` - ${command.description}` : ""}\n`,
        );
        return 0;
    }

    return runCommandTarget(
        command as Command<readonly AnyArgDef[], readonly SubCommand[], readonly string[]>,
        remaining,
        context,
        command.usage ?? command.name,
    );
}

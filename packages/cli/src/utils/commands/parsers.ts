import commands from "../../commands/index.js";

import type { AnyArgDef, ArgDef, Command, CommandContext, InferArgs, SubCommand } from "./types.js";

const HELP_FLAGS = new Set(["-h", "--help", "help"]);

const commandMap = new Map<string, Command>(commands.map((command) => [command.name, command]));

type CommandName = (typeof commands)[number]["name"];

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

    if (!candidate || HELP_FLAGS.has(candidate)) {
        return undefined;
    }

    return commandMap.get(candidate)?.name;
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

        if (token === undefined) {
            if (def.defaultValue !== undefined) {
                result[def.name] = def.defaultValue;
                continue;
            }

            if (def.required) {
                throw new Error(`Missing required argument: ${def.name}`);
            }

            result[def.name] = undefined;
            continue;
        }

        result[def.name] = coerceValue(type, token);
        index += 1;
    }

    return result as InferArgs<TArgs>;
}

function outputArgumentError(message: string, usage: string | undefined): number {
    process.stderr.write(`${message}\n${usage ? `\nUsage: mawm ${usage}\n` : ""}`);
    return 1;
}

async function parseSubCommand(
    command: Command,
    remaining: readonly string[],
    context: CommandContext,
): Promise<number> {
    const subCommandName = remaining[0];

    if (!subCommandName || HELP_FLAGS.has(subCommandName)) {
        process.stdout.write(`${outputCommandHelp(command)}\n`);
        return 0;
    }

    const subCommands = command.subCommands ?? [];
    const subCommand = subCommands.find((candidate) => candidate.name === subCommandName);

    if (!subCommand) {
        process.stderr.write(
            `Unknown sub-command: ${command.name} ${subCommandName}\n\n${outputCommandHelp(command)}\n`,
        );
        return 1;
    }

    const subCommandTokens = remaining.slice(1);

    if (subCommandTokens[0] && HELP_FLAGS.has(subCommandTokens[0])) {
        process.stdout.write(`${outputSubCommandHelp(subCommand)}\n`);
        return 0;
    }

    try {
        const subCommandArgs = parsePositionalArgs(subCommand.args, subCommandTokens);
        return await subCommand.run({ args: subCommandArgs, context });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return outputArgumentError(
            message,
            subCommand.usage ?? `${command.name} ${subCommand.name}`,
        );
    }
}

export async function parseCommand(
    args: readonly string[],
    context: CommandContext,
): Promise<number> {
    if (args[0] === undefined || HELP_FLAGS.has(args[0])) {
        process.stdout.write(`${outputHelp()}\n`);
        return 0;
    }

    const commandName = parseCommandName(args);

    if (!commandName) {
        process.stderr.write(`Unknown command: ${args[0]}\n\n${outputHelp()}\n`);
        return 1;
    }

    const command = commandMap.get(commandName);

    if (!command) {
        process.stderr.write(`Unknown command: ${args[0]}\n`);
        return 1;
    }

    const remaining = args.slice(1);

    if (command.subCommands && command.subCommands.length > 0) {
        return await parseSubCommand(command, remaining, context);
    }

    if (remaining[0] && HELP_FLAGS.has(remaining[0])) {
        process.stdout.write(
            `Usage: mawm ${command.usage ?? command.name}${command.description ? ` - ${command.description}` : ""}\n`,
        );
        return 0;
    }

    try {
        const commandArgs = parsePositionalArgs(command.args, remaining);
        return command.run ? await command.run({ args: commandArgs, context }) : 0;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return outputArgumentError(message, command.usage ?? command.name);
    }
}

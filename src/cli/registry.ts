import commands from "./cmd/index.js";

/** Command definition registered with the CLI parser. */
export type KnownCommand = (typeof commands)[number];

/** Canonical command names accepted by the CLI parser. */
export type CommandName = KnownCommand["name"];

type CommandAlias = Exclude<NonNullable<KnownCommand["aliases"]>[number], undefined>;
type CommandIdentifier = CommandName | CommandAlias;

const commandMap = new Map<CommandIdentifier, KnownCommand>();

for (const command of commands) {
    commandMap.set(command.name, command);

    for (const alias of command.aliases ?? []) {
        commandMap.set(alias, command);
    }
}

/** Registered top-level CLI commands. */
export const availableCommands = commands;

/**
 * Resolve a command name or alias to a command definition.
 *
 * @param commandName - Raw command token
 * @returns Matching command definition, if one exists
 */
export const resolveCommand = (commandName: string | undefined): KnownCommand | undefined => {
    if (!commandName) {
        return undefined;
    }

    return commandMap.get(commandName as CommandIdentifier);
};

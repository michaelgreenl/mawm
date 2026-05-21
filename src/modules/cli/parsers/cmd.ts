import { isHelpFlag } from "../lib/constants.js";
import { outputCommandHelp, outputHelp, outputSubCommandHelp } from "../lib/help.js";
import { runCommandTarget } from "../runner.js";
import { resolveCommand } from "../registry.js";
import type { Command, CommandContext } from "../../../types/interfaces/command.d.js";
import type { AnyArgDef, AnyOptionDef } from "../../../types/interfaces/value.d.js";

const parseSubCommand = async (
    command: Command,
    remaining: readonly string[],
    context: CommandContext,
): Promise<number> => {
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
};

/**
 * Parse raw CLI arguments and execute the matching command.
 *
 * @param args - Raw CLI arguments after the executable name
 * @param context - Runtime command context
 * @returns CLI exit code
 */
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
        command as Command<readonly AnyArgDef[], readonly AnyOptionDef[]>,
        remaining,
        context,
        command.usage ?? command.name,
    );
}

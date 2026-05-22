import { availableCommands } from "../cmd/registry.js";
import type { Command, SubCommand } from "./types/command.d.js";

/**
 * Render top-level CLI help.
 *
 * @returns CLI help text for all registered commands
 */
export const outputHelp = (): string =>
    [
        "Usage: mawm <command>",
        "",
        "Commands:",
        ...availableCommands.map(
            (command) =>
                `  mawm ${command.usage ?? command.name}${command.description ? ` - ${command.description}` : ""}`,
        ),
    ].join("\n");

/**
 * Render help for a top-level command.
 *
 * @param command - Command definition to render
 * @returns CLI help text for the command
 */
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

/**
 * Render help for a nested sub-command.
 *
 * @param subCommand - Sub-command definition to render
 * @returns Single-line usage for the sub-command
 */
export const outputSubCommandHelp = (subCommand: SubCommand): string =>
    `Usage: mawm ${subCommand.usage ?? subCommand.name}${subCommand.description ? ` - ${subCommand.description}` : ""}`;

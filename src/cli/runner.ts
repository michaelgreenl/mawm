import { parseCommandInputs } from "./parsers/arguments.js";
import type { Command, CommandContext, SubCommand } from "../types/interfaces/command.d.js";
import type { AnyArgDef, AnyOptionDef } from "../types/interfaces/value.d.js";

/**
 * Write an argument parsing error and usage details to stderr.
 *
 * @param message - Error message to display
 * @param usage - Optional usage suffix for the command
 * @returns Failure exit code
 */
export function outputArgumentError(message: string, usage: string | undefined): number {
    process.stderr.write(`${message}\n${usage ? `\nUsage: mawm ${usage}\n` : ""}`);
    return 1;
}

/**
 * Parse command target inputs and execute the target handler.
 *
 * @param target - Command or sub-command target to run
 * @param tokens - Raw command tokens after the target name
 * @param context - Runtime command context
 * @param usage - Usage suffix rendered for parse errors
 * @returns Command exit code
 */
export async function runCommandTarget<
    const TArgs extends readonly AnyArgDef[],
    const TOptions extends readonly AnyOptionDef[],
>(
    target: Pick<
        Command<TArgs, TOptions> | SubCommand<TArgs, TOptions>,
        "args" | "options" | "run"
    >,
    tokens: readonly string[],
    context: CommandContext,
    usage: string | undefined,
): Promise<number> {
    try {
        const { args, options } = parseCommandInputs(target.args, target.options, tokens);
        return target.run ? await target.run({ args, options, context }) : 0;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return outputArgumentError(message, usage);
    }
}

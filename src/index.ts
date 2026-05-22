#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { parseCommand } from "./utils/parsers/cmd.js";
import type { CommandContext } from "./utils/types/command.d.js";

export const runCli = async (args: readonly string[] = process.argv.slice(2)): Promise<number> => {
    const context: CommandContext = {
        cwd: process.cwd(),
        env: process.env,
        rawArgs: [...args],
    };

    return await parseCommand(args, context);
};

const entry = process.argv[1];

if (entry && import.meta.url === pathToFileURL(entry).href) {
    runCli().then(
        (exitCode) => {
            process.exitCode = exitCode;
        },
        (error: unknown) => {
            const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
            process.stderr.write(`${message}\n`);
            process.exitCode = 1;
        },
    );
}

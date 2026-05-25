import { parseCommand } from "../../src/utils/parsers/cmd.js";
import { captureOutput } from "./capture.js";
import { createContext } from "./context.js";

/** Runs the public CLI parser against raw arguments and captures output. */
export const runCli = (cwd: string, home: string, args: readonly string[]) => {
    return captureOutput(() => parseCommand(args, createContext(cwd, home, args)));
};

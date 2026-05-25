import type { CommandContext } from "../../src/utils/types/command.d.js";

/** Builds a minimal CommandContext for CLI integration tests. */
export const createContext = (
    cwd: string,
    home: string,
    rawArgs: readonly string[],
): CommandContext => ({
    cwd,
    env: { HOME: home },
    rawArgs: [...rawArgs],
});

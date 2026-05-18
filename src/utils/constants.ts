/** Help tokens accepted by the CLI parser. */
export const HELP_FLAGS = new Set(["-h", "--help", "help"]);

/**
 * Check whether a token requests command help.
 *
 * @param value - Raw command-line token
 * @returns True when the token is a supported help flag
 */
export const isHelpFlag = (value: string | undefined): boolean =>
    value !== undefined && HELP_FLAGS.has(value);

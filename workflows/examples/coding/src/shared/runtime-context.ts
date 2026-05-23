export interface RuntimeContextCarrier<Context extends Record<string, unknown>> {
    readonly configurable?: Partial<Context>;
    readonly context?: Partial<Context>;
}

/**
 * Returns a trimmed string when the runtime context value is present.
 *
 * @param value - Candidate runtime context value.
 * @returns The trimmed value, or `undefined` when absent.
 */
const trimContextValue = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Reads a trimmed string value from runtime context or configurable fallback.
 *
 * @param runtime - LangGraph runtime-like object.
 * @param key - Context key to read.
 * @returns The resolved trimmed value, or `undefined` when absent.
 */
export const getRuntimeContextValue = <
    Context extends Record<string, unknown>,
    Key extends keyof Context,
>(
    runtime: RuntimeContextCarrier<Context> | undefined,
    key: Key,
): string | undefined => {
    const direct = trimContextValue(runtime?.context?.[key]);

    if (direct) {
        return direct;
    }

    return trimContextValue(runtime?.configurable?.[key]);
};

/**
 * Reads a required runtime context value.
 *
 * @param runtime - LangGraph runtime-like object.
 * @param key - Context key to read.
 * @returns The resolved trimmed value.
 * @throws When the value is missing from runtime context and configurable fallback.
 */
export const requireRuntimeContextValue = <
    Context extends Record<string, unknown>,
    Key extends keyof Context,
>(
    runtime: RuntimeContextCarrier<Context> | undefined,
    key: Key,
): string => {
    const value = getRuntimeContextValue(runtime, key);

    if (value) {
        return value;
    }

    throw new Error(`Missing workflow runtime context value: ${String(key)}`);
};

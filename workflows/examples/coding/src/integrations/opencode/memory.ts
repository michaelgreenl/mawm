import { Annotation } from "@langchain/langgraph";
import type { OpenCodeMemory } from "./types.js";

interface OpenCodeMemoryUpdate {
    readonly sessions?: Readonly<Record<string, string>>;
    readonly cursors?: Readonly<Record<string, number>>;
}

/**
 * Workflow state slot that retains the latest OpenCode memory snapshot.
 *
 * Owned by the OpenCode integration so the graph schema stays free of
 * integration-specific reducer details.
 */
export const opencodeMemory = Annotation<OpenCodeMemory | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
});

/**
 * Merges OpenCode session metadata while preserving unrelated memory fields.
 *
 * @param memory - Existing OpenCode memory.
 * @param update - Session or cursor updates to apply.
 * @returns The merged OpenCode memory object.
 */
export const mergeOpenCodeMemory = (
    memory: OpenCodeMemory | undefined,
    update: OpenCodeMemoryUpdate,
): OpenCodeMemory => {
    return {
        ...(memory ?? {}),
        cursors: {
            ...(memory?.cursors ?? {}),
            ...(update.cursors ?? {}),
        },
        sessions: {
            ...(memory?.sessions ?? {}),
            ...(update.sessions ?? {}),
        },
    };
};

/**
 * Merges cursor positions into OpenCode memory.
 *
 * @param memory - Existing OpenCode memory.
 * @param cursors - Cursor positions to write.
 * @returns Updated OpenCode memory.
 */
export const mergeOpenCodeCursors = (
    memory: OpenCodeMemory | undefined,
    cursors: Readonly<Record<string, number>>,
): OpenCodeMemory => {
    return mergeOpenCodeMemory(memory, { cursors });
};

/**
 * Reads the stored cursor for an OpenCode session.
 *
 * @param memory - Existing OpenCode memory.
 * @param name - Session key to read.
 * @returns The stored cursor, or `undefined` when absent.
 */
export const getOpenCodeCursor = (
    memory: OpenCodeMemory | undefined,
    name: string,
): number | undefined => {
    return memory?.cursors?.[name];
};

/**
 * Reads the stored OpenCode session identifier.
 *
 * @param memory - Existing OpenCode memory.
 * @param name - Session key to read.
 * @returns The stored session identifier, or `undefined` when absent.
 */
export const getOpenCodeSessionID = (
    memory: OpenCodeMemory | undefined,
    name: string,
): string | undefined => {
    return memory?.sessions?.[name];
};

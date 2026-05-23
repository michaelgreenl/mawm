import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { mergeOpenCodeCursors } from "../integrations/opencode/memory.js";
import type { OpenCodeMemory } from "../integrations/opencode/types.js";
import { flattenTextContent } from "../shared/messages.js";

/**
 * Merges cursor positions into OpenCode memory while preserving existing sessions.
 *
 * @param memory - Existing OpenCode memory.
 * @param cursors - Cursor positions to write.
 * @returns Updated OpenCode memory.
 */
export const buildCursorMemory = (
    memory: OpenCodeMemory | undefined,
    cursors: Readonly<Record<string, number>>,
): OpenCodeMemory => {
    return mergeOpenCodeCursors(memory, cursors);
};

/**
 * Returns the most recent reply from the named agent.
 *
 * @param messages - Workflow message history.
 * @param agentName - Agent name to search for.
 * @returns The latest reply text, or `undefined` when none exists.
 */
export const getLastAgentReply = (
    messages: readonly BaseMessage[],
    agentName: string,
): string | undefined => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];

        if (!message || message.getType() !== "ai" || message.name !== agentName) {
            continue;
        }

        const content = flattenTextContent(message.content, true);

        if (content.length > 0) {
            return content;
        }
    }

    return undefined;
};

/**
 * Builds a named human message used to instruct an agent.
 *
 * @param name - Message name used for traceability.
 * @param content - Instruction content.
 * @returns The LangChain human message.
 */
export const instructionMessage = (name: string, content: string): HumanMessage => {
    return new HumanMessage({
        content: content.trim(),
        name,
    });
};

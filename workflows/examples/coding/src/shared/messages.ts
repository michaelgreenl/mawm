import { HumanMessage, type BaseMessage } from "@langchain/core/messages";

/**
 * Flattens text-bearing structured content into plain text.
 *
 * @param value - Raw content value.
 * @param raw - Whether to serialize non-text structured items.
 * @returns The trimmed text representation.
 */
export const flattenTextContent = (value: unknown, raw = false): string => {
    if (typeof value === "string") {
        return value.trim();
    }

    if (!Array.isArray(value)) {
        return "";
    }

    return value
        .map((item) => {
            if (typeof item === "string") {
                return item.trim();
            }

            if (typeof item !== "object" || item === null) {
                return "";
            }

            if ("text" in item && typeof item.text === "string") {
                return item.text.trim();
            }

            return raw ? (JSON.stringify(item) ?? "") : "";
        })
        .filter((item) => item.length > 0)
        .join("\n")
        .trim();
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

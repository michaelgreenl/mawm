import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { flattenTextContent } from "../../shared/messages.js";
import type { OpenCodeReply } from "./types.js";

/**
 * Serializes LangChain messages into the text prompt expected by OpenCode.
 *
 * @param messages - Workflow messages that have not yet been sent.
 * @returns The serialized prompt text.
 */
export const serializeMessagesForPrompt = (messages: readonly BaseMessage[]): string => {
    return messages
        .map((message) => {
            const body = flattenTextContent(message.content, true);

            if (!body) {
                return "";
            }

            const kind = message.getType();
            const role =
                kind === "human"
                    ? "User"
                    : kind === "ai"
                      ? "Assistant"
                      : kind === "system"
                        ? "System"
                        : kind === "tool"
                          ? "Tool"
                          : kind;
            const who = message.name ? `${role} (${message.name})` : role;

            return `${who}:\n${body}`;
        })
        .filter((item) => item.length > 0)
        .join("\n\n")
        .trim();
};

/**
 * Creates the LangChain assistant message returned from an OpenCode reply.
 *
 * @param name - Stable agent name.
 * @param reply - OpenCode reply payload.
 * @param sessionID - OpenCode session identifier.
 * @returns The mapped LangChain assistant message.
 */
export const createOpenCodeReplyMessage = (
    name: string,
    reply: OpenCodeReply,
    sessionID: string,
): AIMessage => {
    return new AIMessage({
        id: reply.info.id,
        name,
        content: flattenTextContent(reply.parts),
        additional_kwargs: {
            opencode: {
                info: reply.info,
                parts: reply.parts,
                sessionID,
            },
        },
        response_metadata: {
            cost: reply.info.cost,
            finish: reply.info.finish,
            modelID: reply.info.modelID,
            providerID: reply.info.providerID,
            sessionID,
            tokens: reply.info.tokens,
        },
    });
};

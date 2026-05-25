import type { BaseMessage } from "@langchain/core/messages";
import type { Runtime } from "@langchain/langgraph";
import type { AgentConfig } from "@opencode-ai/sdk";
import { getRuntimeContextValue } from "../../shared/runtime-context.js";
import { createConnectionLoader, type OpenCodeConnection } from "./connection.js";
import { getOpenCodeCursor, getOpenCodeSessionID, mergeOpenCodeMemory } from "./memory.js";
import { createOpenCodeReplyMessage, serializeMessagesForPrompt } from "./message.js";
import type {
    Model,
    OpenCodeNode,
    OpenCodeNodeOptions,
    OpenCodeReply,
    OpenCodeRuntimeContext,
    OpenCodeState,
} from "./types.js";

type Result<T> = T | { data: T };

type OpenCodeSessionMessage = {
    readonly info: OpenCodeReply["info"] & {
        readonly role: string;
        readonly parentID?: string;
        readonly time?: {
            readonly created?: number;
        };
    };
    readonly parts: unknown;
};

type OpenCodeSessionStatus =
    | {
          readonly type: "idle";
      }
    | {
          readonly type: "busy";
      }
    | {
          readonly type: "retry";
      };

type PromptSnapshot = {
    readonly hasMatchingUser: boolean;
    readonly reply?: OpenCodeReply;
};

const SESSION_MESSAGE_LIMIT = 32;
const RECONNECT_POLL_INTERVAL_MS = 250;
const MAX_IDLE_POLLS = 4;

/**
 * Unwraps SDK responses that may or may not be wrapped in a `data` field.
 *
 * @param value - SDK response payload.
 * @returns The unwrapped payload.
 */
const unwrapResult = <T>(value: Result<T>): T => {
    if (typeof value === "object" && value !== null && "data" in value) {
        return value.data;
    }

    return value;
};

/**
 * Reads the latest assistant reply id already present in workflow state.
 *
 * @param messages - Workflow message history.
 * @param name - Stable node and agent name.
 * @returns The latest assistant reply id for this node.
 */
const getLatestWorkflowReplyID = (
    messages: readonly BaseMessage[],
    name: string,
): string | undefined => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];

        if (
            message?.getType() === "ai" &&
            message.name === name &&
            typeof message.id === "string" &&
            message.id.length > 0
        ) {
            return message.id;
        }
    }

    return undefined;
};

/**
 * Waits for the next reconnect poll interval.
 *
 * @returns A resolved promise after the polling delay.
 */
const sleep = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_POLL_INTERVAL_MS));
};

/**
 * Sorts session messages by creation time.
 *
 * @param messages - Session messages to sort.
 * @returns Messages ordered by creation time.
 */
const sortSessionMessages = (
    messages: readonly OpenCodeSessionMessage[],
): readonly OpenCodeSessionMessage[] => {
    return [...messages].sort((left, right) => {
        const leftCreated = left.info.time?.created ?? 0;
        const rightCreated = right.info.time?.created ?? 0;

        return leftCreated - rightCreated;
    });
};

/**
 * Reads recent or full OpenCode session messages.
 *
 * @param sdk - Connected OpenCode client wrapper.
 * @param sessionID - Session identifier.
 * @param limit - Optional message limit.
 * @returns The sorted session messages.
 */
const readSessionMessages = async (
    sdk: OpenCodeConnection,
    sessionID: string,
    limit?: number,
): Promise<readonly OpenCodeSessionMessage[]> => {
    const messages = unwrapResult(
        (await sdk.client.session.messages({
            path: {
                id: sessionID,
            },
            ...(typeof limit === "number"
                ? {
                      query: {
                          limit,
                      },
                  }
                : {}),
            responseStyle: "data",
            throwOnError: true,
        })) as Result<OpenCodeSessionMessage[]>,
    );

    return sortSessionMessages(messages);
};

/**
 * Reads the current status for a specific session.
 *
 * @param sdk - Connected OpenCode client wrapper.
 * @param sessionID - Session identifier.
 * @returns The current session status, when available.
 */
const readSessionStatus = async (
    sdk: OpenCodeConnection,
    sessionID: string,
): Promise<OpenCodeSessionStatus | undefined> => {
    const statuses = unwrapResult(
        (await sdk.client.session.status({
            responseStyle: "data",
            throwOnError: true,
        })) as Result<Record<string, OpenCodeSessionStatus>>,
    );

    return statuses[sessionID];
};

/**
 * Narrows session history to messages after the last workflow reply.
 *
 * @param messages - Sorted session messages.
 * @param lastReplyID - Latest assistant reply id already present in workflow state.
 * @returns Messages after the last known reply, or `undefined` when the anchor is missing.
 */
const sliceAfterReply = (
    messages: readonly OpenCodeSessionMessage[],
    lastReplyID: string | undefined,
): readonly OpenCodeSessionMessage[] | undefined => {
    if (!lastReplyID) {
        return messages;
    }

    const index = messages.findIndex((message) => message.info.id === lastReplyID);

    if (index < 0) {
        return undefined;
    }

    return messages.slice(index + 1);
};

/**
 * Reads the session messages relevant to the current prompt attempt.
 *
 * @param sdk - Connected OpenCode client wrapper.
 * @param sessionID - Session identifier.
 * @param lastReplyID - Latest assistant reply id already present in workflow state.
 * @param requireAnchor - Whether the last reply must be found before reconnecting.
 * @returns Relevant session messages, or `undefined` when reconnecting is unsafe.
 */
const readRelevantSessionMessages = async (
    sdk: OpenCodeConnection,
    sessionID: string,
    lastReplyID: string | undefined,
    requireAnchor: boolean,
): Promise<readonly OpenCodeSessionMessage[] | undefined> => {
    const recent = await readSessionMessages(sdk, sessionID, SESSION_MESSAGE_LIMIT);
    const recentSlice = sliceAfterReply(recent, lastReplyID);

    if (recentSlice) {
        return recentSlice;
    }

    if (!lastReplyID) {
        return recent;
    }

    const complete = await readSessionMessages(sdk, sessionID);
    const completeSlice = sliceAfterReply(complete, lastReplyID);

    if (completeSlice) {
        return completeSlice;
    }

    return requireAnchor ? undefined : complete;
};

/**
 * Inspects relevant session messages for the latest matching prompt and reply.
 *
 * @param messages - Relevant session messages.
 * @param prompt - Serialized prompt text.
 * @returns Whether the prompt is already present and whether a reply has completed.
 */
const inspectPromptSnapshot = (
    messages: readonly OpenCodeSessionMessage[],
    prompt: string,
): PromptSnapshot => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];

        if (!message) {
            continue;
        }

        if (message.info.role !== "user") {
            continue;
        }

        if (flattenOpenCodePrompt(message.parts) !== prompt) {
            return {
                hasMatchingUser: false,
            };
        }

        for (let replyIndex = messages.length - 1; replyIndex > index; replyIndex -= 1) {
            const reply = messages[replyIndex];

            if (!reply) {
                continue;
            }

            if (reply.info.role === "assistant" && reply.info.parentID === message.info.id) {
                return {
                    hasMatchingUser: true,
                    reply: {
                        info: reply.info,
                        parts: reply.parts,
                    },
                };
            }
        }

        return {
            hasMatchingUser: true,
        };
    }

    return {
        hasMatchingUser: false,
    };
};

/**
 * Flattens OpenCode message parts into comparable prompt text.
 *
 * @param parts - Raw OpenCode message parts.
 * @returns Flattened text content.
 */
const flattenOpenCodePrompt = (parts: unknown): string => {
    if (!Array.isArray(parts)) {
        return "";
    }

    return parts
        .map((part) => {
            if (typeof part !== "object" || part === null) {
                return "";
            }

            return "text" in part && typeof part.text === "string" ? part.text.trim() : "";
        })
        .filter((part) => part.length > 0)
        .join("\n")
        .trim();
};

/**
 * Waits for an already-started prompt to finish and produce its assistant reply.
 *
 * @param sdk - Connected OpenCode client wrapper.
 * @param sessionID - Session identifier.
 * @param prompt - Serialized prompt text.
 * @param lastReplyID - Latest assistant reply id already present in workflow state.
 * @param requireAnchor - Whether the previous reply anchor must be present.
 * @returns The completed assistant reply.
 */
const waitForPromptReply = async (
    sdk: OpenCodeConnection,
    sessionID: string,
    prompt: string,
    lastReplyID: string | undefined,
    requireAnchor: boolean,
): Promise<OpenCodeReply> => {
    let idlePolls = 0;

    while (true) {
        const messages = await readRelevantSessionMessages(
            sdk,
            sessionID,
            lastReplyID,
            requireAnchor,
        );
        const snapshot = messages
            ? inspectPromptSnapshot(messages, prompt)
            : { hasMatchingUser: false };

        if (snapshot.reply) {
            return snapshot.reply;
        }

        const status = await readSessionStatus(sdk, sessionID);
        const active =
            snapshot.hasMatchingUser || status?.type === "busy" || status?.type === "retry";

        if (active) {
            idlePolls = 0;
        } else {
            idlePolls += 1;

            if (idlePolls >= MAX_IDLE_POLLS) {
                throw new Error("OpenCode session did not produce a reconnectable reply.");
            }
        }

        await sleep();
    }
};

/**
 * Reattaches to a prompt that was already submitted on a previous attempt.
 *
 * @param sdk - Connected OpenCode client wrapper.
 * @param sessionID - Session identifier.
 * @param prompt - Serialized prompt text.
 * @param lastReplyID - Latest assistant reply id already present in workflow state.
 * @returns The recovered assistant reply, when one is already running or completed.
 */
const tryReconnectToExistingPrompt = async (
    sdk: OpenCodeConnection,
    sessionID: string,
    prompt: string,
    lastReplyID: string | undefined,
): Promise<OpenCodeReply | undefined> => {
    if (!lastReplyID) {
        return undefined;
    }

    const messages = await readRelevantSessionMessages(sdk, sessionID, lastReplyID, true);

    if (!messages) {
        return undefined;
    }

    const snapshot = inspectPromptSnapshot(messages, prompt);

    if (!snapshot.hasMatchingUser) {
        return undefined;
    }

    return snapshot.reply ?? waitForPromptReply(sdk, sessionID, prompt, lastReplyID, true);
};

/**
 * Parses a string model identifier into provider and model ids.
 *
 * @param agent - OpenCode agent configuration.
 * @param override - Explicit model override.
 * @returns The resolved structured model descriptor.
 */
const resolveModel = (agent: AgentConfig, override: Model | undefined): Model | undefined => {
    if (override) {
        return override;
    }

    const slash = typeof agent.model === "string" ? agent.model.indexOf("/") : -1;

    if (slash <= 0 || typeof agent.model !== "string") {
        return undefined;
    }

    return {
        providerID: agent.model.slice(0, slash),
        modelID: agent.model.slice(slash + 1),
    };
};

/**
 * LangGraph-compatible node backed by a persistent OpenCode session.
 *
 * @param name - Stable node and agent name.
 * @param agent - OpenCode agent configuration.
 * @param options - Client and server overrides for the node.
 * @returns A LangGraph-compatible OpenCode node.
 */
export function createOpenCodeNode<
    State extends OpenCodeState = OpenCodeState,
    Context extends OpenCodeRuntimeContext = OpenCodeRuntimeContext,
>(
    name: string,
    agent: AgentConfig = {},
    options: OpenCodeNodeOptions = {},
): OpenCodeNode<State, Context> {
    const connection = createConnectionLoader(name, agent, options);
    const model = resolveModel(agent, options.model);
    const system = options.system ?? agent.prompt;
    const tools = options.tools ?? agent.tools;

    const invoke = async (state: State, runtime?: Runtime<Context>) => {
        const seen = getOpenCodeCursor(state.opencode, name) ?? 0;
        const count = seen > state.messages.length ? 0 : seen;
        const next = state.messages.slice(count);
        const lastReplyID = getLatestWorkflowReplyID(state.messages, name);

        if (next.length === 0) {
            return {};
        }

        const prompt = serializeMessagesForPrompt(next);

        if (!prompt) {
            return {
                opencode: mergeOpenCodeMemory(state.opencode, {
                    cursors: {
                        [name]: state.messages.length,
                    },
                }),
            };
        }

        const sdk = await connection.load(runtime);
        const parentID = getRuntimeContextValue(runtime, "parentSessionID") ?? options.parentID;
        const existingSessionID = getOpenCodeSessionID(state.opencode, name);
        const sessionID =
            existingSessionID ??
            unwrapResult(
                (await sdk.client.session.create({
                    body: {
                        parentID,
                        title: options.title ?? name,
                    },
                    responseStyle: "data",
                    throwOnError: true,
                })) as Result<{ id: string }>,
            ).id;

        const reply =
            (existingSessionID
                ? await tryReconnectToExistingPrompt(sdk, sessionID, prompt, lastReplyID)
                : undefined) ??
            (await (async () => {
                try {
                    return unwrapResult(
                        (await sdk.client.session.prompt({
                            path: {
                                id: sessionID,
                            },
                            body: {
                                ...(sdk.named ? { agent: name } : {}),
                                model,
                                system,
                                tools: tools ? { ...tools } : undefined,
                                parts: [
                                    {
                                        type: "text",
                                        text: prompt,
                                    },
                                ],
                            },
                            responseStyle: "data",
                            throwOnError: true,
                        })) as Result<OpenCodeReply>,
                    );
                } catch (error) {
                    try {
                        return await waitForPromptReply(sdk, sessionID, prompt, lastReplyID, false);
                    } catch {
                        throw error;
                    }
                }
            })());

        if (reply.info.error) {
            const errorData = reply.info.error.data;
            const message =
                typeof errorData === "object" &&
                errorData !== null &&
                "message" in errorData &&
                typeof errorData.message === "string"
                    ? errorData.message
                    : reply.info.error.name;
            throw new Error(message);
        }

        return {
            messages: [createOpenCodeReplyMessage(name, reply, sessionID)],
            opencode: mergeOpenCodeMemory(state.opencode, {
                cursors: {
                    [name]: state.messages.length,
                },
                sessions: {
                    [name]: sessionID,
                },
            }),
        };
    };

    return Object.assign(invoke, { close: connection.close });
}

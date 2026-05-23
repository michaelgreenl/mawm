import type { Runtime } from "@langchain/langgraph";
import type { AgentConfig } from "@opencode-ai/sdk";
import { getRuntimeContextValue } from "../../shared/runtime-context.js";
import { createConnectionLoader } from "./connection.js";
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
        const sessionID =
            getOpenCodeSessionID(state.opencode, name) ??
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

        const reply = unwrapResult(
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

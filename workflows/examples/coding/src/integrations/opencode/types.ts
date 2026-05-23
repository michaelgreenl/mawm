import type { AIMessage, BaseMessage } from "@langchain/core/messages";
import type { Runtime } from "@langchain/langgraph";
import type { AgentConfig, Config, OpencodeClient, ServerOptions } from "@opencode-ai/sdk";

export type Model = {
    readonly providerID: string;
    readonly modelID: string;
};

export interface OpenCodeMemory {
    readonly sessions?: Readonly<Record<string, string>>;
    readonly cursors?: Readonly<Record<string, number>>;
    readonly [key: string]: unknown;
}

export interface OpenCodeState {
    readonly messages: readonly BaseMessage[];
    readonly opencode?: OpenCodeMemory;
}

export interface OpenCodeNodeOptions {
    readonly client?: OpencodeClient;
    readonly authHeader?: string;
    readonly baseUrl?: string;
    readonly directory?: string;
    readonly server?: Omit<ServerOptions, "config">;
    readonly config?: Config;
    readonly title?: string;
    readonly parentID?: string;
    readonly system?: string;
    readonly model?: Model;
    readonly tools?: Record<string, boolean>;
}

export interface OpenCodeRuntimeContext {
    readonly targetRepoPath?: string;
    readonly initiativeBranch?: string;
    readonly opencodeBaseUrl?: string;
    readonly parentSessionID?: string;
    readonly [key: string]: unknown;
}

export interface OpenCodeNodeOutput {
    readonly messages: readonly AIMessage[];
    readonly opencode: OpenCodeMemory;
}

export interface OpenCodeNodeUpdate {
    readonly messages?: readonly AIMessage[];
    readonly opencode?: OpenCodeMemory;
}

export interface OpenCodeNode<
    State extends OpenCodeState = OpenCodeState,
    Context extends OpenCodeRuntimeContext = OpenCodeRuntimeContext,
> {
    (state: State, runtime?: Runtime<Context>): Promise<OpenCodeNodeUpdate>;
    close(): Promise<void>;
}

export interface OpenCodeReplyInfo {
    readonly cost?: unknown;
    readonly error?: {
        readonly data?: unknown;
        readonly name: string;
    };
    readonly finish?: unknown;
    readonly id: string;
    readonly modelID?: unknown;
    readonly providerID?: unknown;
    readonly tokens?: unknown;
}

export interface OpenCodeReply {
    readonly info: OpenCodeReplyInfo;
    readonly parts: unknown;
}

export type OpenCodeAgentConfig = AgentConfig;

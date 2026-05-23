import { Buffer } from "node:buffer";
import type { Runtime } from "@langchain/langgraph";
import {
    createOpencodeClient,
    createOpencodeServer,
    type AgentConfig,
    type OpencodeClient,
} from "@opencode-ai/sdk";
import { getRuntimeContextValue } from "../../shared/runtime-context.js";
import type { OpenCodeNodeOptions, OpenCodeRuntimeContext } from "./types.js";

export interface OpenCodeConnection {
    readonly client: OpencodeClient;
    readonly close: () => void | Promise<void>;
    readonly named: boolean;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4096;
const HEALTH_PATH = "/global/health";
const USER_KEY = "OPENCODE_SERVER_USERNAME";
const PASS_KEY = "OPENCODE_SERVER_PASSWORD";

/**
 * Provides a no-op close handler for shared or externally-managed clients.
 *
 * @returns A resolved promise.
 */
const noopClose = async (): Promise<void> => {};

/**
 * Resolves the authorization header for OpenCode requests.
 *
 * @param value - Explicit authorization header override.
 * @returns The header value, or `undefined` when authentication is unavailable.
 */
const resolveAuthHeader = (value: string | undefined): string | undefined => {
    if (value && value.trim().length > 0) {
        return value.trim();
    }

    const pass = process.env[PASS_KEY]?.trim();

    if (!pass) {
        return undefined;
    }

    const user = process.env[USER_KEY]?.trim() || "opencode";

    return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
};

/**
 * Creates an OpenCode client with optional directory and authorization settings.
 *
 * @param baseUrl - Server base URL.
 * @param directory - Working directory override.
 * @param authorization - Authorization header value.
 * @returns The configured OpenCode client.
 */
const createClient = (
    baseUrl: string,
    directory: string | undefined,
    authorization: string | undefined,
): OpencodeClient => {
    return createOpencodeClient({
        baseUrl,
        directory,
        ...(authorization
            ? {
                  headers: {
                      Authorization: authorization,
                  },
              }
            : {}),
    });
};

/**
 * Builds the shared server URL when a named shared port is configured.
 *
 * @param server - Optional OpenCode server configuration.
 * @returns The shared server URL, or `undefined` when shared mode is disabled.
 */
const getSharedServerUrl = (server: OpenCodeNodeOptions["server"]): string | undefined => {
    if (server?.port === 0) {
        return undefined;
    }

    return `http://${server?.hostname ?? DEFAULT_HOST}:${server?.port ?? DEFAULT_PORT}`;
};

/**
 * Checks whether an OpenCode server is reachable.
 *
 * @param url - Server URL to probe.
 * @param authorization - Optional authorization header.
 * @returns `true` when the server health endpoint responds successfully.
 */
const isServerReachable = async (
    url: string | undefined,
    authorization: string | undefined,
): Promise<boolean> => {
    if (!url) {
        return false;
    }

    try {
        const response = await fetch(`${url}${HEALTH_PATH}`, {
            ...(authorization
                ? {
                      headers: {
                          Authorization: authorization,
                      },
                  }
                : {}),
        });

        return response.ok;
    } catch {
        return false;
    }
};

/**
 * Detects whether an error indicates a port collision.
 *
 * @param error - Error thrown while starting a server.
 * @returns `true` when the error matches an address-in-use condition.
 */
const isPortBusy = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error);

    return /EADDRINUSE|address already in use/i.test(message);
};

/**
 * Creates a connection loader that manages shared and embedded OpenCode servers.
 *
 * @param name - Stable node and agent name.
 * @param agent - OpenCode agent configuration.
 * @param options - Client and server overrides for the node.
 * @returns The connection loader and shutdown hook.
 */
export const createConnectionLoader = <Context extends OpenCodeRuntimeContext>(
    name: string,
    agent: AgentConfig,
    options: OpenCodeNodeOptions,
) => {
    let embeddedConnection: Promise<OpenCodeConnection> | undefined;
    const remoteClients = new Map<string, OpencodeClient>();

    const load = async (runtime?: Runtime<Context>): Promise<OpenCodeConnection> => {
        if (options.client) {
            return {
                client: options.client,
                close: noopClose,
                named: false,
            };
        }

        const authorization = resolveAuthHeader(options.authHeader);
        const baseUrl = getRuntimeContextValue(runtime, "opencodeBaseUrl") ?? options.baseUrl;
        const directory = getRuntimeContextValue(runtime, "targetRepoPath") ?? options.directory;
        const sharedUrl = getSharedServerUrl(options.server);

        const connect = (url: string): OpenCodeConnection => {
            const key = `${url}\u0000${directory ?? ""}\u0000${authorization ?? ""}`;
            const cached = remoteClients.get(key);

            if (cached) {
                return {
                    client: cached,
                    close: noopClose,
                    named: false,
                };
            }

            const remote = createClient(url, directory, authorization);
            remoteClients.set(key, remote);

            return {
                client: remote,
                close: noopClose,
                named: false,
            };
        };

        const startEmbeddedConnection = async (): Promise<OpenCodeConnection> => {
            try {
                const server = await createOpencodeServer({
                    ...options.server,
                    port: options.server?.port ?? 0,
                    config: {
                        ...(options.config ?? {}),
                        agent: {
                            ...(options.config?.agent ?? {}),
                            [name]: {
                                ...(options.config?.agent?.[name] ?? {}),
                                ...agent,
                            },
                        },
                    },
                });

                return {
                    client: createClient(server.url, directory, authorization),
                    close: server.close,
                    named: true,
                };
            } catch (error) {
                if (
                    sharedUrl &&
                    isPortBusy(error) &&
                    (await isServerReachable(sharedUrl, authorization))
                ) {
                    return connect(sharedUrl);
                }

                throw error;
            }
        };

        const resetEmbeddedConnection = (error: unknown): never => {
            embeddedConnection = undefined;
            throw error;
        };

        if (baseUrl) {
            return connect(baseUrl);
        }

        if (sharedUrl && (await isServerReachable(sharedUrl, authorization))) {
            return connect(sharedUrl);
        }

        if (embeddedConnection) {
            return embeddedConnection;
        }

        embeddedConnection = startEmbeddedConnection().catch(resetEmbeddedConnection);

        return embeddedConnection;
    };

    const close = async (): Promise<void> => {
        if (!embeddedConnection) {
            return;
        }

        const connection = await embeddedConnection;
        embeddedConnection = undefined;
        await connection.close();
    };

    return {
        load,
        close,
    };
};

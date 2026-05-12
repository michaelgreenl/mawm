import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

export type InteractiveSession = {
    nodeName: string;
    sessionID: string;
    serverUrl: string;
    attachCommand: string[];
    auth?: {
        username: string;
        passwordEnvVar: "OPENCODE_SERVER_PASSWORD";
    };
};

export type InteractiveSessionManager = {
    ensureSession(nodeName: string, threadID: string): Promise<InteractiveSession>;
    closeSession(threadID: string, nodeName: string): Promise<void>;
    closeAllSessions(): Promise<void>;
};

type AuthInfo = {
    username: string;
    password: string;
};

type ServerHandle = {
    url: string;
    close(): Promise<void>;
};

type AuthHeaders = Record<string, string>;

type SessionRecord = {
    id: string;
};

type InteractiveSessionRuntime = {
    cwd: string;
    env: NodeJS.ProcessEnv;
    getFreePort(): Promise<number>;
    startServer(port: number, authHeaders?: AuthHeaders): Promise<ServerHandle>;
    createSession(
        serverUrl: string,
        nodeName: string,
        authHeaders?: AuthHeaders,
    ): Promise<SessionRecord>;
};

type ActiveSession = {
    session: InteractiveSession;
    closeServer(): Promise<void>;
};

function sleep(ms: number) {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getSessionKey(threadID: string, nodeName: string) {
    return `${threadID}:${nodeName}`;
}

function getAuthInfo(env: NodeJS.ProcessEnv): AuthInfo | undefined {
    const password = env["OPENCODE_SERVER_PASSWORD"];

    if (!password) {
        return undefined;
    }

    return {
        username: env["OPENCODE_SERVER_USERNAME"] ?? "opencode",
        password,
    };
}

function getAuthHeaders(env: NodeJS.ProcessEnv) {
    const auth = getAuthInfo(env);

    if (!auth) {
        return undefined;
    }

    return {
        Authorization:
            "Basic " + Buffer.from(`${auth.username}:${auth.password}`).toString("base64"),
    };
}

function buildAttachCommand(serverUrl: string, sessionID: string) {
    return ["opencode", "attach", serverUrl, "--session", sessionID];
}

function buildSessionMetadata(
    env: NodeJS.ProcessEnv,
    nodeName: string,
    serverUrl: string,
    sessionID: string,
): InteractiveSession {
    const auth = getAuthInfo(env);

    return {
        nodeName,
        sessionID,
        serverUrl,
        attachCommand: buildAttachCommand(serverUrl, sessionID),
        auth: auth
            ? {
                  username: auth.username,
                  passwordEnvVar: "OPENCODE_SERVER_PASSWORD",
              }
            : undefined,
    };
}

async function getFreePort() {
    return await new Promise<number>((resolve, reject) => {
        const server = createServer();

        server.listen(0, "127.0.0.1", () => {
            const address = server.address();

            if (!address || typeof address === "string") {
                reject(new Error("Failed to allocate a local port."));
                return;
            }

            server.close(() => resolve(address.port));
        });

        server.on("error", reject);
    });
}

async function closeChildProcess(child: ReturnType<typeof spawn>, exitTask: Promise<void>) {
    if (child.exitCode !== null) {
        await exitTask.catch(() => undefined);
        return;
    }

    child.kill("SIGTERM");

    const exited = await Promise.race([
        exitTask.then(() => true).catch(() => true),
        sleep(1_000).then(() => false),
    ]);

    if (!exited && child.exitCode === null) {
        child.kill("SIGKILL");
        await exitTask.catch(() => undefined);
    }
}

async function waitForServerReady(child: ReturnType<typeof spawn>, url: string) {
    await new Promise<void>((resolve, reject) => {
        const stdout = child.stdout;
        const stderr = child.stderr;
        let stderrBuffer = "";

        const cleanup = () => {
            stdout?.off("data", onStdout);
            stderr?.off("data", onStderr);
            child.off("exit", onExit);
            child.off("error", onError);
            clearTimeout(timeout);
        };

        const finish = (error?: Error) => {
            cleanup();

            if (error) {
                reject(error);
                return;
            }

            resolve();
        };

        const onStdout = (chunk: Buffer) => {
            if (chunk.toString().includes(url)) {
                finish();
            }
        };

        const onStderr = (chunk: Buffer) => {
            stderrBuffer += chunk.toString();
        };

        const onExit = () => {
            const details = stderrBuffer.trim();

            finish(
                new Error(
                    details
                        ? `OpenCode server exited before it was ready: ${details}`
                        : "OpenCode server exited before it was ready.",
                ),
            );
        };

        const onError = (error: Error) => {
            finish(error);
        };

        const timeout = setTimeout(() => {
            finish(new Error("Timed out waiting for the OpenCode server to start."));
        }, 5_000);

        stdout?.on("data", onStdout);
        stderr?.on("data", onStderr);
        child.once("exit", onExit);
        child.once("error", onError);
    });
}

async function startServer(
    cwd: string,
    env: NodeJS.ProcessEnv,
    port: number,
): Promise<ServerHandle> {
    const child = spawn("opencode", ["serve", "--hostname", "127.0.0.1", "--port", String(port)], {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
    });
    const url = `http://127.0.0.1:${port}`;
    const exitTask = new Promise<void>((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", () => resolve());
    });

    try {
        await waitForServerReady(child, url);
    } catch (error) {
        await closeChildProcess(child, exitTask);
        throw error;
    }

    return {
        url,
        async close() {
            await closeChildProcess(child, exitTask);
        },
    };
}

async function readSessionID(response: Response) {
    const payload = (await response.json()) as {
        data?: { id?: string };
        id?: string;
    };
    const sessionID = payload.data?.id ?? payload.id;

    if (!sessionID) {
        throw new Error("OpenCode session response did not include a session ID.");
    }

    return sessionID;
}

async function seedSessionAgent(
    serverUrl: string,
    sessionID: string,
    nodeName: string,
    authHeaders?: AuthHeaders,
) {
    const response = await fetch(`${serverUrl}/session/${sessionID}/message`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...authHeaders,
        },
        body: JSON.stringify({
            agent: nodeName,
            noReply: true,
            parts: [
                {
                    type: "text",
                    text: `${nodeName} session initialized for LangGraph.`,
                },
            ],
        }),
        signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
        return;
    }

    const body = await response.text();

    throw new Error(
        `Failed to prime the OpenCode ${nodeName} session (${response.status} ${response.statusText}). ${body}`.trim(),
    );
}

async function createSession(serverUrl: string, nodeName: string, authHeaders?: AuthHeaders) {
    const response = await fetch(`${serverUrl}/session`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...authHeaders,
        },
        body: JSON.stringify({
            title: `LangGraph node: ${nodeName}`,
        }),
        signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `Failed to create the OpenCode ${nodeName} session (${response.status} ${response.statusText}). ${body}`.trim(),
        );
    }

    const sessionID = await readSessionID(response);

    await seedSessionAgent(serverUrl, sessionID, nodeName, authHeaders);

    return { id: sessionID };
}

export function createInteractiveSessionManager(
    runtime: InteractiveSessionRuntime,
): InteractiveSessionManager {
    const activeSessions = new Map<string, ActiveSession>();

    return {
        async ensureSession(nodeName, threadID) {
            const key = getSessionKey(threadID, nodeName);
            const existing = activeSessions.get(key);

            if (existing) {
                return existing.session;
            }

            const authHeaders = getAuthHeaders(runtime.env);
            const port = await runtime.getFreePort();
            const server = await runtime.startServer(port, authHeaders);

            try {
                const session = await runtime.createSession(server.url, nodeName, authHeaders);
                const metadata = buildSessionMetadata(
                    runtime.env,
                    nodeName,
                    server.url,
                    session.id,
                );

                activeSessions.set(key, {
                    session: metadata,
                    closeServer: server.close,
                });

                return metadata;
            } catch (error) {
                await server.close().catch(() => undefined);
                throw error;
            }
        },
        async closeSession(threadID, nodeName) {
            const key = getSessionKey(threadID, nodeName);
            const active = activeSessions.get(key);

            if (!active) {
                return;
            }

            activeSessions.delete(key);
            await active.closeServer().catch(() => undefined);
        },
        async closeAllSessions() {
            const sessions = [...activeSessions.values()];

            activeSessions.clear();

            await Promise.all(
                sessions.map(async (session) => {
                    await session.closeServer().catch(() => undefined);
                }),
            );
        },
    };
}

export const interactiveSessionManager = createInteractiveSessionManager({
    cwd: process.cwd(),
    env: process.env,
    getFreePort,
    startServer: async (port) => await startServer(process.cwd(), process.env, port),
    createSession,
});

import type { RunnableConfig } from "@langchain/core/runnables";
import type { BaseMessageLike } from "@langchain/core/messages";
import { interrupt } from "@langchain/langgraph";

import {
    interactiveSessionManager,
    type InteractiveSession,
    type InteractiveSessionManager,
} from "../../opencode/session-manager.ts";

type InteractiveResume = {
    phasePlanPath?: string;
    brief?: string;
    startStep?: number;
    messages?: BaseMessageLike[];
};

type InteractiveNodeUpdate = {
    phasePlanPath?: string;
    brief?: string;
    startStep?: number;
    messages?: BaseMessageLike[];
};

function getThreadID(config?: RunnableConfig) {
    const threadID = config?.configurable?.["thread_id"];

    if (typeof threadID !== "string" || threadID.length === 0) {
        throw new Error(
            "Interactive nodes require config.configurable.thread_id so the OpenCode session can be resumed cleanly.",
        );
    }

    return threadID;
}

function buildInterruptValue(session: InteractiveSession) {
    return {
        type: "opencode-session",
        nodeName: session.nodeName,
        sessionID: session.sessionID,
        serverUrl: session.serverUrl,
        attachCommand: session.attachCommand,
        auth: session.auth,
    };
}

function normalizeResumeUpdate(resume: InteractiveResume | string | undefined) {
    if (resume === undefined) {
        return {};
    }

    if (typeof resume === "string") {
        return {
            messages: [{ role: "human", content: resume }],
        };
    }

    return {
        ...(resume.phasePlanPath !== undefined ? { phasePlanPath: resume.phasePlanPath } : {}),
        ...(resume.brief !== undefined ? { brief: resume.brief } : {}),
        ...(resume.startStep !== undefined ? { startStep: resume.startStep } : {}),
        ...(resume.messages !== undefined ? { messages: resume.messages } : {}),
    };
}

export function createInteractiveNode(
    nodeName: string,
    sessionManager: InteractiveSessionManager = interactiveSessionManager,
): (_state: unknown, config?: RunnableConfig) => Promise<InteractiveNodeUpdate> {
    return async (_state, config) => {
        const threadID = getThreadID(config);
        const session = await sessionManager.ensureSession(nodeName, threadID);
        const resume = interrupt(buildInterruptValue(session)) as
            | InteractiveResume
            | string
            | undefined;

        await sessionManager.closeSession(threadID, nodeName);

        return normalizeResumeUpdate(resume);
    };
}

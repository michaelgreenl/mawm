import type { RunnableConfig } from "@langchain/core/runnables";
import type { BaseMessageLike } from "@langchain/core/messages";
import { interrupt } from "@langchain/langgraph";

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

type InteractiveSessionRequest = {
    type: "opencode-session";
    nodeName: string;
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

function buildInterruptValue(nodeName: string): InteractiveSessionRequest {
    return {
        type: "opencode-session",
        nodeName,
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
): (_state: unknown, config?: RunnableConfig) => Promise<InteractiveNodeUpdate> {
    return async (_state, config) => {
        getThreadID(config);

        const resume = interrupt(buildInterruptValue(nodeName)) as
            | InteractiveResume
            | string
            | undefined;

        return normalizeResumeUpdate(resume);
    };
}

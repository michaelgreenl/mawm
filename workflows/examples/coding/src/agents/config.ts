import type { AgentConfig } from "@opencode-ai/sdk";

const commonTools = {
    bash: true,
    glob: true,
    grep: true,
    list: true,
    read: true,
    task: true,
} as const;

const commonPermission = {
    bash: "allow",
    glob: "allow",
    grep: "allow",
    list: "allow",
    read: "allow",
    task: {
        explore: "allow",
    },
} as const;

/**
 * Creates the OpenCode agent configuration for workflow agents.
 *
 * @param canEdit - Whether the agent should be allowed to edit files.
 * @returns The workflow agent configuration.
 */
export const createWorkflowAgentConfig = (canEdit: boolean): AgentConfig => {
    return {
        model: "openai/gpt-5.4",
        permission: {
            ...commonPermission,
            edit: canEdit ? "allow" : "deny",
        } as unknown as AgentConfig["permission"],
        tools: {
            ...commonTools,
            edit: canEdit,
        },
    };
};

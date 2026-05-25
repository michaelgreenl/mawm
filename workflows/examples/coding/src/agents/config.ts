import type { AgentConfig } from "@opencode-ai/sdk/v2";

type WorkflowPermissionMode = "ask" | "allow" | "deny";

export type WorkflowSkillPermissions = Readonly<Record<string, WorkflowPermissionMode>>;

const commonTools = {
    bash: true,
    glob: true,
    grep: true,
    list: true,
    read: true,
    webfetch: true,
    task: true,
} as const;

const commonPermission = {
    bash: "allow",
    glob: "allow",
    grep: "allow",
    list: "allow",
    read: "allow",
    webfetch: "allow",
    task: {
        explore: "allow",
    },
} as const;

const commonSkillPermissions = {
    "*": "deny",
} as const;

/**
 * Creates the OpenCode agent configuration for workflow agents.
 *
 * @param canEdit - Whether the agent should be allowed to edit files.
 * @param skillPermissions - Agent-specific skill permission overrides.
 * @returns The workflow agent configuration.
 */
export const createWorkflowAgentConfig = (
    model: string,
    variant: string | undefined,
    canEdit: boolean,
    skillPermissions: WorkflowSkillPermissions = {},
): AgentConfig => {
    const resolvedSkillPermissions = {
        ...commonSkillPermissions,
        ...skillPermissions,
    };
    const canUseSkillTool = Object.values(resolvedSkillPermissions).some(
        (permission) => permission !== "deny",
    );

    return {
        model,
        variant,
        permission: {
            ...commonPermission,
            edit: canEdit ? "allow" : "deny",
            skill: resolvedSkillPermissions,
        } as unknown as AgentConfig["permission"],
        tools: {
            ...commonTools,
            edit: canEdit,
            skill: canUseSkillTool,
        },
    };
};

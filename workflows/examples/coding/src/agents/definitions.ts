import { createOpenCodeNode } from "../integrations/opencode/node.js";
import { createWorkflowAgentConfig, type WorkflowSkillPermissions } from "./config.js";
import { agentPrompts } from "./prompts.js";

export interface WorkflowAgentDefinition {
    readonly name: string;
    readonly canEdit: boolean;
    readonly prompt: string;
    readonly skillPermissions?: WorkflowSkillPermissions;
}

/**
 * Shared workflow agent definitions used by graph phases.
 */
export const workflowAgentDefinitions = {
    planner: {
        name: "planner",
        canEdit: true,
        prompt: agentPrompts.planner,
    },
    planReviewer: {
        name: "plan-reviewer",
        canEdit: false,
        prompt: agentPrompts.planReviewer,
    },
    coder: {
        name: "coder",
        canEdit: true,
        prompt: agentPrompts.coder,
        skillPermissions: { tdd: "allow" },
    },
    codeReviewer: {
        name: "code-reviewer",
        canEdit: false,
        prompt: agentPrompts.codeReviewer,
    },
} as const satisfies Record<string, WorkflowAgentDefinition>;

/**
 * Builds an OpenCode-backed workflow agent node from a shared definition.
 */
const createWorkflowAgentNode = (definition: WorkflowAgentDefinition) => {
    return createOpenCodeNode(
        definition.name,
        createWorkflowAgentConfig(definition.canEdit, definition.skillPermissions),
        {
            system: definition.prompt,
        },
    );
};

/**
 * Instantiates OpenCode-backed workflow agent nodes from the shared definitions.
 */
export const workflowAgentNodes = {
    planner: createWorkflowAgentNode(workflowAgentDefinitions.planner),
    planReviewer: createWorkflowAgentNode(workflowAgentDefinitions.planReviewer),
    coder: createWorkflowAgentNode(workflowAgentDefinitions.coder),
    codeReviewer: createWorkflowAgentNode(workflowAgentDefinitions.codeReviewer),
} as const;

export type WorkflowAgentRole = keyof typeof workflowAgentDefinitions;

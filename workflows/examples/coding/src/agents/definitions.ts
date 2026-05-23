import { createOpenCodeNode } from "../integrations/opencode/node.js";
import { createWorkflowAgentConfig } from "./config.js";
import { agentPrompts } from "./prompts.js";

export interface WorkflowAgentDefinition {
    readonly name: string;
    readonly canEdit: boolean;
    readonly prompt: string;
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
    },
    codeReviewer: {
        name: "code-reviewer",
        canEdit: false,
        prompt: agentPrompts.codeReviewer,
    },
} as const satisfies Record<string, WorkflowAgentDefinition>;

/**
 * Instantiates OpenCode-backed workflow agent nodes from the shared definitions.
 */
export const workflowAgentNodes = {
    planner: createOpenCodeNode(
        workflowAgentDefinitions.planner.name,
        createWorkflowAgentConfig(workflowAgentDefinitions.planner.canEdit),
        {
            system: workflowAgentDefinitions.planner.prompt,
        },
    ),
    planReviewer: createOpenCodeNode(
        workflowAgentDefinitions.planReviewer.name,
        createWorkflowAgentConfig(workflowAgentDefinitions.planReviewer.canEdit),
        {
            system: workflowAgentDefinitions.planReviewer.prompt,
        },
    ),
    coder: createOpenCodeNode(
        workflowAgentDefinitions.coder.name,
        createWorkflowAgentConfig(workflowAgentDefinitions.coder.canEdit),
        {
            system: workflowAgentDefinitions.coder.prompt,
        },
    ),
    codeReviewer: createOpenCodeNode(
        workflowAgentDefinitions.codeReviewer.name,
        createWorkflowAgentConfig(workflowAgentDefinitions.codeReviewer.canEdit),
        {
            system: workflowAgentDefinitions.codeReviewer.prompt,
        },
    ),
} as const;

export type WorkflowAgentRole = keyof typeof workflowAgentDefinitions;

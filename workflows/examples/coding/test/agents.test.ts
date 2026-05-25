import { describe, expect, test } from "bun:test";
import { createWorkflowAgentConfig } from "../src/agents/config.ts";
import { workflowAgentDefinitions } from "../src/agents/definitions.ts";
import { agentPrompts } from "../src/agents/prompts.ts";

describe("workflow agent prompts", () => {
    test("includes the shared Bun runtime guidance in planner prompts", () => {
        expect(agentPrompts.planner).toContain("You are the planner agent for the coding workflow.");
        expect(agentPrompts.planner).toContain("Bun is the **package manager, script runner, and build tool**");
    });

    test("uses Bun's test runner guidance in coder prompts", () => {
        expect(agentPrompts.coder).toContain('import { describe, expect, test } from "bun:test";');
        expect(agentPrompts.coder).not.toContain('from "vitest"');
    });
});

describe("workflow agent definitions", () => {
    test("assigns edit permissions by role", () => {
        expect(workflowAgentDefinitions.planner.canEdit).toBe(true);
        expect(workflowAgentDefinitions.coder.canEdit).toBe(true);
        expect(workflowAgentDefinitions.planReviewer.canEdit).toBe(false);
        expect(workflowAgentDefinitions.codeReviewer.canEdit).toBe(false);
    });

    test("keeps role prompts aligned with the assembled prompt registry", () => {
        expect(workflowAgentDefinitions.planner.prompt).toBe(agentPrompts.planner);
        expect(workflowAgentDefinitions.codeReviewer.prompt).toBe(agentPrompts.codeReviewer);
    });
});

describe("workflow agent config", () => {
    test("keeps skills disabled when no agent skill permissions are configured", () => {
        const config = createWorkflowAgentConfig(false);

        expect(config.tools?.skill).toBe(false);
        expect(config.permission).toMatchObject({
            edit: "deny",
            skill: {
                "*": "deny",
            },
        });
    });

    test("enables the skill tool when agent-specific skill permissions are added", () => {
        const config = createWorkflowAgentConfig(true, {
            "vue-best-practices": "allow",
        });

        expect(config.tools?.skill).toBe(true);
        expect(config.permission).toMatchObject({
            edit: "allow",
            skill: {
                "*": "deny",
                "vue-best-practices": "allow",
            },
        });
    });
});

import { describe, expect, test } from "bun:test";
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

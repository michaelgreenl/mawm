import { describe, expect, test } from "bun:test";
import { createWorkflowAgentConfig } from "../src/agents/config.ts";
import { workflowAgentDefinitions } from "../src/agents/definitions.ts";
import { agentPrompts } from "../src/agents/prompts.ts";

describe("workflow agent prompts", () => {
    test("includes the shared Bun runtime guidance in planner prompts", () => {
        expect(agentPrompts.planner).toContain(
            "You are the planner agent for the coding workflow.",
        );
        expect(agentPrompts.planner).toContain(
            "Bun is the **package manager, script runner, and build tool**",
        );
    });

    test("uses Bun's test runner guidance in coder prompts", () => {
        expect(agentPrompts.coder).toContain('import { describe, expect, test } from "bun:test";');
        expect(agentPrompts.coder).not.toContain('from "vitest"');
    });
});

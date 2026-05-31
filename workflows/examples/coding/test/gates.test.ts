import { END } from "@langchain/langgraph";
import { describe, expect, mock, test } from "bun:test";
import { implementationGate } from "../src/graph/phases/implementing/gate.ts";
import { planningGate } from "../src/graph/phases/planning/gate.ts";
import type { WorkflowState } from "../src/graph/state.ts";

const createState = (overrides: Partial<WorkflowState> = {}): WorkflowState => {
    return {
        finalStatus: undefined,
        implementationDecision: undefined,
        implementationRevisionCount: 0,
        implementationRevisions: undefined,
        implementationSummary: undefined,
        initiativeSpecPath: "initiative.md",
        manualSmokeInstructions: undefined,
        messages: [],
        opencode: undefined,
        planningDecision: undefined,
        planningRevisionCount: 0,
        planningRevisions: undefined,
        planningSummary: undefined,
        runSpecPath: "run.md",
        selectedRunLabel: undefined,
        verificationSummary: undefined,
        ...overrides,
    };
};

describe("workflow gates", () => {
    test("routes accepted planning to implementation without interrupting", () => {
        const interrupt = mock(() => undefined);
        const command = planningGate(
            createState({
                planningDecision: "accept",
            }),
            { interrupt } as never,
        );

        expect(command.goto).toEqual(["implementing"]);
        expect(interrupt).not.toHaveBeenCalled();
    });

    test("interrupts when planning is blocked", () => {
        const interrupt = mock(() => undefined);
        const command = planningGate(
            createState({
                planningDecision: "blocked",
                planningRevisions: "Add contracts and risks.",
                planningSummary: "Run spec is not implementation ready.",
                selectedRunLabel: "Run 1",
            }),
            { interrupt } as never,
        );

        expect(command.goto).toEqual([END]);
        expect(interrupt).toHaveBeenCalledWith({
            kind: "planning_blocked",
            revisions: "Add contracts and risks.",
            runSpecPath: "run.md",
            selectedRunLabel: "Run 1",
            summary: "Run spec is not implementation ready.",
        });
    });

    test("marks accepted implementation as completed", () => {
        const interrupt = mock(() => undefined);
        const command = implementationGate(
            createState({
                implementationDecision: "accept",
            }),
            { interrupt } as never,
        );

        expect(command.goto).toEqual([END]);
        expect(command.update).toEqual({
            finalStatus: "completed",
        });
        expect(interrupt).not.toHaveBeenCalled();
    });

    test("completes manual smoke runs when the human confirms them", () => {
        const interrupt = mock(() => ({ decision: "confirmed", summary: "Confirmed in the browser." }));
        const command = implementationGate(
            createState({
                implementationDecision: "manual_smoke",
                implementationSummary: "Needs a manual check.",
                manualSmokeInstructions: "Open the app and verify the banner.",
                verificationSummary: "bun test passed",
            }),
            { interrupt } as never,
        );

        expect(command.goto).toEqual([END]);
        expect(command.update).toEqual({
            finalStatus: "completed",
            verificationSummary: "bun test passed\n\nManual smoke verification: Confirmed in the browser.",
        });
    });

    test("routes failed manual smoke runs back to implementation", () => {
        const interrupt = mock(() => ({ decision: "failed", summary: "Save banner never appeared." }));
        const command = implementationGate(
            createState({
                implementationDecision: "manual_smoke",
                implementationSummary: "Needs a manual check.",
                manualSmokeInstructions: "Open the app and verify the banner.",
            }),
            { interrupt } as never,
        );

        expect(command.goto).toEqual(["implementing"]);
        expect(command.update).toEqual({
            implementationDecision: undefined,
            implementationRevisions: "Save banner never appeared.",
            manualSmokeInstructions: undefined,
        });
    });
});

import { describe, expect, test } from "bun:test";
import { implementationGate, planningGate } from "../src/graph/gates.ts";

describe("initiative template gates", () => {
    test("interrupts blocked planning", () => {
        const values: unknown[] = [];
        const command = planningGate(
            {
                finalStatus: undefined,
                implementationDecision: undefined,
                implementationRevisionCount: 0,
                implementationRevisions: undefined,
                implementationSummary: undefined,
                initiativeSpecPath: "initiative.md",
                manualSmokeInstructions: undefined,
                planningDecision: "blocked",
                planningRevisionCount: 0,
                planningRevisions: "Add the missing task section.",
                planningSummary: "Planning is blocked.",
                runSpecPath: "run.md",
                selectedRunLabel: "Run 1",
                verificationSummary: undefined,
            },
            {
                interrupt: (value: unknown) => {
                    values.push(value);
                    return undefined;
                },
            } as never,
        );

        expect(command.goto).toEqual(["__end__"]);
        expect(values).toEqual([
            {
                kind: "planning_blocked",
                revisions: "Add the missing task section.",
                runSpecPath: "run.md",
                selectedRunLabel: "Run 1",
                summary: "Planning is blocked.",
            },
        ]);
    });

    test("requires confirmation to complete manual smoke verification", () => {
        const command = implementationGate(
            {
                finalStatus: undefined,
                implementationDecision: "manual_smoke",
                implementationRevisionCount: 0,
                implementationRevisions: undefined,
                implementationSummary: "Needs a manual check.",
                initiativeSpecPath: "initiative.md",
                manualSmokeInstructions: "Open the app and confirm the save banner.",
                planningDecision: "accept",
                planningRevisionCount: 0,
                planningRevisions: undefined,
                planningSummary: undefined,
                runSpecPath: "run.md",
                selectedRunLabel: "Run 1",
                verificationSummary: "Planned verification commands:\n- bun test",
            },
            {
                interrupt: () => ({
                    decision: "confirmed",
                    summary: "Confirmed in the browser.",
                }),
            } as never,
        );

        expect(command.goto).toEqual(["__end__"]);
        expect(command.update).toEqual({
            finalStatus: "completed",
            verificationSummary:
                "Planned verification commands:\n- bun test\n\nManual smoke verification: Confirmed in the browser.",
        });
    });
});

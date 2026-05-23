import { Command, END } from "@langchain/langgraph";
import type { Runtime } from "@langchain/langgraph";
import type { WorkflowContext, WorkflowState } from "./state.js";

const append = (left: string | undefined, right: string | undefined) => {
    if (!right) {
        return left;
    }

    if (!left) {
        return `Manual smoke verification: ${right}`;
    }

    return `${left}\n\nManual smoke verification: ${right}`;
};

const interrupt = (runtime: Runtime<WorkflowContext>) => {
    if (!runtime.interrupt) {
        throw new Error("LangGraph runtime interrupt helper is unavailable.");
    }

    return runtime.interrupt;
};

export const planningGate = (state: WorkflowState, runtime: Runtime<WorkflowContext>) => {
    if (state.planningDecision === "accept") {
        return new Command({
            goto: "implementing",
        });
    }

    interrupt(runtime)({
        kind: "planning_blocked",
        revisions: state.planningRevisions,
        runSpecPath: state.runSpecPath,
        selectedRunLabel: state.selectedRunLabel,
        summary: state.planningSummary ?? "Planning did not produce an accepted run spec.",
    });

    return new Command({
        goto: END,
    });
};

export const implementationGate = (state: WorkflowState, runtime: Runtime<WorkflowContext>) => {
    if (state.implementationDecision === "accept") {
        return new Command({
            goto: END,
            update: {
                finalStatus: "completed",
            },
        });
    }

    if (state.implementationDecision === "revise") {
        return new Command({
            goto: "implementing",
            update: {
                implementationDecision: undefined,
                implementationRevisionCount: state.implementationRevisionCount + 1,
            },
        });
    }

    if (state.implementationDecision === "manual_smoke") {
        const resume = interrupt(runtime)({
            instructions: state.manualSmokeInstructions,
            kind: "manual_smoke",
            runSpecPath: state.runSpecPath,
            selectedRunLabel: state.selectedRunLabel,
            summary: state.implementationSummary ?? "Manual smoke verification is required.",
            verificationSummary: state.verificationSummary,
        });
        const decision =
            typeof resume === "object" && resume !== null && "decision" in resume
                ? resume.decision
                : undefined;
        const summary =
            typeof resume === "object" && resume !== null && "summary" in resume
                ? resume.summary
                : undefined;

        if (decision === "confirmed") {
            return new Command({
                goto: END,
                update: {
                    finalStatus: "completed",
                    verificationSummary: append(
                        state.verificationSummary,
                        typeof summary === "string" ? summary.trim() : undefined,
                    ),
                },
            });
        }

        if (decision === "failed") {
            return new Command({
                goto: "implementing",
                update: {
                    implementationDecision: undefined,
                    implementationRevisionCount: state.implementationRevisionCount + 1,
                    implementationRevisions:
                        typeof summary === "string" && summary.trim().length > 0
                            ? summary.trim()
                            : "Manual smoke verification failed.",
                    manualSmokeInstructions: undefined,
                },
            });
        }

        throw new Error(
            "Manual smoke resume payload must be an object with decision `confirmed` or `failed`.",
        );
    }

    interrupt(runtime)({
        kind: "implementation_blocked",
        revisions: state.implementationRevisions,
        runSpecPath: state.runSpecPath,
        selectedRunLabel: state.selectedRunLabel,
        summary:
            state.implementationSummary ?? "Implementation did not produce an accepted result.",
        verificationSummary: state.verificationSummary,
    });

    return new Command({
        goto: END,
    });
};

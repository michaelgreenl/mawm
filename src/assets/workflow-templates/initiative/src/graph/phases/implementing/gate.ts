import { Command, END } from "@langchain/langgraph";
import type { Runtime } from "@langchain/langgraph";
import type { WorkflowContext, WorkflowState } from "../../state.js";

const appendVerificationSummary = (left: string | undefined, right: string | undefined) => {
    if (!right) {
        return left;
    }

    if (!left) {
        return `Manual smoke verification: ${right}`;
    }

    return `${left}\n\nManual smoke verification: ${right}`;
};

const requireInterrupt = (runtime: Runtime<WorkflowContext>) => {
    if (!runtime.interrupt) {
        throw new Error("LangGraph runtime interrupt helper is unavailable.");
    }

    return runtime.interrupt;
};

/** Route implementation outcomes, including manual smoke resume handling. */
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
        const resume = requireInterrupt(runtime)({
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
                    verificationSummary: appendVerificationSummary(
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

    requireInterrupt(runtime)({
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

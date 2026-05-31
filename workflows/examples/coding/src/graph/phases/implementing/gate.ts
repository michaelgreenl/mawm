import { Command, END } from "@langchain/langgraph";
import type { Runtime } from "@langchain/langgraph";
import { requireInterrupt } from "../../../shared/runtime-context.js";
import type { WorkflowContext, WorkflowState } from "../../state.js";

/**
 * Appends a manual smoke verification note to an existing verification summary.
 *
 * @param existing - Existing verification summary.
 * @param summary - Manual smoke summary to append.
 * @returns The combined verification summary.
 */
const appendVerificationSummary = (existing: string | undefined, summary: string | undefined) => {
    if (!summary) {
        return existing;
    }

    if (!existing) {
        return `Manual smoke verification: ${summary}`;
    }

    return `${existing}\n\nManual smoke verification: ${summary}`;
};

/**
 * Routes the workflow after implementation, including manual smoke interrupts.
 *
 * @param state - Current workflow state.
 * @param runtime - LangGraph runtime.
 * @returns A command directing the next top-level node.
 */
export const implementationGate = (state: WorkflowState, runtime: Runtime<WorkflowContext>) => {
    if (state.implementationDecision === "accept") {
        return new Command({
            goto: END,
            update: {
                finalStatus: "completed",
            },
        });
    }

    if (state.implementationDecision === "manual_smoke") {
        const resume = requireInterrupt(runtime)({
            kind: "manual_smoke",
            instructions: state.manualSmokeInstructions,
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

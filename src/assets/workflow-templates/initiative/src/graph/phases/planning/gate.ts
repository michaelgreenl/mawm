import { Command, END } from "@langchain/langgraph";
import type { Runtime } from "@langchain/langgraph";
import type { WorkflowContext, WorkflowState } from "../../state.js";

const requireInterrupt = (runtime: Runtime<WorkflowContext>) => {
    if (!runtime.interrupt) {
        throw new Error("LangGraph runtime interrupt helper is unavailable.");
    }

    return runtime.interrupt;
};

/** Route planning outcomes to implementation or emit a planning interrupt. */
export const planningGate = (state: WorkflowState, runtime: Runtime<WorkflowContext>) => {
    if (state.planningDecision === "accept") {
        return new Command({
            goto: "implementing",
        });
    }

    requireInterrupt(runtime)({
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

import { Command, END } from "@langchain/langgraph";
import type { Runtime } from "@langchain/langgraph";
import { requireInterrupt } from "../../../shared/runtime-context.js";
import type { WorkflowContext, WorkflowState } from "../../state.js";

/**
 * Routes the workflow after planning, interrupting when planning is blocked.
 *
 * @param state - Current workflow state.
 * @param runtime - LangGraph runtime.
 * @returns A command directing the next top-level node.
 */
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

import type { Runtime } from "@langchain/langgraph";
import { implementingSubGraph } from "./subgraphs/implementing.js";
import { planningSubGraph } from "./subgraphs/planning.js";
import type { WorkflowContext, WorkflowState, WorkflowUpdate } from "./state.js";

/**
 * Returns only the messages appended by a subgraph invocation.
 *
 * @param before - State before invoking the subgraph.
 * @param after - State returned by the subgraph.
 * @returns The newly appended messages.
 */
const messageDelta = (before: WorkflowState, after: WorkflowState) => {
    const seen = before.messages.length;

    return after.messages.slice(seen > after.messages.length ? 0 : seen);
};

/**
 * Invokes the planning subgraph and projects its result into the parent graph update.
 *
 * @param state - Current workflow state.
 * @param runtime - LangGraph runtime.
 * @returns The planning update for the parent graph.
 */
export const invokePlanning = async (
    state: WorkflowState,
    runtime: Runtime<WorkflowContext>,
): Promise<WorkflowUpdate> => {
    const next = await planningSubGraph.invoke(state, {
        configurable: runtime.configurable,
        context: runtime.context,
        signal: runtime.signal,
    });

    return {
        messages: messageDelta(state, next),
        opencode: next.opencode,
        planningDecision: next.planningDecision,
        planningRevisionCount: next.planningRevisionCount,
        planningRevisions: next.planningRevisions,
        planningSummary: next.planningSummary,
        runSpecPath: next.runSpecPath,
        selectedRunLabel: next.selectedRunLabel,
    };
};

/**
 * Invokes the implementation subgraph and projects its result into the parent graph update.
 *
 * @param state - Current workflow state.
 * @param runtime - LangGraph runtime.
 * @returns The implementation update for the parent graph.
 */
export const invokeImplementing = async (
    state: WorkflowState,
    runtime: Runtime<WorkflowContext>,
): Promise<WorkflowUpdate> => {
    const next = await implementingSubGraph.invoke(state, {
        configurable: runtime.configurable,
        context: runtime.context,
        signal: runtime.signal,
    });

    return {
        implementationDecision: next.implementationDecision,
        implementationRevisionCount: next.implementationRevisionCount,
        implementationRevisions: next.implementationRevisions,
        implementationSummary: next.implementationSummary,
        manualSmokeInstructions: next.manualSmokeInstructions,
        messages: messageDelta(state, next),
        opencode: next.opencode,
        verificationSummary: next.verificationSummary,
    };
};

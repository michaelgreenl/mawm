import type { Runtime } from "@langchain/langgraph";
import type { WorkflowContext, WorkflowState } from "../../state.js";
import { planningGate } from "./gate.js";
import { materializeRunSpec } from "./materialize.js";

const node = async (state: WorkflowState, runtime: Runtime<WorkflowContext>) => {
    return materializeRunSpec(state, runtime.context);
};

/** Planning phase: the outer node and gate consumed by the top-level workflow graph. */
export const planningPhase = {
    node,
    gate: planningGate,
};

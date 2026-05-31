import type { WorkflowState } from "../../state.js";
import { implementationGate } from "./gate.js";
import { runImplementation } from "./run.js";

const node = async (state: WorkflowState) => {
    return runImplementation(state);
};

/** Implementation phase: the outer node and gate consumed by the top-level workflow graph. */
export const implementingPhase = {
    node,
    gate: implementationGate,
};

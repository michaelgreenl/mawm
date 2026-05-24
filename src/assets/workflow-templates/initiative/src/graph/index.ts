import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import type { Runtime } from "@langchain/langgraph";
import { implementationGate, planningGate } from "./gates.js";
import { runImplementation } from "./implementing.js";
import { materializeRunSpec } from "./planning.js";
import {
    WorkflowContextAnnotation,
    WorkflowInputAnnotation,
    WorkflowOutputAnnotation,
    WorkflowStateAnnotation,
    type WorkflowContext,
    type WorkflowState,
} from "./state.js";

const planning = async (state: WorkflowState, runtime: Runtime<WorkflowContext>) => {
    return materializeRunSpec(state, runtime.context);
};

const implementing = async (state: WorkflowState) => {
    return runImplementation(state);
};

/** Create the initiative workflow graph. */
export const createGraph = () => {
    const graph = new StateGraph(WorkflowStateAnnotation, {
        context: WorkflowContextAnnotation,
        input: WorkflowInputAnnotation,
        output: WorkflowOutputAnnotation,
    })
        .addNode("planning", planning)
        .addNode("planning_gate", planningGate, {
            ends: [END, "implementing"],
        })
        .addNode("implementing", implementing)
        .addNode("implementation_gate", implementationGate, {
            ends: [END, "implementing"],
        })
        .addEdge(START, "planning")
        .addEdge("planning", "planning_gate")
        .addEdge("implementing", "implementation_gate");

    return graph.compile({
        checkpointer: new MemorySaver(),
    });
};

/** Compiled initiative workflow graph. */
export const graph = createGraph();

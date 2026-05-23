import { END, START, MemorySaver, StateGraph } from "@langchain/langgraph";
import { implementationGate, planningGate } from "./gates.js";
import { invokeImplementing, invokePlanning } from "./nodes.js";
import {
    WorkflowContextAnnotation,
    WorkflowInputAnnotation,
    WorkflowOutputAnnotation,
    WorkflowStateAnnotation,
} from "./state.js";

/**
 * Creates the top-level workflow graph.
 *
 * @returns The compiled workflow graph.
 */
export const createGraph = () => {
    const graph = new StateGraph(WorkflowStateAnnotation, {
        context: WorkflowContextAnnotation,
        input: WorkflowInputAnnotation,
        output: WorkflowOutputAnnotation,
    })
        .addNode("planning", invokePlanning)
        .addNode("planning_gate", planningGate, {
            ends: [END, "implementing"],
        })
        .addNode("implementing", invokeImplementing)
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

export const graph = createGraph();

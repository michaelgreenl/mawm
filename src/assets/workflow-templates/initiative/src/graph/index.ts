import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { implementingPhase } from "./phases/implementing/index.js";
import { planningPhase } from "./phases/planning/index.js";
import {
    WorkflowContextAnnotation,
    WorkflowInputAnnotation,
    WorkflowOutputAnnotation,
    WorkflowStateAnnotation,
} from "./state.js";

/** Create the initiative workflow graph. */
export const createGraph = () => {
    const graph = new StateGraph(WorkflowStateAnnotation, {
        context: WorkflowContextAnnotation,
        input: WorkflowInputAnnotation,
        output: WorkflowOutputAnnotation,
    })
        .addNode("planning", planningPhase.node)
        .addNode("planning_gate", planningPhase.gate, {
            ends: [END, "implementing"],
        })
        .addNode("implementing", implementingPhase.node)
        .addNode("implementation_gate", implementingPhase.gate, {
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

import { START, StateGraph } from "@langchain/langgraph";
import { workflowAgentNodes } from "../../agents/definitions.js";
import { WorkflowContextAnnotation, WorkflowStateAnnotation } from "../state.js";
import { bootstrapCoder, parseCodeReview, routeImplementation } from "../phases/implementing.js";

const { coder, codeReviewer } = workflowAgentNodes;

/**
 * Creates the implementation-review subgraph.
 *
 * @returns The compiled implementation subgraph.
 */
export const createImplementingSubGraph = () => {
    const graph = new StateGraph(WorkflowStateAnnotation, {
        context: WorkflowContextAnnotation,
        input: WorkflowStateAnnotation,
        output: WorkflowStateAnnotation,
    })
        .addNode("bootstrap_coder", bootstrapCoder)
        .addNode("coder", coder)
        .addNode("code-reviewer", codeReviewer)
        .addNode("parse_code_review", parseCodeReview)
        .addNode("route", routeImplementation)
        .addEdge(START, "bootstrap_coder")
        .addEdge("bootstrap_coder", "coder")
        .addEdge("coder", "code-reviewer")
        .addEdge("code-reviewer", "parse_code_review")
        .addEdge("parse_code_review", "route");

    return graph.compile();
};

export const implementingSubGraph = createImplementingSubGraph();

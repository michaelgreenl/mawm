import { StateGraph } from "@langchain/langgraph";
import graphEdges from "./edges";
import { StateAnnotation } from "./state";
import nodes from "./nodes";

const DEFAULT_GRAPH_NAME = "base-workflow";

export type GraphConfig = {
    name?: string;
};

export const createGraph = (cfg: GraphConfig = {}) => {
    const graph = new StateGraph(StateAnnotation).addNode(nodes);

    for (const [from, to] of graphEdges) {
        graph.addEdge(from, to);
    }

    return graph.compile({
        name: cfg.name ?? DEFAULT_GRAPH_NAME,
    });
};

export const graph = createGraph();

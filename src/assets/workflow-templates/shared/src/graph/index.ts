import { Annotation, END, MemorySaver, START, StateGraph } from "@langchain/langgraph";

const State = Annotation.Root({});

export const createGraph = () => {
    const graph = new StateGraph(State)
        .addNode("finish", () => ({}))
        .addEdge(START, "finish")
        .addEdge("finish", END);

    return graph.compile({
        checkpointer: new MemorySaver(),
    });
};

export const graph = createGraph();

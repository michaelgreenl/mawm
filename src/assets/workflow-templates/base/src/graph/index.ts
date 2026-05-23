import { Annotation, END, MemorySaver, START, StateGraph } from "@langchain/langgraph";

const State = Annotation.Root({
    summary: Annotation<string>({
        default: () => "",
        reducer: (_left, right) => right,
    }),
});

export const createGraph = () => {
    const graph = new StateGraph(State)
        .addNode("task", async () => ({
            summary: "Standalone workflow completed.",
        }))
        .addEdge(START, "task")
        .addEdge("task", END);

    return graph.compile({
        checkpointer: new MemorySaver(),
    });
};

export const graph = createGraph();

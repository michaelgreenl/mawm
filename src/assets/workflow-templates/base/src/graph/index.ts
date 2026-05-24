import { Annotation, END, MemorySaver, START, StateGraph } from "@langchain/langgraph";

const State = Annotation.Root({
    summary: Annotation<string>({
        default: () => "",
        reducer: (_left, right) => right,
    }),
});

/** Create the standalone base workflow graph. */
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

/** Compiled standalone base workflow graph. */
export const graph = createGraph();

import type { WorkerCommand, WorkerEvent, WorkerGraph } from "./protocol.ts";
import { interactiveSessionManager } from "./session-manager.js";
import { createWorkflowWorker } from "./worker.js";

async function loadGraph(): Promise<WorkerGraph> {
    const graphModuleURL = process.argv[2];

    if (!graphModuleURL) {
        throw new Error("Workflow worker requires a graph module URL argument.");
    }

    const graphModule = (await import(graphModuleURL)) as {
        graph?: WorkerGraph;
    };

    if (!graphModule.graph || typeof graphModule.graph.invoke !== "function") {
        throw new Error(`Workflow graph module did not export a valid graph: ${graphModuleURL}`);
    }

    return graphModule.graph;
}

const graph = await loadGraph();

const worker = createWorkflowWorker({
    graph,
    sessionManager: interactiveSessionManager,
    send: async (event: WorkerEvent) => {
        process.send?.(event);
    },
});

const shutdown = async () => {
    await interactiveSessionManager.closeAllSessions();
    process.exit(0);
};

process.on("message", (message: WorkerCommand) => {
    void worker.handle(message);
});

process.on("disconnect", () => {
    void shutdown();
});

process.on("SIGINT", () => {
    void shutdown();
});

process.on("SIGTERM", () => {
    void shutdown();
});

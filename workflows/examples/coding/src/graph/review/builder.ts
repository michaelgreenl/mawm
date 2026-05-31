import { Command, END, START, StateGraph } from "@langchain/langgraph";
import type { Runtime } from "@langchain/langgraph";
import type { OpenCodeNode } from "../../integrations/opencode/types.js";
import {
    WorkflowContextAnnotation,
    WorkflowStateAnnotation,
    type WorkflowContext,
    type WorkflowState,
    type WorkflowUpdate,
} from "../state.js";

/** A LangGraph node operating on workflow state inside a review phase. */
type PhaseNode = (
    state: WorkflowState,
    runtime: Runtime<WorkflowContext>,
) => WorkflowUpdate | Promise<WorkflowUpdate>;

/** Configuration describing one agent/reviewer phase. */
export interface ReviewPhaseConfig {
    /** Seeds the agent prompt and resets the phase decision fields. */
    readonly bootstrap: PhaseNode;
    /** The implementing agent and the graph node name it runs under. */
    readonly agent: { readonly name: string; readonly node: OpenCodeNode };
    /** The reviewing agent and the graph node name it runs under. */
    readonly reviewer: { readonly name: string; readonly node: OpenCodeNode };
    /** Ingests the reviewer reply and writes the phase decision into state. */
    readonly parse: PhaseNode;
    /** Whether the latest decision should loop back to the agent for another pass. */
    readonly shouldRevise: (state: WorkflowState) => boolean;
}

/**
 * Returns only the messages a subgraph appended during its run.
 *
 * @param before - State before invoking the subgraph.
 * @param after - State returned by the subgraph.
 * @returns The newly appended messages.
 */
const messageDelta = (before: WorkflowState, after: WorkflowState) => {
    const seen = before.messages.length;

    return after.messages.slice(seen > after.messages.length ? 0 : seen);
};

/**
 * Projects a completed subgraph state into a parent-graph update, replacing the
 * full message history with only the messages the subgraph appended.
 *
 * @param before - State before invoking the subgraph.
 * @param after - State returned by the subgraph.
 * @returns The update for the parent graph.
 */
const projectResult = (before: WorkflowState, after: WorkflowState): WorkflowUpdate => {
    return {
        ...after,
        messages: messageDelta(before, after),
    };
};

/**
 * Builds an agent/reviewer phase as a bootstrap -> agent -> reviewer -> parse ->
 * route subgraph, plus the outer node that runs it and projects its result.
 *
 * The inner route is generic (loop back to the agent on revise, otherwise end);
 * phase-specific routing for the parent graph lives in each phase's gate.
 *
 * @param config - The phase definition.
 * @returns The outer node and the compiled review subgraph.
 */
export const createReviewPhase = (config: ReviewPhaseConfig) => {
    const route = (state: WorkflowState) => {
        return new Command({
            goto: config.shouldRevise(state) ? config.agent.name : END,
        });
    };

    const subgraph = new StateGraph(WorkflowStateAnnotation, {
        context: WorkflowContextAnnotation,
        input: WorkflowStateAnnotation,
        output: WorkflowStateAnnotation,
    })
        .addNode("bootstrap", config.bootstrap)
        .addNode(config.agent.name, config.agent.node)
        .addNode(config.reviewer.name, config.reviewer.node)
        .addNode("parse", config.parse)
        .addNode("route", route)
        .addEdge(START, "bootstrap")
        .addEdge("bootstrap", config.agent.name)
        .addEdge(config.agent.name, config.reviewer.name)
        .addEdge(config.reviewer.name, "parse")
        .addEdge("parse", "route")
        .compile();

    const node = async (
        state: WorkflowState,
        runtime: Runtime<WorkflowContext>,
    ): Promise<WorkflowUpdate> => {
        const next = await subgraph.invoke(state, {
            configurable: runtime.configurable,
            context: runtime.context,
            signal: runtime.signal,
        });

        return projectResult(state, next);
    };

    return { node, subgraph };
};

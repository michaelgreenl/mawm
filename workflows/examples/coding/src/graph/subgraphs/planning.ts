import { START, StateGraph } from "@langchain/langgraph";
import { workflowAgentNodes } from "../../agents/definitions.js";
import { WorkflowContextAnnotation, WorkflowStateAnnotation } from "../state.js";
import { bootstrapPlanner, parsePlanReview, routePlanning } from "../phases/planning.js";

const { planner, planReviewer } = workflowAgentNodes;

/**
 * Creates the planning-review subgraph.
 *
 * @returns The compiled planning subgraph.
 */
export const createPlanningSubGraph = () => {
    const graph = new StateGraph(WorkflowStateAnnotation, {
        context: WorkflowContextAnnotation,
        input: WorkflowStateAnnotation,
        output: WorkflowStateAnnotation,
    })
        .addNode("bootstrap_planner", bootstrapPlanner)
        .addNode("planner", planner)
        .addNode("plan-reviewer", planReviewer)
        .addNode("parse_plan_review", parsePlanReview)
        .addNode("route", routePlanning)
        .addEdge(START, "bootstrap_planner")
        .addEdge("bootstrap_planner", "planner")
        .addEdge("planner", "plan-reviewer")
        .addEdge("plan-reviewer", "parse_plan_review")
        .addEdge("parse_plan_review", "route");

    return graph.compile();
};

export const planningSubGraph = createPlanningSubGraph();

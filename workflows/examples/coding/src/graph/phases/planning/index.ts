import { workflowAgentNodes } from "../../../agents/definitions.js";
import { createReviewPhase } from "../../review/builder.js";
import type { WorkflowState } from "../../state.js";
import { bootstrapPlanner } from "./bootstrap.js";
import { planningGate } from "./gate.js";
import { parsePlanReview } from "./parse.js";

const { planner, planReviewer } = workflowAgentNodes;

const { node } = createReviewPhase({
    bootstrap: bootstrapPlanner,
    agent: { name: "planner", node: planner },
    reviewer: { name: "plan-reviewer", node: planReviewer },
    parse: parsePlanReview,
    shouldRevise: (state: WorkflowState) => state.planningDecision === "revise",
});

/** Planning phase: the outer node and gate consumed by the top-level workflow graph. */
export const planningPhase = {
    node,
    gate: planningGate,
};

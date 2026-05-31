import { workflowAgentNodes } from "../../../agents/definitions.js";
import { createReviewPhase } from "../../review/builder.js";
import type { WorkflowState } from "../../state.js";
import { bootstrapCoder } from "./bootstrap.js";
import { implementationGate } from "./gate.js";
import { parseCodeReview } from "./parse.js";

const { coder, codeReviewer } = workflowAgentNodes;

const { node } = createReviewPhase({
    bootstrap: bootstrapCoder,
    agent: { name: "coder", node: coder },
    reviewer: { name: "code-reviewer", node: codeReviewer },
    parse: parseCodeReview,
    shouldRevise: (state: WorkflowState) => state.implementationDecision === "revise",
});

/** Implementation phase: the outer node and gate consumed by the top-level workflow graph. */
export const implementingPhase = {
    node,
    gate: implementationGate,
};

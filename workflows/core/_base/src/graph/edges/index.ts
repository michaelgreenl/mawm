import { END, START } from "@langchain/langgraph";
import type { WorkflowNodeName } from "../nodes";
import { implementTransition } from "./implement";
import { replanTransition } from "./replan";

export type WorkflowGraphEdge = readonly [
    typeof START | WorkflowNodeName,
    WorkflowNodeName | typeof END,
];

export type WorkflowTransition = {
    agent: WorkflowNodeName;
    userCommand: `/${string}`;
    handoff: {
        from: WorkflowNodeName;
        to: WorkflowNodeName;
    };
};

export const transitions = [
    implementTransition,
    replanTransition,
] as const satisfies readonly WorkflowTransition[];

const graphEdges = [
    [START, "planner"],
    ["planner", "manager"],
    ["manager", "planner"],
    ["manager", END],
] as const satisfies readonly WorkflowGraphEdge[];

export default graphEdges;

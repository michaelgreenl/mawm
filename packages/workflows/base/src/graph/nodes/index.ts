import { StateAnnotation } from "../state";
import planner from "./planner";
import manager from "./manager";

export const nodeNames = ["planner", "manager"] as const;

export type WorkflowNodeName = (typeof nodeNames)[number];

const nodes = {
    planner,
    manager,
} satisfies Record<WorkflowNodeName, typeof StateAnnotation.Node>;

export default nodes;

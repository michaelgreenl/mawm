import { StateSchema } from "@langchain/langgraph";
import { z } from "zod/v4";

export const ReplanPayloadSchema = new StateSchema({
    phasePlanPath: z.string(),
    brief: z.string(),
    startStep: z.number().int().positive().optional(),
});

export const replanTransition = {
    agent: "manager",
    userCommand: "/replan",
    handoff: {
        from: "manager",
        to: "planner",
    },
} as const;

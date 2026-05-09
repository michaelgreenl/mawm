import { StateSchema } from "@langchain/langgraph";
import { z } from "zod/v4";

export const ImplementPayloadSchema = new StateSchema({
    phasePlanPath: z.string(),
    brief: z.string(),
    startStep: z.number().int().positive().optional(),
});

export const implementTransition = {
    agent: "planner",
    userCommand: "/implement",
    handoff: {
        from: "planner",
        to: "manager",
    },
} as const;

import type { BaseMessage, BaseMessageLike } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

const text = () =>
    Annotation<string>({
        reducer: (_left, right) => right,
        default: () => "",
    });

const optionalStep = () =>
    Annotation<number | undefined>({
        reducer: (_left, right) => right,
        default: () => undefined,
    });

export const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[], BaseMessageLike[]>({
        reducer: (left, right) => messagesStateReducer(left, right),
        default: () => [],
    }),
    phasePlanPath: text(),
    brief: text(),
    startStep: optionalStep(),
});

export type GraphState = typeof StateAnnotation.State;
export type GraphUpdate = typeof StateAnnotation.Update;

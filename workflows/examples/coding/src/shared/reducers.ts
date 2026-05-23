import type { BaseMessage, BaseMessageLike } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

/**
 * Merges LangGraph message updates using the built-in messages reducer.
 *
 * @param left - Existing messages.
 * @param right - Incoming message update.
 * @returns The merged message list.
 */
const reduceMessages = (left: BaseMessage[], right: BaseMessageLike[]): BaseMessage[] =>
    messagesStateReducer(left, right);

/**
 * Provides the default empty message list for workflow state.
 *
 * @returns An empty message array.
 */
const defaultMessages = (): BaseMessage[] => [];

/**
 * Keeps the most recent scalar annotation value.
 *
 * @param _left - Previous value.
 * @param right - Incoming value.
 * @returns The incoming value.
 */
const takeLatest = <Value>(_left: Value, right: Value): Value => right;

/**
 * Provides zero as the default numeric annotation value.
 *
 * @returns Zero.
 */
const defaultInt = (): number => 0;

/**
 * Provides `undefined` as the default optional integer value.
 *
 * @returns `undefined`.
 */
const defaultOptionalInt = (): number | undefined => undefined;

/**
 * Provides an empty string as the default required text value.
 *
 * @returns An empty string.
 */
const defaultText = (): string => "";

/**
 * Provides `undefined` as the default optional text value.
 *
 * @returns `undefined`.
 */
const defaultOptionalText = (): string | undefined => undefined;

/**
 * Workflow message annotation that accumulates chat history.
 */
export const messages = Annotation<BaseMessage[], BaseMessageLike[]>({
    reducer: reduceMessages,
    default: defaultMessages,
});

/**
 * Creates an integer annotation used for iteration counters.
 *
 * @returns A zero-initialized integer annotation.
 */
export const iterationCount = () =>
    Annotation<number>({
        reducer: takeLatest,
        default: defaultInt,
    });

/**
 * Creates a required integer annotation.
 *
 * @returns A zero-initialized integer annotation.
 */
export const int = () =>
    Annotation<number>({
        reducer: takeLatest,
        default: defaultInt,
    });

/**
 * Creates an optional integer annotation.
 *
 * @returns An undefined-initialized optional integer annotation.
 */
export const optionalInt = () =>
    Annotation<number | undefined>({
        reducer: takeLatest,
        default: defaultOptionalInt,
    });

/**
 * Creates a required text annotation.
 *
 * @returns An empty-string initialized text annotation.
 */
export const text = () =>
    Annotation<string>({
        reducer: takeLatest,
        default: defaultText,
    });

/**
 * Creates an optional text annotation.
 *
 * @returns An undefined-initialized optional text annotation.
 */
export const optionalText = () =>
    Annotation<string | undefined>({
        reducer: takeLatest,
        default: defaultOptionalText,
    });

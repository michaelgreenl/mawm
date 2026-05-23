import { Annotation } from "@langchain/langgraph";
import type { OpenCodeMemory } from "../integrations/opencode/types.js";
import { int, messages, optionalText, text } from "../shared/reducers.js";

/**
 * Keeps the latest OpenCode memory update in workflow state.
 *
 * @param _left - Previous OpenCode memory.
 * @param right - Incoming OpenCode memory.
 * @returns The incoming OpenCode memory.
 */
const replaceOpenCodeMemory = (
    _left: OpenCodeMemory | undefined,
    right: OpenCodeMemory | undefined,
): OpenCodeMemory | undefined => right;

/**
 * Provides the default empty OpenCode memory slot.
 *
 * @returns `undefined`.
 */
const defaultOpenCodeMemory = (): OpenCodeMemory | undefined => undefined;

const opencode = Annotation<OpenCodeMemory | undefined>({
    reducer: replaceOpenCodeMemory,
    default: defaultOpenCodeMemory,
});

const initiativeSpecPath = text();
const runSpecPath = text();
const selectedRunLabel = optionalText();
const implementationSummary = optionalText();
const verificationSummary = optionalText();
const finalStatus = optionalText();

// Workflow context schema: runtime-only execution settings passed via LangGraph context.
export const WorkflowContextAnnotation = Annotation.Root({
    targetRepoPath: Annotation<string>,
    initiativeBranch: Annotation<string>,
    opencodeBaseUrl: Annotation<string>,
    parentSessionID: Annotation<string>,
});

export const WorkflowInputAnnotation = Annotation.Root({
    initiativeSpecPath,
    runSpecPath,
    selectedRunLabel,
});

export const WorkflowOutputAnnotation = Annotation.Root({
    finalStatus,
    implementationSummary,
    runSpecPath,
    verificationSummary,
});

export const WorkflowStateAnnotation = Annotation.Root({
    messages,
    opencode,
    initiativeSpecPath,
    runSpecPath,
    selectedRunLabel,
    planningDecision: optionalText(),
    planningSummary: optionalText(),
    planningRevisions: optionalText(),
    planningRevisionCount: int(),
    implementationDecision: optionalText(),
    implementationSummary,
    implementationRevisions: optionalText(),
    implementationRevisionCount: int(),
    manualSmokeInstructions: optionalText(),
    verificationSummary,
    finalStatus,
});

export type WorkflowContext = typeof WorkflowContextAnnotation.State;
export type WorkflowInput = typeof WorkflowInputAnnotation.State;
export type WorkflowOutput = typeof WorkflowOutputAnnotation.State;
export type WorkflowState = typeof WorkflowStateAnnotation.State;
export type WorkflowUpdate = typeof WorkflowStateAnnotation.Update;

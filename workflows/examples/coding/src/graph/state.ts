import { Annotation } from "@langchain/langgraph";
import { opencodeMemory } from "../integrations/opencode/memory.js";
import { int, messages, optionalText, text } from "../shared/reducers.js";

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
    opencode: opencodeMemory,
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

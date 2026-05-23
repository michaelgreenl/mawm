import { Annotation } from "@langchain/langgraph";

const slot = <T>(value: T) =>
    Annotation<T>({
        default: () => value,
        reducer: (_left, right) => right,
    });

export type PlanningDecision = "accept" | "blocked";
export type ImplementationDecision = "accept" | "blocked" | "manual_smoke" | "revise";

const initiativeSpecPath = slot("");
const runSpecPath = slot("");
const selectedRunLabel = slot<string | undefined>(undefined);
const finalStatus = slot<string | undefined>(undefined);
const implementationDecision = slot<string | undefined>(undefined);
const implementationRevisionCount = slot(0);
const implementationRevisions = slot<string | undefined>(undefined);
const implementationSummary = slot<string | undefined>(undefined);
const manualSmokeInstructions = slot<string | undefined>(undefined);
const planningDecision = slot<string | undefined>(undefined);
const planningRevisionCount = slot(0);
const planningRevisions = slot<string | undefined>(undefined);
const planningSummary = slot<string | undefined>(undefined);
const verificationSummary = slot<string | undefined>(undefined);
const initiativeBranch = slot("");
const opencodeBaseUrl = slot<string | undefined>(undefined);
const parentSessionID = slot<string | undefined>(undefined);
const targetRepoPath = slot("");

export const WorkflowContextAnnotation = Annotation.Root({
    initiativeBranch,
    opencodeBaseUrl,
    parentSessionID,
    targetRepoPath,
});

export const WorkflowInputAnnotation = Annotation.Root({
    initiativeSpecPath,
    runSpecPath,
    selectedRunLabel,
});

export const WorkflowOutputAnnotation = Annotation.Root({
    finalStatus,
    implementationSummary,
    planningSummary,
    runSpecPath,
    verificationSummary,
});

export const WorkflowStateAnnotation = Annotation.Root({
    finalStatus,
    implementationDecision,
    implementationRevisionCount,
    implementationRevisions,
    implementationSummary,
    initiativeSpecPath,
    manualSmokeInstructions,
    planningDecision,
    planningRevisionCount,
    planningRevisions,
    planningSummary,
    runSpecPath,
    selectedRunLabel,
    verificationSummary,
});

export type WorkflowContext = typeof WorkflowContextAnnotation.State;
export type WorkflowInput = typeof WorkflowInputAnnotation.State;
export type WorkflowOutput = typeof WorkflowOutputAnnotation.State;
export type WorkflowState = typeof WorkflowStateAnnotation.State;
export type WorkflowUpdate = typeof WorkflowStateAnnotation.Update;

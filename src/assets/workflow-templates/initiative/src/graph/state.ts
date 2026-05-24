import { Annotation } from "@langchain/langgraph";

const slot = <T>(value: T) =>
    Annotation<T>({
        default: () => value,
        reducer: (_left, right) => right,
    });

/** Planning gate decision stored in workflow state. */
export type PlanningDecision = "accept" | "blocked";

/** Implementation gate decision stored in workflow state. */
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

/** Runtime context annotation exposed by the initiative workflow graph. */
export const WorkflowContextAnnotation = Annotation.Root({
    initiativeBranch,
    opencodeBaseUrl,
    parentSessionID,
    targetRepoPath,
});

/** Input annotation accepted by the initiative workflow graph. */
export const WorkflowInputAnnotation = Annotation.Root({
    initiativeSpecPath,
    runSpecPath,
    selectedRunLabel,
});

/** Output annotation returned by the initiative workflow graph. */
export const WorkflowOutputAnnotation = Annotation.Root({
    finalStatus,
    implementationSummary,
    planningSummary,
    runSpecPath,
    verificationSummary,
});

/** Full state annotation used by the initiative workflow graph. */
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

/** Runtime context shape inferred from the workflow annotations. */
export type WorkflowContext = typeof WorkflowContextAnnotation.State;

/** Input shape inferred from the workflow annotations. */
export type WorkflowInput = typeof WorkflowInputAnnotation.State;

/** Output shape inferred from the workflow annotations. */
export type WorkflowOutput = typeof WorkflowOutputAnnotation.State;

/** Full state shape inferred from the workflow annotations. */
export type WorkflowState = typeof WorkflowStateAnnotation.State;

/** Partial state update shape accepted by the workflow graph. */
export type WorkflowUpdate = typeof WorkflowStateAnnotation.Update;

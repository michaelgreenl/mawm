import type { AIMessage } from "@langchain/core/messages";

export interface ReviewPayload {
    readonly decision?: string;
    readonly summary?: string;
    readonly revisions?: string;
    readonly manualSmokeInstructions?: string;
    readonly verificationSummary?: string;
}

export interface PlanningReviewResult {
    readonly decision: "accept" | "revise" | "blocked";
    readonly summary?: string;
    readonly revisions?: string;
    readonly revisionCount: number;
}

export interface ImplementationReviewResult {
    readonly decision: "accept" | "revise" | "blocked" | "manual_smoke";
    readonly summary?: string;
    readonly revisions?: string;
    readonly manualSmokeInstructions?: string;
    readonly verificationSummary?: string;
    readonly revisionCount: number;
}

export interface ParsedAgentReply {
    readonly message: AIMessage;
    readonly sessionID: string;
}

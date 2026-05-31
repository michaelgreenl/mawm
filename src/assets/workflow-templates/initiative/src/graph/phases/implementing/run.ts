import { readFile } from "node:fs/promises";
import type { WorkflowState, WorkflowUpdate } from "../../state.js";

const section = (text: string, heading: string) => {
    const marker = `## ${heading}`;
    const start = text.indexOf(marker);

    if (start < 0) {
        return undefined;
    }

    const from = text.indexOf("\n", start);
    const end = text.indexOf("\n## ", from + 1);

    return text.slice(from + 1, end < 0 ? undefined : end).trim();
};

const title = (text: string) => text.match(/^# Run Spec: (?<title>.+)$/m)?.groups?.title?.trim();

const bullets = (text: string | undefined) => {
    if (!text) {
        return [];
    }

    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2).trim().replace(/^`|`$/g, ""))
        .filter((line) => line.length > 0);
};

const smoke = (text: string) => {
    const value = section(text, "Smoke Verification") ?? "";
    const mode = value.match(/^- Mode: `(?<mode>[^`]+)`$/m)?.groups?.mode?.trim();
    const instructions = value
        .match(/^- Manual instructions, if needed: (?<instructions>[\s\S]+)$/m)
        ?.groups?.instructions?.trim();

    return {
        instructions,
        mode,
    };
};

const verification = (text: string) => {
    const values = bullets(section(text, "Verification Commands"));

    return values.length === 0
        ? undefined
        : `Planned verification commands:\n${values.map((value) => `- ${value}`).join("\n")}`;
};

/** Produce the implementation-stage update derived from the generated run spec. */
export const runImplementation = async (
    state: Pick<
        WorkflowState,
        | "implementationRevisionCount"
        | "implementationRevisions"
        | "initiativeSpecPath"
        | "runSpecPath"
        | "selectedRunLabel"
    >,
): Promise<WorkflowUpdate> => {
    const text = await readFile(state.runSpecPath, "utf8");
    const name = title(text) ?? state.selectedRunLabel ?? "Selected run";
    const review = state.implementationRevisions
        ? ` Addressed revision feedback: ${state.implementationRevisions}`
        : "";
    const summary = `Prepared the generic implementation placeholder for ${name}.${review}`;
    const checks = verification(text);
    const gate = smoke(text);

    if (gate.mode === "manual") {
        return {
            implementationDecision: "manual_smoke",
            implementationRevisionCount: state.implementationRevisionCount,
            implementationSummary: summary,
            manualSmokeInstructions:
                gate.instructions && gate.instructions !== "None."
                    ? gate.instructions
                    : "Complete the manual smoke verification method recorded in the run spec.",
            verificationSummary: checks,
        };
    }

    return {
        implementationDecision: "accept",
        implementationRevisionCount: state.implementationRevisionCount,
        implementationSummary: summary,
        manualSmokeInstructions: undefined,
        verificationSummary: checks,
    };
};

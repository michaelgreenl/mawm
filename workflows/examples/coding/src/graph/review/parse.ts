import type { ReviewPayload } from "./types.js";

const REVIEW_JSON_BLOCK = /```(?:json)?\s*([\s\S]*?)```/gi;

/**
 * Returns a trimmed non-empty string when the input is a string.
 *
 * @param value - Candidate value to normalize.
 * @returns The trimmed string, or `undefined` when the value is blank or not a string.
 */
const text = (value: unknown): string | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Parses a JSON object string and rejects arrays or primitive values.
 *
 * @param value - Raw JSON string to parse.
 * @returns The parsed object when valid, or `undefined` otherwise.
 */
const parseObject = (value: string): Record<string, unknown> | undefined => {
    try {
        const parsed = JSON.parse(value) as unknown;

        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return undefined;
    }

    return undefined;
};

/**
 * Extracts the most useful JSON object from a free-form review response.
 *
 * @param content - Reviewer response content.
 * @returns The extracted JSON object, or `undefined` when none can be parsed.
 */
const extractJsonObject = (content: string): Record<string, unknown> | undefined => {
    const blocks = [...content.matchAll(REVIEW_JSON_BLOCK)];

    for (let index = blocks.length - 1; index >= 0; index -= 1) {
        const block = blocks[index]?.[1];

        if (!block) {
            continue;
        }

        const parsed = parseObject(block.trim());

        if (parsed) {
            return parsed;
        }
    }

    const direct = parseObject(content.trim());

    if (direct) {
        return direct;
    }

    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");

    if (firstBrace < 0 || lastBrace <= firstBrace) {
        return undefined;
    }

    return parseObject(content.slice(firstBrace, lastBrace + 1));
};

/**
 * Parses the supported review payload fields from reviewer content.
 *
 * @param content - Reviewer response content.
 * @returns A normalized review payload.
 */
export const parseReviewPayload = (content: string): ReviewPayload => {
    const parsed = extractJsonObject(content);

    return {
        decision: text(parsed?.decision),
        summary: text(parsed?.summary),
        revisions: text(parsed?.revisions),
        manualSmokeInstructions: text(parsed?.manualSmokeInstructions),
        verificationSummary: text(parsed?.verificationSummary),
    };
};

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const promptDir = join(dir, ".", "assets");

if (!existsSync(promptDir)) {
    throw new Error(`Unable to locate prompt assets relative to ${dir}`);
}

/**
 * Loads and trims a prompt asset file.
 *
 * @param name - Asset path relative to the prompt directory.
 * @returns The trimmed prompt contents.
 */
const text = (name: string) => readFileSync(join(promptDir, name), "utf8").trim();

/**
 * Joins prompt blocks using a consistent section separator.
 *
 * @param parts - Prompt sections to combine.
 * @returns The combined prompt string.
 */
const blocks = (...parts: readonly string[]) =>
    parts
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .join("\n\n---\n\n");

const agents = {
    planner: text("agents/planner.txt"),
    planReviewer: text("agents/plan-reviewer.txt"),
    coder: text("agents/coder.txt"),
    codeReviewer: text("agents/code-reviewer.txt"),
};

const shared = [text("snippets/bun-pm-node-runtime.txt")] as const;

const clean = text("snippets/clean-code-ts.txt");
const tdd = text("snippets/test-driven-development.txt");

export const agentPrompts = {
    planner: blocks(agents.planner, ...shared),
    planReviewer: blocks(agents.planReviewer, ...shared),
    coder: blocks(agents.coder, clean, tdd, ...shared),
    codeReviewer: blocks(agents.codeReviewer, clean, ...shared),
} as const;

export type AgentPromptName = keyof typeof agentPrompts;

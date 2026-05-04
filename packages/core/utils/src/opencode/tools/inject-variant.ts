import { tool } from "@opencode-ai/plugin/tool";

const schema = tool.schema;

// Shared source scaffold for injecting workflow-owned agent variants.
//
// Contract:
// - input: { agent: string, variant: string }
// - output: resolves and injects `src/opencode/agent-variants/<agent>/<variant>.md`
// - behavior: read-only lookup that never edits prompts on disk
export const injectVariant = tool({
  description: "Resolve a workflow-owned agent variant add-on.",
  args: {
    agent: schema.string().trim().min(1).describe("Target agent id, for example `planner`."),
    variant: schema
      .string()
      .trim()
      .min(1)
      .describe("Variant slug, for example `roadmap`, `initiative`, `phase`, or `step`."),
  },
  async execute({ agent, variant }, context) {
    context.metadata({
      title: "Variant stub",
      metadata: {
        stub: true,
        agent,
        variant,
      },
    });

    return [
      "`inject-variant` is currently a shared stub in `@mawm/core/utils`.",
      `agent: ${agent}`,
      `variant: ${variant}`,
      "TODO: resolve the matching workflow variant markdown file and inject it into the active session context.",
    ].join("\n");
  },
});

export default injectVariant;

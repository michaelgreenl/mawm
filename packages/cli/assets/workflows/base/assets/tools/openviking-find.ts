import { tool } from "@opencode-ai/plugin/tool";

const schema = tool.schema;

// Shared source scaffold for the CLI-owned `openviking.find` tool.
//
// Contract:
// - input: { query: string, limit?: number, target?: string }
// - output: ranked read-only retrieval snippets with uri/title/content/score
// - behavior: must read project-scoped `.mawm/ovcli.conf` and never mutate the index/filesystem
export const openvikingFind = tool({
    description: "Search the project OpenViking index for read-only context.",
    args: {
        query: schema.string().trim().min(1).describe("Natural-language retrieval query."),
        limit: schema
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .describe("Maximum snippets to return."),
        target: schema
            .string()
            .trim()
            .min(1)
            .optional()
            .describe("Optional retrieval scope identifier."),
    },
    async execute({ query, limit, target }, context) {
        context.metadata({
            title: "OpenViking stub",
            metadata: {
                stub: true,
                query,
                limit,
                target,
            },
        });

        return [
            "`openviking-find` is currently a shared stub in `@mawm/core/utils`.",
            `query: ${query}`,
            `limit: ${String(limit ?? 10)}`,
            `target: ${target ?? "<default>"}`,
            "TODO: resolve the project OpenViking config, run the read-only query, and return ranked snippets.",
        ].join("\n");
    },
});

export default openvikingFind;

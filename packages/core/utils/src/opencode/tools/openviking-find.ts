// Shared source scaffold for the CLI-owned `openviking.find` tool.
//
// Contract:
// - input: { query: string, limit?: number, target?: string }
// - output: ranked read-only retrieval snippets with uri/title/content/score
// - behavior: must read project-scoped `.mawm/ovcli.conf` and never mutate the index/filesystem

import type { Plugin, PluginModule } from "@opencode-ai/plugin";

// Shared source scaffold for the workflow graph transition runtime plugin.
//
// Contract:
// - coordinate workflow-owned planner/manager transition hooks
// - keep transition parsing and prompt injection inside runtime hooks, not agent prompts
// - remain a no-op until the workflow transition contract is implemented
export const graphTransition: Plugin = async () => {
  return {};
};

const graphTransitionModule = {
  id: "graph-transition",
  server: graphTransition,
} satisfies PluginModule;

export default graphTransitionModule;

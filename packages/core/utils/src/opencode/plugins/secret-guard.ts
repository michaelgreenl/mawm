import type { Plugin, PluginModule } from "@opencode-ai/plugin";

// Shared source scaffold for the workflow-local secret guard runtime plugin.
//
// Contract:
// - block secret-bearing file and shell access before data reaches the model
// - preserve the workflow-owned OpenViking config exception once defined
// - stay read-only with respect to agent prompts and tool registrations
export const secretGuard: Plugin = async () => {
  return {};
};

const secretGuardModule = {
  id: "secret-guard",
  server: secretGuard,
} satisfies PluginModule;

export default secretGuardModule;

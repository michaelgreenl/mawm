import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyMissing, copyRecursive, exists } from "../fs.js";

const SOURCE = fileURLToPath(new URL("../../assets/.mawm.project-local", import.meta.url));
const AGENTS = join(SOURCE, "agents");
const MANAGED = ["_templates", join("adhoc", "README.md"), "README.md"] as const;
const CONFIG = "mawm.json";
const ROADMAP = "roadmap.md";
const SCHEMA = "mawm.schema.json";

/**
 * Refresh project-local `.mawm` assets.
 *
 * Seeds the full bundle on first run. On existing workspaces, `mawm.json`
 * and `roadmap.md` stay create-only while managed files are refreshed.
 */
export const updateProjectPlanningAssets = async (cwd: string): Promise<boolean> => {
    const root = join(cwd, ".mawm");

    if (!(await exists(root))) {
        return copyMissing(SOURCE, root);
    }

    let changed = await copyMissing(join(SOURCE, CONFIG), join(root, CONFIG));
    changed = (await copyRecursive(join(SOURCE, SCHEMA), join(root, SCHEMA))) || changed;

    const agents = join(root, "agents");

    if (!(await exists(agents))) {
        return (await copyMissing(AGENTS, agents)) || changed;
    }

    changed = (await copyMissing(join(AGENTS, ROADMAP), join(agents, ROADMAP))) || changed;

    for (const rel of MANAGED) {
        changed = (await copyRecursive(join(AGENTS, rel), join(agents, rel))) || changed;
    }

    return changed;
};

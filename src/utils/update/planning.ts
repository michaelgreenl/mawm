import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyMissing, copyRecursive, exists } from "../fs.js";

const SOURCE = fileURLToPath(new URL("../../assets/.mawm.project-local/agents", import.meta.url));
const MANAGED = ["_templates", join("adhoc", "README.md"), "README.md"] as const;
const ROADMAP = "roadmap.md";

/**
 * Refresh project-local planning assets under `.mawm/agents`.
 *
 * Seeds the full bundle on first run. On existing workspaces, only managed
 * files are overwritten and `roadmap.md` is create-only.
 */
export const updateProjectPlanningAssets = async (cwd: string): Promise<boolean> => {
    const root = join(cwd, ".mawm", "agents");

    if (!(await exists(root))) {
        return copyMissing(SOURCE, root);
    }

    let changed = await copyMissing(join(SOURCE, ROADMAP), join(root, ROADMAP));

    for (const rel of MANAGED) {
        changed = (await copyMissing(join(SOURCE, rel), join(root, rel))) || changed;
        changed = (await copyRecursive(join(SOURCE, rel), join(root, rel))) || changed;
    }

    return changed;
};

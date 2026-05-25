import { cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { trackRoots } from "./tmp.js";

type Variant = "base" | "initiative";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const templates = join(root, "src", "assets", "workflow-templates");
const shared = join(templates, "shared");

/** Returns the source directory for a workflow template variant. */
export const templateDir = (variant: Variant): string => {
    return join(templates, variant);
};

/** Creates temp workspaces that combine the shared template with one variant. */
export const trackTemplateWorkspaces = () => {
    const roots = trackRoots();

    return {
        cleanup: async (): Promise<void> => {
            await roots.cleanup();
        },
        create: async (variant: Variant): Promise<string> => {
            const dir = await roots.dir(`mawm-${variant}-template-`);
            await cp(shared, dir, { recursive: true });
            await cp(templateDir(variant), dir, { recursive: true });
            return dir;
        },
    };
};

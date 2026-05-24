import { cp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const sourceRoot = join(repoRoot, "src", "assets");
const targetRoot = join(repoRoot, "dist", "assets");
const templateRoot = join(sourceRoot, "workflow-templates");
const targetTemplateRoot = join(targetRoot, "workflow-templates");

const paths = async (root) => {
    const entries = await readdir(root, { withFileTypes: true });
    const values = await Promise.all(
        entries.map(async (entry) => {
            const path = join(root, entry.name);

            if (entry.isDirectory()) {
                return paths(path);
            }

            return [path];
        }),
    );

    return values.flat();
};

const overlay = async (variant) => {
    const root = join(templateRoot, variant);
    const path = join(root, "overlay.json");
    const raw = JSON.parse(await readFile(path, "utf8"));

    if (
        typeof raw !== "object" ||
        raw === null ||
        raw.variant !== variant ||
        !Array.isArray(raw.variantOwnedPaths) ||
        raw.variantOwnedPaths.some((value) => typeof value !== "string")
    ) {
        throw new Error(`Invalid overlay contract: ${path}`);
    }

    return {
        root,
        variantOwnedPaths: raw.variantOwnedPaths,
    };
};

const copyOwned = async (root, output, path) => {
    if (path.includes("..")) {
        throw new Error(`Overlay path must stay within its variant root: ${path}`);
    }

    const source = join(root, path);
    const info = await stat(source).catch(() => undefined);

    if (!info) {
        throw new Error(`Missing overlay-owned path: ${source}`);
    }

    await mkdir(dirname(join(output, path)), { recursive: true });
    await cp(source, join(output, path), { recursive: true });
};

const materializeVariant = async (variant) => {
    const sharedRoot = join(templateRoot, "shared");
    const output = join(targetTemplateRoot, variant);
    const spec = await overlay(variant);

    await cp(sharedRoot, output, { recursive: true });
    await Promise.all(spec.variantOwnedPaths.map((path) => copyOwned(spec.root, output, path)));

    return {
        output,
        files: await paths(output),
    };
};

await mkdir(join(repoRoot, "dist"), { recursive: true });
await rm(targetRoot, { recursive: true, force: true });
await cp(sourceRoot, targetRoot, { recursive: true });
await rm(targetTemplateRoot, { recursive: true, force: true });
await mkdir(targetTemplateRoot, { recursive: true });

for (const variant of ["base", "initiative"]) {
    await materializeVariant(variant);
}

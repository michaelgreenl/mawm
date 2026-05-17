import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const sourceRoot = join(repoRoot, "src", "assets");
const targetRoot = join(repoRoot, "dist", "assets");

await mkdir(join(repoRoot, "dist"), { recursive: true });
await rm(targetRoot, { recursive: true, force: true });
await cp(sourceRoot, targetRoot, { recursive: true });

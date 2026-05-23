import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const build = spawnSync(
    globalThis.process.execPath,
    ["build", "src/graph/index.ts", "--outfile", "dist/graph.js", "--target=node", "--format=esm"],
    {
        cwd: root,
        stdio: "inherit",
    },
);

if (build.status !== 0) {
    globalThis.process.exit(build.status ?? 1);
}

cpSync(join(root, "langgraph.dist.json"), join(dist, "langgraph.json"));
cpSync(join(root, "mawm.json"), join(dist, "mawm.json"));
writeFileSync(
    join(dist, ".gitignore"),
    [
        "node_modules",
        "",
        "# LangGraph API",
        ".langgraph_api",
        ".langgraph-dev.json",
        ".langgraph-dev.log",
        "",
    ].join("\n"),
);
writeFileSync(
    join(dist, "package.json"),
    `${JSON.stringify(
        {
            name: pkg.name,
            private: true,
            type: pkg.type,
            dependencies: pkg.dependencies ?? {},
        },
        null,
        4,
    )}\n`,
);

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const langgraph = JSON.parse(readFileSync(join(root, "langgraph.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const distLanggraph = {
    ...langgraph,
    graphs: Object.fromEntries(
        Object.entries(langgraph.graphs ?? {}).map(([name, value]) => [
            name,
            value.replace(/^\.\/src\/graph\/index\.ts:/u, "./graph.js:"),
        ]),
    ),
};

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

cpSync(join(root, "mawm.json"), join(dist, "mawm.json"));
writeFileSync(join(dist, "langgraph.json"), `${JSON.stringify(distLanggraph, null, 2)}\n`);
writeFileSync(
    join(dist, ".gitignore"),
    [
        "node_modules",
        "",
        "# Build artifact",
        "graph.js",
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

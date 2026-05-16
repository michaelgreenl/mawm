import assert from "node:assert/strict";
import { access, chmod, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import install from "../../dist/cmd/workflow/install.js";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const exampleWorkflowRoot = join(
    repoRoot,
    "tests",
    "smoke",
    "example-target-project",
    ".mawm",
    "maws",
    "base",
);

async function collectFiles(root: string): Promise<Map<string, string>> {
    const files = new Map<string, string>();

    async function walk(currentDir: string): Promise<void> {
        const entries = await readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const absolutePath = join(currentDir, entry.name);

            if (entry.isDirectory()) {
                await walk(absolutePath);
                continue;
            }

            files.set(relative(root, absolutePath), await readFile(absolutePath, "utf8"));
        }
    }

    await walk(root);

    return files;
}

async function collectFilePaths(root: string): Promise<string[]> {
    return [...(await collectFiles(root)).keys()].sort();
}

async function exists(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function withTempProject(run: (projectRoot: string) => Promise<void>): Promise<void> {
    const projectRoot = await mkdtemp(join(tmpdir(), "mawm-workflow-install-"));

    try {
        await run(projectRoot);
    } finally {
        await rm(projectRoot, { recursive: true, force: true });
    }
}

async function createFakeSkillfish(projectRoot: string): Promise<{
    env: NodeJS.ProcessEnv;
    logPath: string;
}> {
    const binDir = join(projectRoot, "bin");
    const logPath = join(projectRoot, "skillfish.log");
    const skillfishPath = join(binDir, "skillfish");

    await mkdir(binDir, { recursive: true });
    await writeFile(
        skillfishPath,
        `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const expectedArgs = ["install", "--project", "--yes"];
const actualArgs = process.argv.slice(2);

if (JSON.stringify(actualArgs) !== JSON.stringify(expectedArgs)) {
  process.stderr.write(\`Unexpected skillfish args: \${JSON.stringify(actualArgs)}\\n\`);
  process.exit(1);
}

const manifestPath = path.join(process.cwd(), "skillfish.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expectedManifest = {
  version: 1,
  skills: ["obra/superpowers/skills/test-driven-development"],
};

if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) {
  process.stderr.write(\`Unexpected skillfish manifest: \${JSON.stringify(manifest)}\\n\`);
  process.exit(1);
}

const logPath = process.env.MAWM_TEST_SKILLFISH_LOG;
const sourceRoot = process.env.MAWM_TEST_SKILL_SOURCE;

if (!logPath || !sourceRoot) {
  process.stderr.write("Missing fake skillfish environment\\n");
  process.exit(1);
}

fs.appendFileSync(logPath, "install\\n");

const copyMissing = (sourcePath, targetPath) => {
  const entry = fs.statSync(sourcePath);

  if (entry.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true });

    for (const childName of fs.readdirSync(sourcePath)) {
      copyMissing(path.join(sourcePath, childName), path.join(targetPath, childName));
    }

    return;
  }

  if (fs.existsSync(targetPath)) {
    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
};

copyMissing(sourceRoot, path.join(process.cwd(), "skills"));
`,
    );
    await chmod(skillfishPath, 0o755);

    return {
        env: {
            PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
            MAWM_TEST_SKILLFISH_LOG: logPath,
            MAWM_TEST_SKILL_SOURCE: join(exampleWorkflowRoot, "skills"),
        },
        logPath,
    };
}

describe("install command", () => {
    it("installs a bundled workflow scaffold that matches the smoke fixture", async () => {
        await withTempProject(async (projectRoot) => {
            const { env, logPath } = await createFakeSkillfish(projectRoot);

            const exitCode = await install.run({
                args: {
                    workflow: "base",
                },
                context: {
                    cwd: projectRoot,
                    env,
                    rawArgs: [],
                },
            });

            assert.equal(exitCode, 0);
            assert.deepEqual(
                await collectFilePaths(join(projectRoot, ".mawm", "maws", "base")),
                await collectFilePaths(exampleWorkflowRoot),
            );
            assert.equal(await readFile(logPath, "utf8"), "install\n");
        });
    });

    it("installs workflow assets without stale plugin or tool references", async () => {
        await withTempProject(async (projectRoot) => {
            const { env } = await createFakeSkillfish(projectRoot);

            const exitCode = await install.run({
                args: {
                    workflow: "base",
                },
                context: {
                    cwd: projectRoot,
                    env,
                    rawArgs: [],
                },
            });

            assert.equal(exitCode, 0);

            const installedFiles = await collectFiles(join(projectRoot, ".mawm", "maws", "base"));

            assert.equal(installedFiles.has("plugins/secret-guard.ts"), false);
            assert.equal(installedFiles.has("plugins/graph-transition.ts"), false);
            assert.equal(installedFiles.has("tools/openviking-find.ts"), false);
            assert.doesNotMatch(installedFiles.get("opencode.json") ?? "", /secret-guard|graph-transition/);

            for (const [relativePath, contents] of installedFiles) {
                if (!relativePath.startsWith("agents/") || !relativePath.endsWith(".md")) {
                    continue;
                }

                assert.doesNotMatch(contents, /openviking-find/);
            }
        });
    });

    it("preserves existing workflow files and skips skillfish on rerun", async () => {
        await withTempProject(async (projectRoot) => {
            const { env, logPath } = await createFakeSkillfish(projectRoot);

            await install.run({
                args: {
                    workflow: "base",
                },
                context: {
                    cwd: projectRoot,
                    env,
                    rawArgs: [],
                },
            });

            await writeFile(
                join(projectRoot, ".mawm", "maws", "base", "opencode.json"),
                "custom opencode\n",
            );
            await writeFile(
                join(
                    projectRoot,
                    ".mawm",
                    "maws",
                    "base",
                    "skills",
                    "test-driven-developement",
                    "sentinel.txt",
                ),
                "preserve me\n",
            );

            const exitCode = await install.run({
                args: {
                    workflow: "base",
                },
                context: {
                    cwd: projectRoot,
                    env,
                    rawArgs: [],
                },
            });

            assert.equal(exitCode, 0);
            assert.equal(
                await readFile(join(projectRoot, ".mawm", "maws", "base", "opencode.json"), "utf8"),
                "custom opencode\n",
            );
            assert.equal(
                await readFile(
                    join(
                        projectRoot,
                        ".mawm",
                        "maws",
                        "base",
                        "skills",
                        "test-driven-developement",
                        "sentinel.txt",
                    ),
                    "utf8",
                ),
                "preserve me\n",
            );
            assert.equal(await readFile(logPath, "utf8"), "install\n");
        });
    });

    it("fails when the requested bundled workflow does not exist", async () => {
        await withTempProject(async (projectRoot) => {
            const exitCode = await install.run({
                args: {
                    workflow: "missing-workflow",
                },
                context: {
                    cwd: projectRoot,
                    env: {},
                    rawArgs: [],
                },
            });

            assert.equal(exitCode, 1);
            assert.equal(
                await exists(join(projectRoot, ".mawm", "maws", "missing-workflow")),
                false,
            );
        });
    });
});

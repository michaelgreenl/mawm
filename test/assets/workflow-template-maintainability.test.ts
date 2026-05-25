import { describe, expect, test } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const workflowTemplateRoot = join(root, "src", "assets", "workflow-templates");
const executeGraphToolsRoot = join(root, "src", "assets", ".config", "agents", "opencode", "tools");
const assetTestsRoot = join(root, "test", "assets");
const trackedAssetTestPattern =
    /^(base-template|execute-graph-lib|initiative-template|workflow-template).+\.ts$/;

const readLines = async (path: string): Promise<string[]> => {
    const text = (await readFile(path, "utf8")).replace(/\r/g, "");
    const lines = text.split("\n");

    if (lines.at(-1) === "") {
        lines.pop();
    }

    return lines;
};

const collectTypeScriptFiles = async (dir: string): Promise<string[]> => {
    const entries = await readdir(dir, { withFileTypes: true });
    const filesList = await Promise.all(
        entries.map(async (entry) => {
            const path = join(dir, entry.name);

            if (entry.isDirectory()) {
                return collectTypeScriptFiles(path);
            }

            return entry.name.endsWith(".ts") ? [path] : [];
        }),
    );

    return filesList.flat();
};

const collectScopedFiles = async (): Promise<string[]> => {
    const assetTestFiles = (await collectTypeScriptFiles(assetTestsRoot)).filter((path) => {
        return trackedAssetTestPattern.test(path.split("/").at(-1) ?? "");
    });

    return [
        join(root, ".opencode", "tools", "execute-graph-lib.ts"),
        join(root, "src", "config", "user-config.ts"),
        join(root, "src", "utils", "update", "global.ts"),
        ...(await collectTypeScriptFiles(workflowTemplateRoot)),
        ...(await collectTypeScriptFiles(executeGraphToolsRoot)),
        ...assetTestFiles,
    ].sort();
};

const collectWorkflowTemplateFiles = async (): Promise<string[]> => {
    return (await collectTypeScriptFiles(workflowTemplateRoot)).sort();
};

const isExportLine = (line: string): boolean => {
    const trimmed = line.trim();
    return trimmed.startsWith("export ") && !trimmed.startsWith("export {");
};

const hasJsDoc = (lines: readonly string[], index: number): boolean => {
    let current = index - 1;

    while (current >= 0 && lines[current]?.trim() === "") {
        current -= 1;
    }

    const previous = lines[current]?.trim();

    if (!previous) {
        return false;
    }

    if (previous.startsWith("/**") && previous.endsWith("*/")) {
        return true;
    }

    if (previous !== "*/") {
        return false;
    }

    current -= 1;

    while (current >= 0) {
        const line = lines[current]?.trim() ?? "";

        if (line.startsWith("/**")) {
            return true;
        }

        if (!line.startsWith("*")) {
            return false;
        }

        current -= 1;
    }

    return false;
};

describe("workflow template maintainability", () => {
    test("keeps workflow template source files at or under 200 lines per file", async () => {
        const offenders: string[] = [];

        for (const path of await collectWorkflowTemplateFiles()) {
            const lines = await readLines(path);

            if (lines.length > 200) {
                offenders.push(`${relative(root, path)} (${lines.length} lines)`);
            }
        }

        expect(offenders).toEqual([]);
    });

    test("adds JSDoc to every exported declaration in the initiative cleanup scope", async () => {
        const offenders: string[] = [];

        for (const path of await collectScopedFiles()) {
            const lines = await readLines(path);

            lines.forEach((line, index) => {
                if (isExportLine(line) && !hasJsDoc(lines, index)) {
                    offenders.push(`${relative(root, path)}:${index + 1}`);
                }
            });
        }

        expect(offenders).toEqual([]);
    });
});

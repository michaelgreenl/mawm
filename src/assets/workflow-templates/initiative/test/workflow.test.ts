import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runImplementation } from "../src/graph/implementing.ts";
import { materializeRunSpec } from "../src/graph/planning.ts";

const createSpec = async (dir: string, mode: "headless" | "manual") => {
    const path = join(dir, "initiative-spec.md");
    await writeFile(
        path,
        [
            "# Template Fixture - Initiative Spec Sheet",
            "",
            "## Target State",
            "",
            "A reusable initiative workflow template exists.",
            "",
            "## Initiative-wide Contracts",
            "",
            "- Preserve the initiative-run contract shape.",
            "",
            "## Execution Plan",
            "",
            "### Run 1: Demo run (`initiative-template`)",
            "",
            "- [ ] complete",
            "- Run spec path: `.mawm/runs/demo/spec.md`",
            "- Task: Write the run spec from the initiative context.",
            "- Current state:",
            "  - The template does not exist yet.",
            "- Outcome:",
            "  - The template writes a runnable run spec.",
            "- Scope:",
            "  - Add the workflow files.",
            "- Contracts:",
            "  - Keep the asset generic.",
            "- Verification commands:",
            "  - `bun run typecheck`",
            "  - `bun run build`",
            "  - `bun test`",
            `- Smoke verification: \`${mode}\` - ${mode === "manual" ? "Open the generated workspace and confirm the banner." : "Run the template tests."}`,
        ].join("\n"),
    );
    return path;
};

describe("initiative template workflow helpers", () => {
    test("writes a headless run spec", async () => {
        const dir = await mkdtemp(join(tmpdir(), "initiative-template-workflow-"));

        try {
            const repo = join(dir, "repo");
            await mkdir(repo, { recursive: true });
            const initiativeSpecPath = await createSpec(dir, "headless");
            const runSpecPath = join(dir, ".mawm", "runs", "demo", "spec.md");

            const result = await materializeRunSpec(
                {
                    initiativeSpecPath,
                    runSpecPath,
                    selectedRunLabel: undefined,
                },
                {
                    initiativeBranch: "initiative/workflow-templates",
                    opencodeBaseUrl: undefined,
                    parentSessionID: undefined,
                    targetRepoPath: repo,
                },
            );

            expect(result.planningDecision).toBe("accept");
            expect(await readFile(runSpecPath, "utf8")).toContain("## Verification Commands");
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    test("requests manual smoke when the generated run spec requires it", async () => {
        const dir = await mkdtemp(join(tmpdir(), "initiative-template-workflow-"));

        try {
            const repo = join(dir, "repo");
            await mkdir(repo, { recursive: true });
            const initiativeSpecPath = await createSpec(dir, "manual");
            const runSpecPath = join(dir, ".mawm", "runs", "demo", "spec.md");

            await materializeRunSpec(
                {
                    initiativeSpecPath,
                    runSpecPath,
                    selectedRunLabel: undefined,
                },
                {
                    initiativeBranch: "initiative/workflow-templates",
                    opencodeBaseUrl: undefined,
                    parentSessionID: undefined,
                    targetRepoPath: repo,
                },
            );

            const result = await runImplementation({
                finalStatus: undefined,
                implementationDecision: undefined,
                implementationRevisionCount: 0,
                implementationRevisions: undefined,
                implementationSummary: undefined,
                initiativeSpecPath,
                manualSmokeInstructions: undefined,
                planningDecision: "accept",
                planningRevisionCount: 0,
                planningRevisions: undefined,
                planningSummary: undefined,
                runSpecPath,
                selectedRunLabel: undefined,
                verificationSummary: undefined,
            });

            expect(result.implementationDecision).toBe("manual_smoke");
            expect(result.manualSmokeInstructions).toContain("Open the generated workspace");
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});

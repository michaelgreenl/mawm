import { afterAll, describe, expect, test } from "vitest";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createGraph } from "../../src/assets/workflow-templates/initiative/src/graph/index.ts";
import { implementationGate } from "../../src/assets/workflow-templates/initiative/src/graph/phases/implementing/gate.ts";
import { planningGate } from "../../src/assets/workflow-templates/initiative/src/graph/phases/planning/gate.ts";
import { runImplementation } from "../../src/assets/workflow-templates/initiative/src/graph/phases/implementing/run.ts";
import { materializeRunSpec } from "../../src/assets/workflow-templates/initiative/src/graph/phases/planning/materialize.ts";
import { spawnSync } from "../support/process.js";
import { templateDir, trackTemplateWorkspaces } from "../support/template.js";

const initiative = templateDir("initiative");
const workspaces = trackTemplateWorkspaces();

const createInitiativeSpec = async (dir: string, mode: "headless" | "manual") => {
    const spec = join(dir, "initiative-spec.md");
    await writeFile(
        spec,
        [
            "# Demo Initiative - Initiative Spec Sheet",
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
            "### Run 1: First runnable template (`initiative-template`)",
            "",
            "- [ ] complete",
            "- Run spec path: `.mawm/runs/run-1/spec.md`",
            "- Task: Materialize the selected run spec from initiative context.",
            "- Current state:",
            "  - The initiative template does not exist yet.",
            "- Outcome:",
            "  - The initiative template writes a runnable run spec.",
            "- Scope:",
            "  - Add the initiative template graph and tests.",
            "- Out of scope:",
            "  - No coding-specific prompts.",
            "- Contracts:",
            "  - Keep the workflow template generic.",
            "- Verification commands:",
            "  - `bun run typecheck`",
            "  - `bun run build`",
            "  - `bun run test`",
            `- Smoke verification: \`${mode}\` - ${mode === "manual" ? "Open the generated workspace and confirm the review checkpoint." : "Run the template test suite."}`,
        ].join("\n"),
    );
    return spec;
};

afterAll(async () => {
    await workspaces.cleanup();
});

describe("initiative template assets", () => {
    test("matches the initiative-run metadata contract", async () => {
        const meta = JSON.parse(await readFile(join(initiative, "mawm.json"), "utf8")) as {
            agents?: string[];
            displayName: string;
            executionContract: {
                optionalContext: string[];
                optionalInput: string[];
                requiredContext: string[];
                requiredInput: string[];
                supportsResume: boolean;
            };
            id: string;
            kind: string;
            phases?: string[];
        };

        expect(meta.id).toBe("initiative-template");
        expect(meta.displayName).toBe("Initiative Template");
        expect(meta.kind).toBe("initiative-run");
        expect(meta.agents).toEqual(["agent"]);
        expect(meta.phases).toEqual(["planning", "implementing"]);
        expect(meta.executionContract).toEqual({
            optionalContext: ["opencodeBaseUrl", "parentSessionID"],
            optionalInput: ["selectedRunLabel"],
            requiredContext: ["targetRepoPath", "initiativeBranch"],
            requiredInput: ["initiativeSpecPath", "runSpecPath"],
            supportsResume: true,
        });
    });

    test("creates an implementation-ready run spec from initiative context", async () => {
        const dir = await workspaces.create("initiative");
        const target = join(dir, "repo");
        await mkdir(target, { recursive: true });
        await writeFile(join(target, "README.md"), "# Demo\n");
        const initiativeSpecPath = await createInitiativeSpec(dir, "headless");
        const runSpecPath = join(dir, ".mawm", "runs", "run-1", "spec.md");

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
                targetRepoPath: target,
            },
        );

        expect(result.planningDecision).toBe("accept");
        expect(result.runSpecPath).toBe(runSpecPath);
        expect(await readFile(runSpecPath, "utf8")).toContain(
            "# Run Spec: Run 1: First runnable template",
        );
        expect(await readFile(runSpecPath, "utf8")).toContain("initiative/workflow-templates");
    });

    test("interrupts blocked planning and routes revise decisions back to implementation", () => {
        const planningInterrupts: unknown[] = [];
        const planning = planningGate(
            {
                finalStatus: undefined,
                implementationDecision: undefined,
                implementationRevisionCount: 0,
                implementationRevisions: undefined,
                implementationSummary: undefined,
                initiativeSpecPath: "initiative.md",
                manualSmokeInstructions: undefined,
                planningDecision: "blocked",
                planningRevisionCount: 0,
                planningRevisions: "Add verification commands.",
                planningSummary: "Run spec is missing verification commands.",
                runSpecPath: "run.md",
                selectedRunLabel: "Run 1: First runnable template",
                verificationSummary: undefined,
            },
            {
                interrupt: (value: unknown) => {
                    planningInterrupts.push(value);
                    return undefined;
                },
            } as never,
        );

        const implementation = implementationGate(
            {
                finalStatus: undefined,
                implementationDecision: "revise",
                implementationRevisionCount: 0,
                implementationRevisions: "Address the missing smoke instructions.",
                implementationSummary: "Needs one more implementation pass.",
                initiativeSpecPath: "initiative.md",
                manualSmokeInstructions: undefined,
                planningDecision: "accept",
                planningRevisionCount: 0,
                planningRevisions: undefined,
                planningSummary: undefined,
                runSpecPath: "run.md",
                selectedRunLabel: "Run 1: First runnable template",
                verificationSummary: undefined,
            },
            {
                interrupt: () => undefined,
            } as never,
        );

        expect(planning.goto).toEqual(["__end__"]);
        expect(planningInterrupts).toEqual([
            {
                kind: "planning_blocked",
                revisions: "Add verification commands.",
                runSpecPath: "run.md",
                selectedRunLabel: "Run 1: First runnable template",
                summary: "Run spec is missing verification commands.",
            },
        ]);
        expect(implementation.goto).toEqual(["implementing"]);
        expect(implementation.update).toEqual({
            implementationDecision: undefined,
            implementationRevisionCount: 1,
        });
    });

    test("keeps manual smoke completion behind a resume confirmation", async () => {
        const dir = await workspaces.create("initiative");
        const target = join(dir, "repo");
        await mkdir(target, { recursive: true });
        const initiativeSpecPath = await createInitiativeSpec(dir, "manual");
        const runSpecPath = join(dir, ".mawm", "runs", "run-1", "spec.md");

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
                targetRepoPath: target,
            },
        );

        const update = await runImplementation({
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

        const command = implementationGate(
            {
                ...update,
                finalStatus: undefined,
                initiativeSpecPath,
                planningDecision: "accept",
                planningRevisionCount: 0,
                planningRevisions: undefined,
                planningSummary: undefined,
                runSpecPath,
                selectedRunLabel: undefined,
            },
            {
                interrupt: () => ({
                    decision: "confirmed",
                    summary: "Confirmed by a manual smoke pass.",
                }),
            } as never,
        );

        expect(update.implementationDecision).toBe("manual_smoke");
        expect(command.update).toEqual({
            finalStatus: "completed",
            verificationSummary:
                "Planned verification commands:\n- bun run typecheck\n- bun run build\n- bun run test\n\nManual smoke verification: Confirmed by a manual smoke pass.",
        });
        expect(createGraph()).toBeDefined();
    });

    test("materializes a temp workspace that installs, builds, typechecks, and tests", async () => {
        const dir = await workspaces.create("initiative");
        await writeFile(
            join(dir, "mawm.json"),
            await readFile(join(initiative, "mawm.json"), "utf8"),
        );

        const install = spawnSync(["bun", "install"], { cwd: dir });
        expect(install.exitCode).toBe(0);

        const typecheck = spawnSync(["bun", "run", "typecheck"], { cwd: dir });
        expect(typecheck.exitCode).toBe(0);

        const build = spawnSync(["bun", "run", "build"], { cwd: dir });
        expect(build.exitCode).toBe(0);

        const tests = spawnSync(["bun", "run", "test"], { cwd: dir });
        expect(tests.exitCode).toBe(0);

        const meta = JSON.parse(await readFile(join(dir, "dist", "mawm.json"), "utf8")) as {
            kind: string;
        };
        const langgraph = JSON.parse(
            await readFile(join(dir, "dist", "langgraph.json"), "utf8"),
        ) as {
            graphs: Record<string, string>;
        };

        expect(meta.kind).toBe("initiative-run");
        expect(langgraph.graphs.agent).toBe("./graph.js:graph");
    });
});

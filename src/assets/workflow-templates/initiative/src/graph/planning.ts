import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, relative } from "node:path";
import type { WorkflowContext, WorkflowState, WorkflowUpdate } from "./state.js";

type Run = {
    readonly contracts?: string;
    readonly currentState?: string;
    readonly outOfScope?: string;
    readonly outcome?: string;
    readonly runSpecPath?: string;
    readonly scope?: string;
    readonly smokeMethod?: string;
    readonly smokeMode?: string;
    readonly task?: string;
    readonly title: string;
    readonly verificationCommands?: readonly string[];
    readonly workflow?: string;
};

type Initiative = {
    readonly contracts?: string;
    readonly title: string;
    readonly runs: readonly Run[];
    readonly targetState?: string;
};

const fields = new Map([
    ["Contracts", "contracts"],
    ["Current state", "currentState"],
    ["Out of scope", "outOfScope"],
    ["Outcome", "outcome"],
    ["Run spec path", "runSpecPath"],
    ["Scope", "scope"],
    ["Smoke verification", "smokeVerification"],
    ["Task", "task"],
    ["Verification commands", "verificationCommands"],
] as const);

const clean = (value: string) => value.trim().replace(/\r/g, "");

const section = (text: string, heading: string) => {
    const marker = `## ${heading}`;
    const start = text.indexOf(marker);

    if (start < 0) {
        return undefined;
    }

    const from = text.indexOf("\n", start);
    const end = text.indexOf("\n## ", from + 1);

    return text.slice(from + 1, end < 0 ? undefined : end).trim();
};

const block = (lines: readonly string[]) => {
    const values = [...lines];

    while (values[0]?.trim() === "") {
        values.shift();
    }

    while (values.at(-1)?.trim() === "") {
        values.pop();
    }

    return values
        .map((line) => line.replace(/^ {2}/, ""))
        .join("\n")
        .trim();
};

const bullets = (value: string | undefined) => {
    if (!value) {
        return undefined;
    }

    const values = value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2).trim())
        .filter((line) => line.length > 0);

    return values.length > 0 ? values : undefined;
};

const repo = async (dir: string) => {
    try {
        const info = await stat(dir);

        if (!info.isDirectory()) {
            return [`- Target repo path is not a directory: \`${dir}\``];
        }

        const entries = await readdir(dir);

        return [`- Target repo path: \`${dir}\``, `- Repo top-level entries: ${entries.length}`];
    } catch {
        return [`- Target repo path does not exist yet: \`${dir}\``];
    }
};

const parseRun = (text: string): Run => {
    const [head, ...rest] = clean(text).split("\n");
    const header = head.match(/^Run (?<index>\d+): (?<title>.+?)(?: \(`(?<workflow>[^`]+)`\))?$/);
    const body = new Map<string, string[]>();
    let key: string | undefined;

    for (const line of rest) {
        const field = line.match(/^- (?<label>[A-Za-z ]+):(?:\s*(?<value>.*))?$/);

        if (field?.groups?.label && fields.has(field.groups.label as never)) {
            key = fields.get(field.groups.label as never);
            body.set(key ?? "", field.groups.value ? [field.groups.value] : []);
            continue;
        }

        if (!key || /^- \[[ x]\] complete$/.test(line.trim())) {
            continue;
        }

        body.get(key)?.push(line);
    }

    const smoke = block(body.get("smokeVerification") ?? []).match(
        /^`(?<mode>[^`]+)`\s*-\s*(?<method>[\s\S]+)$/,
    );

    return {
        contracts: block(body.get("contracts") ?? []),
        currentState: block(body.get("currentState") ?? []),
        outOfScope: block(body.get("outOfScope") ?? []),
        outcome: block(body.get("outcome") ?? []),
        runSpecPath: block(body.get("runSpecPath") ?? []),
        scope: block(body.get("scope") ?? []),
        smokeMethod: smoke?.groups?.method?.trim(),
        smokeMode: smoke?.groups?.mode?.trim(),
        task: block(body.get("task") ?? []),
        title: header?.groups?.title?.trim()
            ? `Run ${header.groups.index}: ${header.groups.title.trim()}`
            : head,
        verificationCommands: bullets(block(body.get("verificationCommands") ?? [])),
        workflow: header?.groups?.workflow?.trim(),
    };
};

const parseInitiative = (text: string): Initiative => {
    const title = text.match(/^# (?<title>.+)$/m)?.groups?.title?.trim() ?? "Initiative";
    const plan = section(text, "Execution Plan") ?? "";
    const parts = plan
        .split(/^### /m)
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map(parseRun);

    return {
        contracts: section(text, "Initiative-wide Contracts"),
        runs: parts,
        targetState: section(text, "Target State"),
        title,
    };
};

const selected = (runs: readonly Run[], label: string | undefined) => {
    if (label) {
        return runs.find(
            (run) => run.title === label || run.title.endsWith(label) || run.title.includes(label),
        );
    }

    return runs[0];
};

const missing = (run: Run) => {
    const values = [
        ["Assigned Workflow", run.workflow],
        ["Task", run.task],
        ["Goal (Run Outcome)", run.outcome],
        ["Scope", run.scope],
        ["Contracts", run.contracts],
        ["Verification Commands", run.verificationCommands?.join("\n")],
        ["Smoke Verification", `${run.smokeMode ?? ""}${run.smokeMethod ?? ""}`],
    ] as const;

    return values.filter(([, value]) => !value || value.trim().length === 0).map(([name]) => name);
};

const lines = (value: string | undefined, fallback: readonly string[]) => {
    if (!value || value.trim().length === 0) {
        return [...fallback];
    }

    return value.split("\n");
};

const plan = (run: Run) =>
    [
        `1. Re-read \`${run.runSpecPath ?? "the selected run entry"}\` alongside the target repository state before implementation begins.`,
        "2. Implement only the work described in this run spec and keep the diff inside scope.",
        "3. Run the listed verification commands and record the results in the implementation summary.",
        run.smokeMode === "manual"
            ? "4. Pause for manual smoke verification and resume the workflow only after a human confirms the result."
            : "4. Complete the headless smoke verification flow before promoting the run.",
    ].join("\n");

const render = async (
    initiative: Initiative,
    run: Run,
    context: WorkflowContext,
    runSpecPath: string,
) => {
    const state = await repo(context.targetRepoPath);
    const contracts = [initiative.contracts, run.contracts].filter(Boolean).join("\n\n").trim();

    const commands =
        run.verificationCommands?.map((value) => `- ${value}`).join("\n") ??
        "- Add verification commands before implementation proceeds.";

    const currentState = [
        ...lines(run.currentState, ["- The initiative spec did not include current-state notes."]),
        `- Initiative branch: \`${context.initiativeBranch}\``,
        ...state,
        `- Requested run spec path: \`${runSpecPath}\``,
        ...(run.runSpecPath && clean(run.runSpecPath) !== runSpecPath
            ? [`- Initiative spec run path: \`${clean(run.runSpecPath)}\``]
            : []),
    ].join("\n");

    const goal =
        run.outcome ??
        initiative.targetState ??
        "Define the intended run outcome before implementation proceeds.";

    const scope = run.scope ?? "- Scope is missing from the initiative spec.";
    const outOfScope = run.outOfScope ?? "- No work outside the selected run entry.";

    const contractSection =
        contracts.length > 0
            ? contracts
            : "- Keep the workflow template generic and initiative-run compatible.";

    const smokeMethod =
        run.smokeMethod ?? "Define the smoke verification method before implementation proceeds.";
    const manual =
        run.smokeMode === "manual"
            ? (run.smokeMethod ?? "Complete the manual smoke flow and record the result.")
            : "None.";

    return `# Run Spec: ${run.title}

## Assigned Workflow

\`${run.workflow ?? "initiative-template"}\`

## Task

${run.task ?? "Fill in the run task before implementation proceeds."}

## Current State

${currentState}

## Goal (Run Outcome)

${goal}

## Scope

${scope}

## Out of Scope

${outOfScope}

## Contracts

${contractSection}

## Implementation Plan

${plan(run)}

## Verification Commands

${commands}

## Smoke Verification

- Mode: \`${run.smokeMode ?? "manual"}\`
- Method: ${smokeMethod}
- Manual instructions, if needed: ${manual}

## Completion Gate

- TDD implementation is complete within scope.
- Code review is clear or all findings have been resolved.
- Verification commands pass.
- Smoke verification passes, or HITL confirms manual smoke instructions were completed.
- Run is ready to become one commit on the initiative branch.
`;
};

export const materializeRunSpec = async (
    input: Pick<
        WorkflowState,
        "initiativeSpecPath" | "planningRevisionCount" | "runSpecPath" | "selectedRunLabel"
    >,
    context: WorkflowContext,
): Promise<WorkflowUpdate> => {
    const source = await readFile(input.initiativeSpecPath, "utf8");
    const initiative = parseInitiative(source);
    const run = selected(initiative.runs, input.selectedRunLabel);
    const issues = run ? missing(run) : ["Selected Run"];
    const summary = run
        ? issues.length === 0
            ? `Generated run spec for ${run.title}.`
            : `Generated run spec for ${run.title}, but planning is blocked: ${issues.join(", ")}.`
        : `Planning is blocked: unable to resolve ${input.selectedRunLabel ?? "the selected run"}.`;
    const doc = await render(
        initiative,
        run ?? {
            scope: "- Select a run entry from the initiative spec before implementation proceeds.",
            smokeMethod: "Pick a smoke verification method after selecting a run.",
            smokeMode: "manual",
            task: "Select a run entry from the initiative spec.",
            title: input.selectedRunLabel ?? "Unresolved run",
        },
        context,
        input.runSpecPath,
    );

    await mkdir(dirname(input.runSpecPath), { recursive: true });
    await writeFile(input.runSpecPath, doc);

    return {
        planningDecision: issues.length === 0 ? "accept" : "blocked",
        planningRevisionCount:
            issues.length === 0
                ? (input.planningRevisionCount ?? 0)
                : (input.planningRevisionCount ?? 0) + 1,
        planningRevisions:
            issues.length === 0
                ? undefined
                : `Complete the missing planning fields: ${issues.join(", ")}.`,
        planningSummary: summary,
        runSpecPath: input.runSpecPath,
        selectedRunLabel: run?.title ?? input.selectedRunLabel,
    };
};

export const summarizeRunSpecPath = (from: string, to: string) => {
    const value = relative(dirname(from), to);
    return value.length > 0 ? value : to;
};

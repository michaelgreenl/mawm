/** Parsed run entry extracted from an initiative spec. */
export interface InitiativeRun {
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
}

/** Parsed initiative document data used to render a run spec. */
export interface InitiativeSpec {
    readonly contracts?: string;
    readonly title: string;
    readonly runs: readonly InitiativeRun[];
    readonly targetState?: string;
}

const fields = new Map<string, string>([
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

const parseRun = (text: string): InitiativeRun => {
    const [head, ...rest] = clean(text).split("\n");
    const header = head.match(/^Run (?<index>\d+): (?<title>.+?)(?: \(`(?<workflow>[^`]+)`\))?$/);
    const body = new Map<string, string[]>();
    let key: string | undefined;

    for (const line of rest) {
        const field = line.match(/^- (?<label>[A-Za-z ]+):(?:\s*(?<value>.*))?$/);
        const mappedKey = field?.groups?.label ? fields.get(field.groups.label) : undefined;

        if (mappedKey) {
            key = mappedKey;
            body.set(mappedKey, field?.groups?.value ? [field.groups.value] : []);
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

/** Parse an initiative spec into the run metadata needed by the planning node. */
export const parseInitiative = (text: string): InitiativeSpec => {
    const title = text.match(/^# (?<title>.+)$/m)?.groups?.title?.trim() ?? "Initiative";
    const plan = section(text, "Execution Plan") ?? "";
    const runs = plan
        .split(/^### /m)
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map(parseRun);

    return {
        contracts: section(text, "Initiative-wide Contracts"),
        runs,
        targetState: section(text, "Target State"),
        title,
    };
};

/** Select the requested run entry, defaulting to the first run in the initiative spec. */
export const selectInitiativeRun = (
    runs: readonly InitiativeRun[],
    label: string | undefined,
): InitiativeRun | undefined => {
    if (label) {
        return runs.find(
            (run) => run.title === label || run.title.endsWith(label) || run.title.includes(label),
        );
    }

    return runs[0];
};

/** List the required run fields that must exist before planning can proceed. */
export const listMissingRunFields = (run: InitiativeRun): string[] => {
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

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { outputHelp, parseCommand, parseCommandName } from "../../dist/cmd/parsers.js";

async function captureProcessOutput(
    run: () => Promise<number>,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    process.stdout.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
        stdoutChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));

        const callback = args.at(-1);

        if (typeof callback === "function") {
            callback();
        }

        return true;
    }) as typeof process.stdout.write;

    process.stderr.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
        stderrChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));

        const callback = args.at(-1);

        if (typeof callback === "function") {
            callback();
        }

        return true;
    }) as typeof process.stderr.write;

    try {
        const exitCode = await run();

        return {
            exitCode,
            stdout: stdoutChunks.join(""),
            stderr: stderrChunks.join(""),
        };
    } finally {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    }
}

describe("command parsers", () => {
    it("resolves the install alias to the canonical command name", () => {
        assert.equal(parseCommandName(["install"]), "install");
        assert.equal(parseCommandName(["i"]), "install");
        assert.equal(parseCommandName(["workflow"]), undefined);
    });

    it("shows install, list, and run as top-level commands", () => {
        const help = outputHelp();

        assert.match(help, /mawm \{i,install\} <workflow>/);
        assert.match(help, /mawm list/);
        assert.match(help, /mawm run <workflow>/);
        assert.doesNotMatch(help, /mawm workflow/);
    });

    it("treats workflow as an unknown command", async () => {
        const { exitCode, stdout, stderr } = await captureProcessOutput(async () => {
            return await parseCommand(["workflow"], {
                cwd: process.cwd(),
                env: {},
                rawArgs: ["workflow"],
            });
        });

        assert.equal(exitCode, 1);
        assert.equal(stdout, "");
        assert.match(stderr, /^Unknown command: workflow\n\nUsage: mawm <command>/);
    });
});

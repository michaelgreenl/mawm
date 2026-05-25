/** Captures process.stdout and process.stderr writes during an async run. */
export const captureOutput = async (run: () => Promise<number>) => {
    let stdout = "";
    let stderr = "";
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;

    process.stdout.write = ((chunk: string | Uint8Array) => {
        stdout += chunk.toString();
        return true;
    }) as typeof process.stdout.write;

    process.stderr.write = ((chunk: string | Uint8Array) => {
        stderr += chunk.toString();
        return true;
    }) as typeof process.stderr.write;

    try {
        const exitCode = await run();
        return { exitCode, stderr, stdout };
    } finally {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    }
};

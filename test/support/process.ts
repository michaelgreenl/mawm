import { spawnSync as nodeSpawnSync } from "node:child_process";

/** Normalized result of a synchronous subprocess invocation. */
export interface SpawnResult {
    exitCode: number;
    stderr: Buffer;
    stdout: Buffer;
}

/** Runs a command synchronously using Node's child_process.spawnSync. */
export const spawnSync = (
    cmd: readonly string[],
    options: { cwd: string; env?: NodeJS.ProcessEnv },
): SpawnResult => {
    const [command, ...args] = cmd;

    if (!command) {
        throw new Error("spawnSync requires at least one command argument");
    }

    const result = nodeSpawnSync(command, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: ["ignore", "pipe", "pipe"],
    });

    return {
        exitCode: result.status ?? 1,
        stderr: result.stderr ?? Buffer.alloc(0),
        stdout: result.stdout ?? Buffer.alloc(0),
    };
};

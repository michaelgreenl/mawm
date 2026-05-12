export type OpencodeInterrupt = {
    type: "opencode-session";
    nodeName: string;
    sessionID: string;
    serverUrl: string;
    attachCommand: string[];
    auth?: {
        username: string;
        passwordEnvVar: "OPENCODE_SERVER_PASSWORD";
    };
};

export type WorkerCommand =
    | {
          type: "start";
          threadID: string;
          input?: unknown;
      }
    | {
          type: "resume";
          value?: unknown;
      }
    | {
          type: "stop";
      };

export type WorkerEvent =
    | {
          type: "interrupt";
          interrupt: OpencodeInterrupt;
      }
    | {
          type: "result";
          result: unknown;
      }
    | {
          type: "error";
          error: string;
      };

export type WorkerTransport = {
    start(threadID: string, input?: unknown): Promise<WorkerEvent>;
    resume(value?: unknown): Promise<WorkerEvent>;
    close(): Promise<void>;
};

export type WorkerGraph = {
    invoke(input: unknown, config: { configurable: { thread_id: string } }): Promise<unknown>;
};

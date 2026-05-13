declare module "@opencode-ai/plugin" {
    export type Plugin = (
        input: unknown,
        options?: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;

    export type PluginModule = {
        id?: string;
        server: Plugin;
        tui?: never;
    };
}

declare module "@opencode-ai/plugin/tool" {
    type SchemaValue = {
        trim(): SchemaValue;
        min(_value: number): SchemaValue;
        max(_value: number): SchemaValue;
        int(): SchemaValue;
        optional(): SchemaValue;
        describe(_text: string): SchemaValue;
    };

    type SchemaFactory = {
        string(): SchemaValue;
        number(): SchemaValue;
    };

    export type ToolContext = {
        metadata(input: { title?: string; metadata?: Record<string, unknown> }): void;
    };

    export function tool<Args extends Record<string, SchemaValue>>(input: {
        description: string;
        args: Args;
        execute(args: Record<keyof Args, unknown>, context: ToolContext): Promise<string>;
    }): {
        description: string;
        args: Args;
        execute(args: Record<keyof Args, unknown>, context: ToolContext): Promise<string>;
    };

    export namespace tool {
        let schema: SchemaFactory;
    }
}

/** CLI value kind names supported by arguments and options. */
export type ValueTypeName = "string" | "number" | "boolean";

/** Runtime value mapped from a CLI value kind. */
export type ValueTypeMap = {
    string: string;
    number: number;
    boolean: boolean;
};

/** Declarative positional argument definition. */
export type ArgDef<
    Name extends string = string,
    T extends ValueTypeName = ValueTypeName,
    Required extends boolean = boolean,
    Variadic extends boolean = boolean,
    Default = undefined,
> = {
    name: Name;
    description?: string;
    usage?: string;
    type?: T;
    required?: Required;
    variadic?: Variadic;
    defaultValue?: Default;
};

/** Any supported positional argument definition. */
export type AnyArgDef = ArgDef<string, ValueTypeName, boolean, boolean, unknown>;

/** Declarative named option definition. */
export type OptionDef<
    Name extends string = string,
    T extends ValueTypeName = "boolean",
    Required extends boolean = boolean,
    Default = undefined,
> = {
    name: Name;
    alias?: string;
    description?: string;
    omittedValue?: ValueTypeMap[T];
    usage?: string;
    type?: T;
    required?: Required;
    defaultValue?: Default;
};

/** Any supported named option definition. */
export type AnyOptionDef = OptionDef<string, ValueTypeName, boolean, unknown>;

import init from "./init.js";
import ov from "./ov/index.js";
import workflow from "./workflow/index.js";

const commands = [init, ov, workflow] as const;

export default commands;

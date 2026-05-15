import init from "./init.js";
import workflow from "./workflow/index.js";

const commands = [init, workflow] as const;

export default commands;

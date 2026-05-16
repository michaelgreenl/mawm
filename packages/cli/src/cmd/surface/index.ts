import init from "./init.js";
import install from "./install.js";
import list from "./list.js";
import run from "./run.js";

const commands = [init, install, list, run] as const;

export default commands;

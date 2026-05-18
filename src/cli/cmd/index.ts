import init from "./init.js";
import install from "./install.js";
import list from "./list.js";

const commands = [init, install, list] as const;

export default commands;

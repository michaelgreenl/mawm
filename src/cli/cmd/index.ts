import init from "./init.js";
import install from "./install.js";
import list from "./list.js";
import register from "./register.js";

const commands = [init, install, list, register] as const;

export default commands;

import init from "./init.js";
import install from "./install.js";
import list from "./list.js";
import update from "./update.js";

const commands = [init, install, update, list] as const;

export default commands;

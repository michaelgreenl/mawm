import { defineCommand } from "../../types/commands.js";
import install from "./install.js";
import run from "./run.js";
import list from "./list.js";

const subCommands = [install, run, list] as const;

const workflow = defineCommand({
    name: "workflow",
    description: "Used to install, list, or run installed workflows",
    usage: "workflow [install, run, list]",
    subCommands,
});

export default workflow;

import { defineSubCommand } from "../../utils/commands/types.js";

const list = defineSubCommand({
    name: "list",
    parent: "workflow",
    description: "Lists installed workflows",
    usage: "workflow list",
    run() {
        console.log("command: workflow list");
        return 0;
    },
});

export default list;

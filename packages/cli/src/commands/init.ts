import { defineCommand } from "../utils/commands/types.js";

const init = defineCommand({
    name: "init",
    description: "Initializing MAWM within a project",
    usage: "init",
    // eslint-disable-next-line
    run({ context }) {
        console.log("command: init");
        return 0;
    },
});

export default init;

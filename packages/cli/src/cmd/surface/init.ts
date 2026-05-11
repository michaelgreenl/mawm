import { defineCommand } from "../../types/commands.js";

const init = defineCommand({
    name: "init",
    description: "Initializing MAWM within a project",
    usage: "init",
    // eslint-disable-next-line
    run({ context }) {
        // TODO: non-destructively initialize `<target-project>/.mawm/`

        console.log("command: init");
        return 0;
    },
});

export default init;

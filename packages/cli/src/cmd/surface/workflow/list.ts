import { defineSubCommand } from "../../../types/commands.js";

const list = defineSubCommand({
    name: "list",
    parent: "workflow",
    description: "Lists installed workflows",
    usage: "workflow list",
    // eslint-disable-next-line
    run({ context }) {
        // TODO: index `<target-project>/.mawm/maws/<workflows>` and list all the workflows in maws/

        console.log("command: workflow list");
        return 0;
    },
});

export default list;

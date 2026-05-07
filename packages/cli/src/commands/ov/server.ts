import { defineSubCommand } from "../../utils/commands/types.js";

const server = defineSubCommand({
    name: "server",
    parent: "ov",
    description: "Starts an OpenViking server",
    usage: "ov server",
    // eslint-disable-next-line
    run({ context }) {
        console.log("command: ov server");
        return 0;
    },
});

export default server;

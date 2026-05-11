import { defineCommand } from "../../../types/commands.js";
import scan from "./scan.js";
import server from "./server.js";

const subCommands = [scan, server] as const;

const ov = defineCommand({
    name: "ov",
    description: "Extends OpenViking's capabilities to TypeScript",
    usage: "ov [scan, server]",
    subCommands,
});

export default ov;

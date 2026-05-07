import { defineSubCommand, arg } from "../../utils/commands/types.js";

const scan = defineSubCommand({
    name: "scan",
    parent: "ov",
    description: "Scans a target project using `ov add-resource`",
    usage: "ov scan <target-path> [...openviking-args]",
    args: [arg("target", { required: false, defaultValue: "." })],
    run({ args }) {
        const target = args.target;

        console.log(`target: ${target}`);
        return 0;
    },
});

export default scan;

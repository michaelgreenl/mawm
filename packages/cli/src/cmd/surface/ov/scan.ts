import { defineSubCommand, arg } from "../../../types/commands.js";

const scan = defineSubCommand({
    name: "scan",
    parent: "ov",
    description: "Scans a target project using `ov add-resource`",
    usage: "ov scan <target-path> [...openviking-args]",
    args: [arg("target", { required: false, defaultValue: "." })],
    // eslint-disable-next-line
    run({ args, context }) {
        // TODO: Use openviking's `ov add-resource` to index the target
        //  use configs from `<target-project>/.mawm/`
        //  store in openviking db in `<target-project>/.mawm/openviking/`

        const target = args.target;
        console.log(`target: ${target}`);
        return 0;
    },
});

export default scan;

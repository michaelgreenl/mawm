import { defineSubCommand, arg } from "../../utils/commands/types.js";

const install = defineSubCommand({
    name: "install",
    parent: "workflow",
    description: "Installs workflows into a target project",
    usage: "workflow install <workflow>",
    args: [arg("workflow", { required: true })],
    // eslint-disable-next-line
    run({ args, context }) {
        if (!args.workflow) {
            // required arg error
            return 1;
        }

        const workflow = args.workflow;
        console.log(`workflow: ${workflow}`);
        return 0;
    },
});

export default install;

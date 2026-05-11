import { defineSubCommand, arg } from "../../types/commands.js";

const install = defineSubCommand({
    name: "install",
    parent: "workflow",
    description: "Installs workflows into a target project",
    usage: "workflow install <workflow>",
    args: [arg("workflow", { required: true })],
    // eslint-disable-next-line
    run({ args, context }) {
        // TODO: index ../../../assets/workflows/manifest.json and install given workflow

        const workflow = args.workflow;
        console.log(`workflow: ${workflow}`);
        return 0;
    },
});

export default install;

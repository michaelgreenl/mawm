import { defineSubCommand, arg } from "../../utils/commands/types.js";

const run = defineSubCommand({
    name: "run",
    parent: "workflow",
    description: "Executes installed workflows",
    usage: "workflow run <workflow>",
    args: [arg("workflow", { required: true })],
    // eslint-disable-next-line
    run({ args, context }) {
        if (!args.workflow) {
            // required arg error
            return 1;
        }

        const workflow: string = args.workflow;
        console.log(`workflow: ${workflow}`);
        return 0;
    },
});

export default run;

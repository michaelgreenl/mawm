import { defineSubCommand, arg } from "../../types/commands.js";

const run = defineSubCommand({
    name: "run",
    parent: "workflow",
    description: "Executes installed workflows",
    usage: "workflow run <workflow>",
    args: [arg("workflow", { required: true })],
    // eslint-disable-next-line
    run({ args, context }) {
        // TODO: find `<target-project>/.mawm/maws/<workflow>` and execute the workflow

        const workflow = args.workflow;
        console.log(`workflow: ${workflow}`);
        return 0;
    },
});

export default run;

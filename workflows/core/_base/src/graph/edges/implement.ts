const transition = {
  agent: "planner",
  command: "/implement",
  handoff: {
    from: "planner",
    to: "manager",
  },
  payload: {
    phasePlanPath: {
      required: true,
      type: "project-root-relative-active-phase-plan-path",
    },
    brief: {
      required: true,
      type: "string",
    },
    startStep: {
      required: false,
      type: "phase-step-number",
    },
  },
};

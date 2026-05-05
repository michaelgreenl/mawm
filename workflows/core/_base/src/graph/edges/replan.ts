const transition = {
  agent: "manager",
  command: "/replan",
  handoff: {
    from: "manager",
    to: "planner",
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
    currentStep: {
      required: false,
      type: "phase-step-number",
    },
  },
};

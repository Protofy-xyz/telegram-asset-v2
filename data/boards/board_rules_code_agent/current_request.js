const input = params?.input;
const jobParams = input?.params;

if (!input || !jobParams) {
  // No current job to process
  return params;
}

await executeAction({
  name: "prompt", params: {
    states: jobParams.states ?? "",
    actions: jobParams.actions ?? "",
    rules: jobParams.rules,
    previousRules: jobParams.previousRules,
    requestId: input.id,
  }
})

return params

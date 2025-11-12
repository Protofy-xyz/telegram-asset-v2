return Object.fromEntries(
  Object.keys(states.templates.agent).map(k => [k, states.templates.agent[k].description])
);
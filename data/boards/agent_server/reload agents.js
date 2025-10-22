const aliases = await context.state.getStateTree({ chunk: 'proxy' });
const boards = aliases.boards || {};

const filtered = Object.entries(boards)
  .filter(([_, value]) =>
    Object.values(value).some(
      v => typeof v.alias === "string" && /^\/api\/agents\/v1\/.+/.test(v.alias)
    )
  )
  .map(([key, value]) => {
    const alias = Object.values(value).find(
      v => typeof v.alias === "string" && /^\/api\/agents\/v1\/.+/.test(v.alias)
    )?.alias;
    return [key, { name: key, target: alias }];
  });

const filteredObj = Object.fromEntries(filtered);
return filteredObj;

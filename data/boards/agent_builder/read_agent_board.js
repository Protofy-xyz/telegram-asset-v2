return {
    content: await context.apis.fetch('get', '/api/core/v1/boards/'+params.name+'?token='+token)
    state: states?.boards?.[params.name]
}
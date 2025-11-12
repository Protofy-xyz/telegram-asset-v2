// return {
//     url: params.url + '?token='+token,
//     name: params.name,
//     template: 'smart ai agent'
// }
return await context.apis.fetch(params.method ?? 'get', params.url + '?token='+token, {
    name: params.name,
    template: {id: params.template}
})
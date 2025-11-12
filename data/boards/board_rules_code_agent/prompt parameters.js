// // Genera un nuevo objeto basado en los params de la card. Intenta convertir cada valor de string a objeto JSON. Si el valor no es un JSON válido, lo deja tal cual.

const promptParams = {
    states: board?.["current_request"]?.["input"]?.["params"]?.["states"],
    actions: board?.["current_request"]?.["input"]?.["params"]?.["actions"],
    rules: board?.["current_request"]?.["input"]?.["params"]?.["rules"],
    previousRules: board?.["current_request"]?.["input"]?.["params"]?.["previousRules"]
}

return Object.fromEntries(Object.entries(promptParams).map(([key, value]) => {
    try {
        return [key, JSON.parse(value??"")];
    } catch {
        return [key, value];
    }
}));
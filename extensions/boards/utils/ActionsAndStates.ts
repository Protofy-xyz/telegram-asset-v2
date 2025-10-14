export const generateStateCode = (properties, target?: "boards" | "state") => {
    try {
        const root = target === "boards"
            ? `states?.boards`
            : 'board'
        return root + properties
            .filter(v => v)
            .map(k => `?.[${JSON.stringify(k)}]`)
            .join('')
    } catch (err) {
        console.error("cannot generate state code for " + properties + ", ", err)
        return ''
    }
}

export const generateActionCode = (actionName, params = null) => {
    try {
        if (params) {
            return `await executeAction({name: "${actionName}", params: {
${Object.entries(params || {}).map(([key, value]) => {
                return `\t${key}: '', // ${value}`;
            }).join('\n')}
}})`
        } else {
            return `await executeAction({name: "${actionName}"})`
        }
    } catch (err) {
        console.error("cannot generate action code for " + actionName + ", ", err)
        return ''
    }
}
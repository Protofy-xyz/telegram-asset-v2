import { API, getServiceToken } from "protobase";

const callModel = async (prompt) => {
    const res = await API.post("/api/agents/v1/llm_agent/agent_input?token=" + getServiceToken(), {
        prompt
    })

    return res.data
}

const cleanCode = (code) => {
    //remove ```(plus anything is not an space) from the beginning of the code
    //remove ``` from the end of the code
    let cleaned = code.replace(/^```[^\s]+/g, '').replace(/```/g, '').trim()
    //remove 'javascript' from the beginning of the code if it exists
    if (cleaned.startsWith('javascript')) {
        cleaned = cleaned.replace('javascript', '').trim()
    }
    return cleaned
}


export const ai = {
    callModel: async (prompt) => {
        return await callModel(prompt)
    },
    cleanCode: (code) => {
        return cleanCode(code)
    }
} 
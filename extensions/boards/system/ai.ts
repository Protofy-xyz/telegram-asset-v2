import { getLogger } from "protobase";
const logger = getLogger();

export const callModel = async (prompt, context, provider='chatgpt', options = {}) => {
    let reply;
    if (provider === 'chatgpt') {
        reply = await context.chatgpt.chatGPTPrompt({
            ...options,
            message: prompt
        })

        let raw = reply
        let content = reply?.[0]

        if (reply?.isError) {
            console.error("Error calling AI provider:", reply.data.error.message)
            content = "// Error: " + reply.data.error.message
            logger.error(`Error on calling AI ${provider} provider: ${reply.data.error.message}` )
        }

        reply = {
            choices: [
                {
                    message: {
                        content
                    }
                }
            ]
        }

        if (!content) {
            reply["raw"] = raw
        }

    } else {
        reply = await context.lmstudio.chatWithModel(prompt, 'qwen2.5-coder-32b-instruct')
    }
    return reply
}
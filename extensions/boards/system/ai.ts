export const callModel = async (prompt, context, provider='chatgpt') => {
    let reply;
    if (provider === 'chatgpt') {
        reply = await context.chatgpt.chatGPTPrompt({
            message: prompt
        })

        let raw = reply
        let content = reply?.[0]

        if (reply?.isError) {
            content = "// Error: " + reply.data.error.message
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
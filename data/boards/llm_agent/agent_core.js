let reply;
const prompt = params.prompt
const provider = params.provider
const model = params.model

if (provider === 'chatgpt') {
  reply = await context.chatgpt.chatGPTPrompt({
    message: prompt,
    model: model ?? "gpt-4o"
  });

  let raw = reply
  let content = reply?.[0]

  if (reply?.isError) {
    console.error("Error calling AI provider:", reply.data.error.message)
    content = "// Error: " + reply.data.error.message
    logger.error(`Error on calling AI ${provider} provider: ${reply.data.error.message}`)
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
  reply = await context.lmstudio.chatWithModel(prompt, model)
}
return reply

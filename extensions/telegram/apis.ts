import { API, generateEvent } from "protobase";
import { AutoAPI, handler, getServiceToken } from 'protonode'
import { getLogger } from 'protobase';
import { addAction } from "@extensions/actions/coreContext/addAction";
import { addCard } from "@extensions/cards/coreContext/addCard";
import { getKey } from "@extensions/keys/coreContext";
import { Telegraf } from 'telegraf';

const GENERATE_EPHEMERAL_EVENT = true;
const logger = getLogger()

const onboardingHtml = async (botUsername) => {
  if (!botUsername) {
    return `
return card({
  content: \`
    \${icon({ name: data.icon, color: data.color, size: '48' })}
    Add TELEGRAM_BOT_TOKEN & TELEGRAM_BOT_USERNAME on "keys" to enable Telegram support
  \`
});
`;
  }
  const link = `https://t.me/${botUsername}`;
  return `
//data contains: data.value, data.icon and data.color
return card({
  content: \`
    \${icon({ name: data.icon, color: data.color, size: '48' })}
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div>Scan or tap to open your Telegram bot:</div>
      <a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a>
    </div>
  \`
});
`;
}

const registerActions = async (context) => {
  addAction({
    group: 'telegram',
    name: 'message',
    url: `/api/v1/telegram/send/message`,
    tag: "send",
    description: "send a telegram message to a chat id",
    params: { chat_id: "Telegram chat id (number). Example: 123456789", message: "message value to send" },
    emitEvent: true,
    token: await getServiceToken()
  })
}

const registerCards = async (context, botUsername) => {
  addCard({
    group: 'telegram',
    tag: "received",
    id: 'telegram_received_message',
    templateName: "Telegram last received message",
    name: "message",
    defaults: {
      width: 3,
      height: 10,
      name: "Telegram last received message",
      icon: "send",
      color: "#24A1DE",
      description: "telegram last received message",
      html: "//@card/react\n\nfunction Widget(card) {\n    const value = card.value;\n    const message = value?.content ?? \"No message\"\n    const sender = value?.from ?? \"\"\n    const chatId = value?.chat_id ?? \"\"\n\n    return (\n        <Tinted>\n            <ProtoThemeProvider forcedTheme= { window.TamaguiTheme }>\n                <YStack gap=\"$3\" p=\"$3\">\n                    <XStack gap=\"$2\" ai=\"center\">\n                        <YStack jc=\"center\" ai=\"center\" p=\"$2\" bc={card.color} br=\"$20\" mr=\"$1\">\n                            <Icon name={data.icon} size={16} color={\"white\"}/>\n                        </YStack>\n                        <Text fow=\"600\" fos=\"$3\">{sender}</Text>\n                        <Text fow=\"100\" fos=\"$3\" o={0.3}>{chatId}</Text>\n                    </XStack>\n                    <YStack bc={\"$bgContent\"} p=\"$2\" br=\"$4\">\n                        <Markdown readOnly={ true } data={message} />\n                    </YStack>\n                </YStack>\n            </ProtoThemeProvider>\n        </Tinted>\n  );\n}\n",
      rulesCode: `return states?.telegram?.received?.message`,
      type: 'value'
    },
    emitEvent: true,
    token: await getServiceToken()
  })

  addCard({
    group: 'telegram',
    tag: "setter",
    id: 'telegram_connector',
    templateName: "Telegram connector",
    name: "key",
    defaults: {
      width: 4,
      height: 13,
      icon: "send",
      name: "Telegram connector",
      description: "Connects Vento with a Telegram bot using apikeys",
      type: "value",
      params: {
        nameKey: "The key name to set",
        nameKey2: "The key name to set"
      },
      configParams: {
        nameKey: { visible: true, defaultValue: "TELEGRAM_BOT_TOKEN", type: "string" },
        nameKey2: { visible: true, defaultValue: "TELEGRAM_BOT_USERNAME", type: "string" }
      },
      rulesCode: "",
      html: "//@card/react\n\nfunction Widget(card) {\n  const value = card.value;\n  async function validateKey(apiKey) { return true; }\n  async function validateKey2(apiKey) { return true; }\n\n  const readmeIntro =`\n  # Telegram Bot with BotFather\n\n## Create a bot\n- Open Telegram, search **@BotFather**.  \n- Run **/newbot** \n- Enter a **name** (must end in **bot**). It must be unused.  \n- Your bot is live. \n- After that the **@BotFather** gives you the **token** (looks like _1234567890:ABC-123xyz_). Store it securely.\n- Set the **token** and **name** below\n`\n  console.log(\"DEV: card -> \", card)\n  return (\n      <Tinted>\n        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>\n          <YStack>\n            <Markdown readOnly={true} data={readmeIntro}/>\n          </YStack>\n          <View className={\"no-drag\"}>\n            <KeySetter nameKey={data?.configParams?.nameKey?.defaultValue} validate={validateKey} />\n            <KeySetter nameKey={data?.configParams?.nameKey2?.defaultValue} validate={validateKey2} />\n          </View>\n        </ProtoThemeProvider>\n      </Tinted>\n  );\n}\n",
      color: "#24a1de",
    },
    emitEvent: true,
    token: await getServiceToken()
  })

  addCard({
    group: 'telegram',
    tag: "message",
    id: 'telegram_send_message',
    templateName: "Telegram send message",
    name: "message_send",
    defaults: {
      width: 3,
      height: 10,
      name: "Telegram send message",
      icon: "send",
      color: "#24A1DE",
      description: "send a telegram message to a chat id",
      rulesCode: `return execute_action("/api/v1/telegram/send/message", { chat_id: userParams.chat_id, message: userParams.message });`,
      params: { chat_id: "chat id", message: "message" },
      type: 'action',
      displayButton: true,
      buttonLabel: "Send Message"
    },
    emitEvent: true,
    token: await getServiceToken()
  })

  addCard({
    group: 'telegram',
    tag: "onboarding",
    id: 'telegram_onboarding_link',
    templateName: "Telegram onboarding link",
    name: "link",
    defaults: {
      width: 3,
      height: 10,
      name: "telegram_onboarding_link",
      icon: "send",
      color: "#24A1DE",
      html: await onboardingHtml(botUsername),
      description: "show a link to open the Telegram bot",
      rulesCode: `return null;`,
      type: 'value'
    },
    emitEvent: true,
    token: await getServiceToken()
  })
}

const registerActionsAndCards = async (context, botUsername) => {
  await registerActions(context)
  await registerCards(context, botUsername)
}

export default async (app, context) => {
  const { topicSub, topicPub, mqtt } = context;

  // --- Estado y variables del bot ---
  let bot: Telegraf | null = null
  let currentToken: string | null = null
  let currentUsername: string | null = null

  // Bootstrap de estado (una vez)
  context.state.set({ group: 'telegram', tag: "received", name: "message", value: "", emitEvent: true });

  // Handlers del bot (reutilizables)
  const attachHandlers = (b: Telegraf) => {
    b.start((ctx) => {
      const userId = String(ctx.from.id);
      return ctx.reply(`Your chat_id is: ${userId}`);
    });

    b.on('text', async (ctx) => {
      try {
        const fromLabel = ctx.from?.username
          ? `@${ctx.from.username}`
          : (ctx.from?.first_name || '') + (ctx.from?.last_name ? ` ${ctx.from.last_name}` : '') || `${ctx.from?.id}`
        const payload = {
          from: fromLabel,
          content: ctx.message.text,
          chat_id: ctx.chat?.id
        }
        context.state.set({ group: 'telegram', tag: 'received', name: 'message', value: payload, emitEvent: true });
      } catch (e) {
        console.error('Error handling telegram message', e)
      }
    })

    b.on('message', async (ctx) => {
      console.log('Received non-text message', ctx)
    })
  }

  // Función para construir o rehacer el bot
  const buildOrRebuildBot = async () => {
    let TELEGRAM_BOT_TOKEN = "a"
    try {
      TELEGRAM_BOT_TOKEN = await getKey({ key: "TELEGRAM_BOT_TOKEN", token: getServiceToken() })
    } catch (e) {
      console.error("Error getting TELEGRAM_BOT_TOKEN", e)
    }
    let TELEGRAM_BOT_USERNAME = "a"
    try {
      TELEGRAM_BOT_USERNAME = await getKey({ key: "TELEGRAM_BOT_USERNAME", token: getServiceToken() })
    } catch (e) {
      console.error("Error getting TELEGRAM_BOT_USERNAME", e)
    }

    // Si algo cambió (token/username) o el bot no existe, rehacer
    const needsRebuild =
      !bot ||
      TELEGRAM_BOT_TOKEN !== currentToken ||
      TELEGRAM_BOT_USERNAME !== currentUsername

    if (!needsRebuild) return

    // Parar bot anterior si existe
    if (bot) {
      try {
        await bot.stop('graceful')
      } catch (e) {
        console.error('Error stopping previous bot', e)
        logger.warn('Error stopping previous bot', e)
      }
      bot = null
    }

    currentToken = TELEGRAM_BOT_TOKEN || "a"
    currentUsername = TELEGRAM_BOT_USERNAME || "a"

    if (!currentToken) {
      logger.error("Missing TELEGRAM_BOT_TOKEN. Please set it in keys or env.")
    }

    // Crear nuevo bot y handlers
    bot = new Telegraf(currentToken)
    attachHandlers(bot)

    // (Re)registrar cards/actions con el username actual
    await registerActionsAndCards(context, currentUsername || undefined)

    console.log("Launching Telegram bot for username")
    // Lanzar
    try {
      logger.info('Telegram bot launched (rebuilt)')
      generateEvent(
        {
          ephemeral: GENERATE_EPHEMERAL_EVENT,
          path: `telegram/bot/${TELEGRAM_BOT_USERNAME}/status/launched`,
          from: "telegram",
          user: TELEGRAM_BOT_USERNAME,
          payload: {
            message: "Telegram bot launched successfully",
            botUsername: TELEGRAM_BOT_USERNAME,
          }
        },
        getServiceToken()
      );
      await bot.launch()

    } catch (e) {
      console.error('Error launching Telegram bot', e)
      logger.error('Error launching Telegram bot', e)
      generateEvent(
        {
          ephemeral: GENERATE_EPHEMERAL_EVENT,
          path: `telegram/bot/${TELEGRAM_BOT_USERNAME}/status/error`,
          from: "telegram",
          user: TELEGRAM_BOT_USERNAME,
          payload: {
            message: "Telegram bot not launched, error: " + e?.message || e,
            botUsername: TELEGRAM_BOT_USERNAME,
          }
        },
        getServiceToken()
      );
    }
  }

  // Endpoint HTTP para enviar mensajes (usa el bot actual)
  app.get('/api/v1/telegram/send/message', handler(async (req, res, session) => {
    const { chat_id, message } = req.query
    if (!chat_id || !message) {
      res.status(400).send({ error: `Missing ${chat_id ? 'message' : 'chat_id'}` })
      return
    }
    if (!session || !session.user?.admin) {
      res.status(401).send({ error: "Unauthorized" })
      return
    }
    try {
      if (!bot) throw new Error('Bot not initialized')
      await bot.telegram.sendMessage(chat_id.toString(), message.toString())
      res.send({ result: 'done' })
    } catch (e) {
      logger.error("TelegramAPI error", e)
      res.send({ result: "error" })
    }
  }))
  console.log("Setup events for telegram keys changes")
  context.events.onEvent(
    context.mqtt,
    context,
    async () => {
      console.log("Telegram: rebuild bot due to keys/update/TELEGRAM_BOT_TOKEN");
      await buildOrRebuildBot()
    },
    "keys/+/TELEGRAM_BOT_TOKEN",
    "api"
  )

  context.events.onEvent(
    context.mqtt,
    context,
    async () => {
      console.log("Telegram: rebuild bot due to keys/update/TELEGRAM_BOT_USERNAME");
      await buildOrRebuildBot()
    },
    "keys/+/TELEGRAM_BOT_USERNAME",
    "api"
  )

  // Construcción inicial
  await buildOrRebuildBot()

  // Reaccionar a cambios de keys → rehacer bot y refrescar cards/actions
  // (evita duplicar listeners de eventos: registramos estos una sola vez)


  // (Opcional) Hooks de parada elegante si tu host envía señales:
  // process.once('SIGINT', async () => { try { await bot?.stop('graceful') } catch {} })
  // process.once('SIGTERM', async () => { try { await bot?.stop('graceful') } catch {} })
}

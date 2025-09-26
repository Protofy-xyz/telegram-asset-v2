import { API, generateEvent } from "protobase";
import { AutoAPI, handler, getServiceToken } from 'protonode'
import { getLogger } from 'protobase';
import { addAction } from "@extensions/actions/coreContext/addAction";
import { addCard } from "@extensions/cards/coreContext/addCard";
import { getKey } from "@extensions/keys/coreContext";
import { Telegraf } from 'telegraf';
import path from "path";
import { createReadStream } from "fs";
import { promises as fsp } from "fs";
import fs from "fs";

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
  //add action to send photo
  addAction({
    group: 'telegram',
    name: 'photo',
    url: `/api/v1/telegram/send/photo`,
    tag: "send",
    description: "send a telegram photo to a chat id",
    params: { chat_id: "Telegram chat id (number). Example: 123456789", path: "path to local file or public URL", caption: "(optional) caption for the photo", disable_notification: "(optional) true/false to disable notification" },
    emitEvent: true,
    token: await getServiceToken()
  })

  addAction({
    group: 'telegram',
    name: 'file',
    url: `/api/v1/telegram/send/file`,
    tag: "send",
    description: "send a telegram document/file to a chat id",
    params: {
      chat_id: "Telegram chat id (number). Example: 123456789",
      path: "path to local file or public URL",
      caption: "(optional) caption for the document",
      disable_notification: "(optional) true/false to disable notification"
    },
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
      html: "//@card/react\n\nfunction Widget(card) {\n    const value = card.value;\n    const message = value?.content ?? \"No message\"\n    const sender = value?.from ?? \"\"\n    const chatId = value?.chat_id ?? \"\"\n\n    return (\n        <Tinted>\n            <ProtoThemeProvider forcedTheme= { window.TamaguiTheme }>\n                <YStack gap=\"$3\" p=\"$3\" className=\"no-drag\">\n                    <XStack gap=\"$2\" ai=\"center\">\n                        <YStack jc=\"center\" ai=\"center\" p=\"$2\" bc={card.color} br=\"$20\" mr=\"$1\">\n                            <Icon name={data.icon} size={16} color={\"white\"}/>\n                        </YStack>\n                        <Text cursor=\"text\" fow=\"600\" fos=\"$3\">{sender}</Text>\n                        <Text cursor=\"text\" fow=\"100\" fos=\"$3\" o={0.3}>{chatId}</Text>\n                    </XStack>\n                    <YStack bc={\"$bgContent\"} p=\"$2\" br=\"$4\">\n                        <Markdown readOnly={ true } data={message} />\n                    </YStack>\n                </YStack>\n            </ProtoThemeProvider>\n        </Tinted>\n  );\n}\n",
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
    tag: "photo",
    id: 'telegram_send_photo',
    templateName: "Telegram send photo",
    name: "photo_send",
    defaults: {
      width: 3,
      height: 10,
      name: "Telegram send photo",
      icon: "camera",
      color: "#24A1DE",
      description: "send a telegram photo to a chat id",
      rulesCode: `return execute_action("/api/v1/telegram/send/photo", { chat_id: userParams.chat_id, path: userParams.path, caption: userParams.caption, disable_notification: userParams.disable_notification });`,
      params: { chat_id: "chat id", path: "path to local file or public URL", caption: "(optional) caption for the photo", disable_notification: "(optional) true/false to disable notification" },
      type: 'action',
      displayButton: true,
      buttonLabel: "Send Photo"
    },
    emitEvent: true,
    token: await getServiceToken()
  })

  addCard({
    group: 'telegram',
    tag: "file",
    id: 'telegram_send_file',
    templateName: "Telegram send file",
    name: "file_send",
    defaults: {
      width: 3,
      height: 10,
      name: "Telegram send file",
      icon: "paperclip",
      color: "#24A1DE",
      description: "send a telegram file/document to a chat id",
      rulesCode: `return execute_action("/api/v1/telegram/send/file", { chat_id: userParams.chat_id, path: userParams.path, caption: userParams.caption, disable_notification: userParams.disable_notification });`,
      params: {
        chat_id: "chat id",
        path: "path to local file or public URL",
        caption: "(optional) caption for the file",
        disable_notification: "(optional) true/false to disable notification"
      },
      type: 'action',
      displayButton: true,
      buttonLabel: "Send File"
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

  addCard({
    group: 'telegram',
    tag: "chats",
    id: 'telegram_allowed_chats',
    templateName: "Telegram allowed chats",
    name: "link",
    defaults: {
      width: 3,
      height: 10,
      name: "Telegram allowed chats",
      icon: "send",
      color: "#24A1DE",
      html: "//@card/react\n\nfunction Widget(card) {\n  const value = card.value;\n\n  const content = <YStack f={1}  mt={\"20px\"} ai=\"center\" jc=\"center\" width=\"100%\">\n      {card.icon && card.displayIcon !== false && (\n          <Icon name={card.icon} size={48} color={card.color}/>\n      )}\n      {card.displayResponse !== false && (\n          <CardValue mode={card.markdownDisplay ? 'markdown' : 'normal'} value={value ?? \"N/A\"} />\n      )}\n  </YStack>\n\n  return (\n      <Tinted>\n        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>\n          <ActionCard data={card}>\n            {card.displayButton !== false ? <ParamsForm data={card}>{content}</ParamsForm> : card.displayResponse !== false && content}\n          </ActionCard>\n        </ProtoThemeProvider>\n      </Tinted>\n  );\n}",
      description: "Edit the allowed chats for the telegram communications",
      rulesCode: "// set new state\nlet result = (await API.post(\"/api/v1/telegram/allowed-chats?chat_id=\" + params.chat_id, {}));\n\n// read new state \nreturn (await API.get(\"/api/v1/telegram/allowed-chats\")).data.result;",
      type: 'action',
      params: {
        "chat_id": "the chat id to allow in the whitelist"
      },
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
  let allowedChats: string[] = []
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
        if (allowedChats.length && !allowedChats.includes(String(ctx.chat?.id))) {
          console.log("blocked telegram message from user: ", ctx.from?.username)
          return
        }

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
  // Helpers
  const allowedImageExts = new Set([
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".heic", ".heif"
  ]);

  const isUrl = (s: string) => /^https?:\/\//i.test(s);

  async function isRemoteImage(urlStr: string): Promise<{ ok: boolean; contentType?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    try {
      let resp = await fetch(urlStr, { method: 'HEAD', redirect: 'follow', signal: controller.signal as any });
      if (!resp.ok) {
        resp = await fetch(urlStr, {
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
          redirect: 'follow',
          signal: controller.signal as any,
        });
      }
      const ct = resp.headers.get('content-type') || undefined;
      return { ok: !!ct && ct.toLowerCase().startsWith('image/'), contentType: ct };
    } catch {
      return { ok: false };
    } finally {
      clearTimeout(timeout);
    }
  }

  const normalizeOptional = (v?: unknown) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return (s === "" || s.toLowerCase() === "undefined" || s.toLowerCase() === "null") ? undefined : s;
  };

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
      res.send({ result: 'done', message: message, chat_id: chat_id })
    } catch (e) {
      logger.error("TelegramAPI error", e)
      res.status(500).send(e)
    }
  }))

  // Enviar foto (URL o path relativo a ../../)
  app.get('/api/v1/telegram/send/photo', handler(async (req, res, session) => {
    const { chat_id, path: rawPath, caption, disable_notification } = req.query as {
      chat_id?: string | number;
      path?: string;
      caption?: string;
      disable_notification?: string;
    };

    if (!chat_id || !rawPath) {
      res.status(400).send({ error: `Missing ${chat_id ? 'path' : 'chat_id'}` });
      return;
    }
    if (!session || !session.user?.admin) {
      res.status(401).send({ error: "Unauthorized" });
      return;
    }

    try {
      if (!bot) throw new Error('Bot not initialized');

      const cap = normalizeOptional(caption);
      const disableNotif = String(disable_notification).toLowerCase() === "true";
      const extra: Record<string, any> = {};
      if (cap !== undefined) extra.caption = cap;
      if (disableNotif) extra.disable_notification = true;

      const raw = String(rawPath);

      let inputForTelegram: any;

      if (isUrl(raw)) {
        let looksImage = false;
        try {
          const u = new URL(raw);
          const ext = (u.pathname && (u.pathname.includes('.') ? u.pathname.substring(u.pathname.lastIndexOf('.')) : '')).toLowerCase();
          if (ext && allowedImageExts.has(ext)) looksImage = true;
        } catch { /* ignore */ }

        if (!looksImage) {
          const { ok, contentType } = await isRemoteImage(raw);
          if (!ok) {
            res.status(415).send({ error: "Remote resource is not an image (no image Content-Type detected)" });
            return;
          }
        }

        inputForTelegram = raw;
      } else {
        const baseDir = path.resolve(__dirname, '../../');
        const normalizedBase = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep;

        const cleanedRelative = raw.replace(/^[/\\]+/, '');
        const absPath = path.resolve(path.join(baseDir, cleanedRelative));

        if (!absPath.startsWith(normalizedBase)) {
          res.status(400).send({ error: "Invalid path (outside allowed base directory)" });
          return;
        }

        try {
          await fsp.access(absPath, fs.constants.R_OK);
          const st = await fsp.stat(absPath);
          if (!st.isFile()) {
            res.status(400).send({ error: "Path is not a file" });
            return;
          }
        } catch {
          res.status(404).send({ error: `File not found or unreadable: ${cleanedRelative}` });
          return;
        }

        let isImage = false;
        try {
          // @ts-ignore
          const { fileTypeFromFile } = await import('file-type');
          if (typeof fileTypeFromFile === 'function') {
            const ft = await fileTypeFromFile(absPath);
            if (ft?.mime?.startsWith('image/')) isImage = true;
          }
        } catch { /* ignore */ }
        if (!isImage) {
          const ext = path.extname(absPath).toLowerCase();
          if (allowedImageExts.has(ext)) isImage = true;
        }
        if (!isImage) {
          res.status(415).send({ error: "Unsupported media type: file is not an image (or format not allowed)" });
          return;
        }

        inputForTelegram = { source: createReadStream(absPath) };
      }

      await bot.telegram.sendPhoto(chat_id.toString(), inputForTelegram, extra);

      res.send({
        result: 'done',
        chat_id,
        path: rawPath,
        base_dir: path.resolve(__dirname, '../../'),
      });
    } catch (e: any) {
      logger.error("TelegramAPI sendPhoto error", e);
      res.status(500).send({ result: "error", error: e?.message || String(e) });
    }
  }));

  // Enviar documento/archivo (URL o path relativo a ../../)
  app.get('/api/v1/telegram/send/file', handler(async (req, res, session) => {
    const { chat_id, path: rawPath, caption, disable_notification } = req.query as {
      chat_id?: string | number;
      path?: string;
      caption?: string;
      disable_notification?: string;
    };

    if (!chat_id || !rawPath) {
      res.status(400).send({ error: `Missing ${chat_id ? 'path' : 'chat_id'}` });
      return;
    }
    if (!session || !session.user?.admin) {
      res.status(401).send({ error: "Unauthorized" });
      return;
    }

    try {
      if (!bot) throw new Error('Bot not initialized');

      const cap = normalizeOptional(caption);
      const disableNotif = String(disable_notification).toLowerCase() === "true";
      const extra: Record<string, any> = {};
      if (cap !== undefined) extra.caption = cap;
      if (disableNotif) extra.disable_notification = true;

      const raw = String(rawPath);
      let inputForTelegram: any;

      if (isUrl(raw)) {
        inputForTelegram = raw;
      } else {
        const baseDir = path.resolve(__dirname, '../../');
        const normalizedBase = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep;

        const cleanedRelative = raw.replace(/^[/\\]+/, '');
        const absPath = path.resolve(path.join(baseDir, cleanedRelative));

        if (!absPath.startsWith(normalizedBase)) {
          res.status(400).send({ error: "Invalid path (outside allowed base directory)" });
          return;
        }

        try {
          await fsp.access(absPath, fs.constants.R_OK);
          const st = await fsp.stat(absPath);
          if (!st.isFile()) {
            res.status(400).send({ error: "Path is not a file" });
            return;
          }
        } catch {
          res.status(404).send({ error: `File not found or unreadable: ${cleanedRelative}` });
          return;
        }

        inputForTelegram = {
          source: createReadStream(absPath),
          filename: path.basename(absPath),
        };
      }

      await bot.telegram.sendDocument(chat_id.toString(), inputForTelegram, extra);

      res.send({
        result: 'done',
        chat_id,
        path: rawPath,
        base_dir: path.resolve(__dirname, '../../'),
      });
    } catch (e: any) {
      logger.error("TelegramAPI sendFile error", e);
      res.status(500).send({ result: "error", error: e?.message || String(e) });
    }
  }));


  // allowed chats
  app.post('/api/v1/telegram/allowed-chats', handler(async (req, res, session) => {
    const { chat_id } = req.query as {
      chat_id?: string | number;
    };

    if (!chat_id) {
      res.status(400).send({ error: `Missing 'chat_id'` });
      return;
    }
    // if (!session || !session.user?.admin) {
    //   res.status(401).send({ error: "Unauthorized" });
    //   return;
    // }

    try {
      console.log("chat_id: ", chat_id)
      if (String(chat_id) === "undefined") {
        allowedChats = []
        res.json({ result: allowedChats, ok: true })
        return
      }

      allowedChats.push(String(chat_id))
      res.json({ result: allowedChats, ok: true })
      return
    } catch (e: any) {
      logger.error("TelegramAPI cannot add allowed chats. error", e);
      res.status(500).send({ result: "error", error: e?.message || String(e) });
    }
  }));

  app.get('/api/v1/telegram/allowed-chats', handler(async (req, res, session) => {
    try {
      res.json({ result: allowedChats ?? [] })
      return
    } catch (e: any) {
      logger.error("TelegramAPI cannot add allowed chats. error", e);
      res.status(500).send({ result: "error", error: e?.message || String(e) });
    }
  }));

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

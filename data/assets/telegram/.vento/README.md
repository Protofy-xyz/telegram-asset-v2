# 🤖 **Telegram (Bot-First)**

Bring Telegram **bots** into your workflow. This asset adds bot-connected cards to your Boards so conversations and automations live in one place — and includes a ready-to-use board that serves files on demand.

## 🧠 What is this?
A lightweight bridge between your **Telegram bot** and Boards: send messages/media, receive incoming texts, and control who can talk to your bot.

## 🧩 Cards added
- **Telegram connector** – set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`  
- **Last received message** – shows the latest text your bot received  
- **Send message** – post text to a chat ID  
- **Send photo** – send an image (URL or local path)  
- **Send file** – send any document  
- **Allowed chats** – whitelist chat IDs the bot will accept  

## 📦 Included example board: Telegram ↔ Files Bot
A minimal board that listens for `/files <filename>` and sends the requested file from `data/public`.

**How it works**
- On every incoming message, it refreshes the file list from `data/public`.
- If a message starts with `/files <filename>`:
  - Checks if `<filename>` exists in `data/public`.
  - If yes → sends the file.
  - If no → replies with **"File does not exist."**

**Usage**
```

/files <filename>

```
Example: `/files vento-logo.png`

> Notes: exact filename match (case-sensitive). Folder scanned: `data/public`.

## ⚙️ Setup (1-min)
1. Create a bot with **@BotFather** → get the **token** and **username**  
2. Open the **Telegram connector** card → paste both keys  
3. (Optional) Add chat IDs in **Allowed chats**  
4. (Optional) Place files in `data/public` to use the example board

Your **bot** is now connected to your Boards.


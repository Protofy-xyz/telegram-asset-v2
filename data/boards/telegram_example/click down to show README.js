return `# Telegram ↔ Files Bot (Board)

This board listens to Telegram and sends files from "data/public" on request.

## What it does

* Listens to **Telegram last received message**.
* On "/files <filename>":

  * Read "data/public" ("files_read").
  * If "<filename>" exists → send it ("Telegram send file").
  * Else → reply "File does not exist." ("Telegram send message").
* After any message, refresh the file list ("files_read").

## Usage

"""
/files <filename>
"""
Example: "/files vento-logo.png"

## Actions

* "files_read"
* "Telegram send file"
* "Telegram send message"

## Notes

* Exact filename match (case‑sensitive)
* Folder: "data/public"
`;

//@card/react
function Widget(card) {
  const readme = '#### Add Telegram keys here. \n  Note: If you need help obtaining the telegram keys, the necessary information can be found on the Telegram Conector card.';
  const requiredKeys = card.keys;

  const username = useKeyState("TELEGRAM_BOT_USERNAME")?.keyValue?.trim();
  const link = username ? "https://t.me/" + username : null;
  const qrUrl = link ? "https://api.qrserver.com/v1/create-qr-code/?data=" + encodeURIComponent(link) + "&size=200x200" : null;

  function copyLink() {
    if (!link) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(link);
      alert("Link copied to clipboard");
    } else {
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand("copy"); } catch { }
      document.body.removeChild(el);
      alert("Link copied to clipboard");
    }
  }

  return (
    <Tinted>
      <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>
        <KeyGate requiredKeys={requiredKeys} readme={readme}>
          <YStack gap="$7" p="$4" className="no-drag" mx="auto" maw={760} ta="center" ai="center" jc="center">
            {/* Header — common, fixed at top */}
            <XStack ai="center" gap="$2">
              <YStack jc="center" ai="center" p="$2" bc={card.color} br="$20" mr="$1">
                <Icon name={card.icon ?? "send"} size={16} color="white" />
              </YStack>
              <Text fow="600">Telegram bot</Text>
            </XStack>

            {/* Content — centered under the header */}
            <YStack jc="center" ai="center" minHeight={320} gap="$3">
              {username ? (
                <>
                  <img
                    src={qrUrl}
                    width={200}
                    height={200}
                    alt={"QR to open @" + username + " on Telegram"}
                    style={{ borderRadius: 8, border: "1px solid #eee" }}
                  />

                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 14, wordBreak: "break-all" }}
                  >
                    {link}
                  </a>

                  <XStack gap="$2" ai="center" jc="center">
                    <button
                      onClick={copyLink}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}
                    >
                      Copy link
                    </button>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd" }}
                    >
                      Open in Telegram
                    </a>
                  </XStack>

                  <Text o={0.7} fos="$2">
                    Scan the QR with your phone camera, or tap the link above.
                  </Text>
                </>
              ) : (
                <>
                  <Text o={0.8}>
                    Add <Text fow="700">TELEGRAM_BOT_USERNAME</Text> in Keys and then refresh this board to see your QR and link.
                  </Text>
                  <Text fos="$2" o={0.6}>Tip: after saving keys, press ⌘R / Ctrl+R.</Text>
                </>
              )}
            </YStack>
          </YStack>
        </KeyGate>
      </ProtoThemeProvider>
    </Tinted>
  );
}


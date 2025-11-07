//@card/react

function Widget(card) {
    const value = card.value;
    const imageUrl = value?.photo?.url;
    const hasImage = !!imageUrl;
    const sender = value?.from ?? ""
    const chatId = value?.chat_id ?? ""
    const messageContent = value?.content ?? (value?.photo?.caption ?? "No message")
    const textForImage = hasImage ? (value?.photo?.caption || (messageContent === "[Image]" ? "" : messageContent)) : messageContent

    const readme = `#### Add Telegram keys here. 
  Note: If you need help obtaining the telegram keys, the necessary information can be found on the Telegram Conector card.`
    const requiredKeys = card.keys

    return (
        <Tinted>
            <ProtoThemeProvider forcedTheme= { window.TamaguiTheme }>
                <KeyGate requiredKeys={requiredKeys} readme={readme} >
                    <YStack gap="$3" p="$3" className="no-drag">
                        <XStack gap="$2" ai="center">
                            <YStack jc="center" ai="center" p="$2" bc={card.color} br="$20" mr="$1">
                                <Icon name={data.icon} size={16} color={"white"}/>
                            </YStack>
                            <Text cursor="text" fow="600" fos="$3">{sender}</Text>
                            <Text cursor="text" fow="100" fos="$3" o={0.3}>{chatId}</Text>
                        </XStack>
                        <YStack bc={"$bgContent"} p="$2" br="$4" gap="$2">
                            {hasImage && imageUrl ? (
                                <YStack gap="$2">
                                    <img
                                        src={imageUrl}
                                        alt={value?.photo?.caption ?? "Telegram image"}
                                        style={{ width: "100%", borderRadius: 8, objectFit: "contain", maxHeight: 280 }}
                                    />
                                    {textForImage && <Markdown readOnly={ true } data={textForImage} />}
                                </YStack>
                            ) : (
                                <Markdown readOnly={ true } data={messageContent} />
                            )}
                        </YStack>
                    </YStack>
                </KeyGate>
            </ProtoThemeProvider>
        </Tinted>
  );
}

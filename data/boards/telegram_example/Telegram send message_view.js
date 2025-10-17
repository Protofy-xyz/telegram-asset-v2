//@card/react

function Widget(card) {
  const value = card.value;

  const readme = `#### Add Telegram keys here. 
  Note: If you need help obtaining the telegram keys, the necessary information can be found on the Telegram Conector card.`
  const requiredKeys = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_USERNAME"]

  const content = <YStack f={1}  mt={"20px"} ai="center" jc="center" width="100%">
      {card.icon && card.displayIcon !== false && (
          <Icon name={card.icon} size={48} color={card.color}/>
      )}
      {card.displayResponse !== false && (
          <CardValue mode={card.markdownDisplay ? 'markdown' : 'normal'} value={value ?? "N/A"} />
      )}
  </YStack>

  return (
      <Tinted>
        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>
          <KeyGate requiredKeys={requiredKeys} readme={readme}>
            <ActionCard data={card}>
              {card.displayButton !== false ? <ParamsForm data={card}>{content}</ParamsForm> : card.displayResponse !== false && content}
            </ActionCard>
          </KeyGate>
        </ProtoThemeProvider>
      </Tinted>
  );
}

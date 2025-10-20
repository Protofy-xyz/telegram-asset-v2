//@card/react

function Widget(card) {
  const value = card.value;
  async function validateKey(apiKey) { return true; }
  async function validateKey2(apiKey) { return true; }

  const readmeIntro =`
  ## Telegram Bot with BotFather

### Create a bot
- Open Telegram, search **@BotFather**.  
- Run **/newbot** 
- Enter a **name** (must end in **bot**). It must be unused.  
- Your bot is live. 
- After that the **@BotFather** gives you the **token** (looks like _1234567890:ABC-123xyz_). Store it securely.
- Set the **token** and **name** below

### Configure keys
`
  console.log("DEV: card -> ", card)
  return (
      <Tinted>
        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>
          <YStack>
            <Markdown readOnly={true} data={readmeIntro}/>
          </YStack>
          <View className={"no-drag"}>
            <KeySetter nameKey={data?.configParams?.nameKey?.defaultValue} validate={validateKey} />
            <KeySetter nameKey={data?.configParams?.nameKey2?.defaultValue} validate={validateKey2} />
          </View>
        </ProtoThemeProvider>
      </Tinted>
  );
}

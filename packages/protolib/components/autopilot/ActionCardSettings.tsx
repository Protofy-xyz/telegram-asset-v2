import { Braces, Cog, ClipboardList, Sliders, FileCode, FileQuestion, X, Save, Settings, FileInput } from '@tamagui/lucide-icons'
import { Text, YStack, Paragraph, XStack } from '@my/ui'
import { useState, useRef } from 'react'
import { Tinted } from '../Tinted'
import { RuleEditor } from './RuleEditor'
import { ParamsEditor } from './ParamsEditor'
import { useThemeSetting } from '@tamagui/next-theme';
import { Markdown } from '../Markdown'
import { Panel, PanelGroup } from "react-resizable-panels";
import { SettingsEditor } from './SettingsEditor'
import { ViewEditor } from './ViewEditor'
import { DisplayEditor, SettingsTitle } from './DisplayEditor'
import { useUpdateEffect } from 'usehooks-ts'
import { TabBar } from 'protolib/components/TabBar';

export const ActionCardSettings = ({ board, actions, states, card, icons, onEdit = (data) => { }, onSave = () => { }, errors, mode = "edit", tab = "rules" }) => {

  const [cardData, setCardData] = useState(card);
  const originalNameRef = useRef(card?.name ?? null)

  const isCreateMode = mode === "create";

  const [selectedTab, setSelectedTab] = useState(isCreateMode ? "config" : tab);

  const { resolvedTheme } = useThemeSetting();

  useUpdateEffect(() => {
    const payload = { ...cardData }
    const original = originalNameRef.current
    if (!isCreateMode && original && payload?.name && payload.name !== original) {
      payload.previousName = original
    } else {
      delete payload.previousName
    }
    onEdit(payload);
  }, [cardData]);

  const setHTMLCode = (code) => {
    setCardData({
      ...cardData,
      html: code,
    })
  }

  const tabs = [
    {
      id: 'info',
      label: 'Readme',
      icon: <FileQuestion size={"$1"} />,
      content: <YStack f={1} gap="$4">
        <YStack f={1} gap="$2">
          <SettingsTitle>Description</SettingsTitle>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={50}>
              <YStack
                flex={1} height="100%" backgroundColor="$gray3" borderRadius="$3" p="$3" >
                <Markdown
                  data={cardData.description}
                  setData={(newCode) => {
                    setCardData({
                      ...cardData,
                      description: newCode
                    })
                  }}
                />
              </YStack>
            </Panel>
          </PanelGroup>
        </YStack>
      </YStack>
    },
    {
      id: 'rules',
      label: 'Rules',
      icon: <ClipboardList size={"$1"} />,
      content: <RuleEditor
        board={board}
        extraCompilerData={{ userParams: cardData.params, actions: actions?.boards?.[board.name] }}
        onCodeChange={(cardData, states) => {
          return "rules processed"
        }}
        actions={actions.boards || {}}
        compiler={cardData.type == 'value' ? 'getValueCode' : 'getActionCode'}
        states={states?.boards || {}}
        cardData={cardData}
        setCardData={setCardData}
      />
    },
    {
      id: 'params',
      label: 'Inputs',
      icon: <FileInput size={"$1"} />,
      content: <ParamsEditor
        params={cardData.params || {}}
        setParams={(newParams) => {
          console.log("hacemos setParams", newParams)
          setCardData((prev) => ({
            ...prev,
            params: newParams,
          }))
        }}
        configParams={cardData.configParams || {}}
        setConfigParams={(newConfigParams) => {
          console.log("hacemos setConfigParams", newConfigParams)
          setCardData((prev) => ({
            ...prev,
            configParams: newConfigParams,
          }))
        }}
        availableStates={Object.keys(states?.boards?.[board.name] ?? {}).filter(s => s !== cardData.name)}
      />
    },
    {
      id: 'config',
      label: 'Settings',
      icon: <Settings size={"$1"} />,
      content: <DisplayEditor board={board} icons={icons} card={card} cardData={cardData} setCardData={setCardData} />
    },
    {
      id: 'view',
      label: 'View',
      icon: <FileCode size={"$1"} />,
      content: <ViewEditor cardData={cardData} setHTMLCode={setHTMLCode} />
    },
    {
      id: 'raw',
      label: 'Raw',
      icon: <Braces size={"$1"} />,
      content: <SettingsEditor cardData={cardData} setCardData={setCardData} resolvedTheme={resolvedTheme} />
    }
  ]

  return (
    <YStack f={1}>
      <Tinted>
        <YStack f={1}>
          <XStack
            borderBottomColor="$gray6"
            borderBottomWidth="1px"
            justifyContent="space-between"
            ai="center"
          >
            <TabBar
              tabs={tabs}
              selectedId={selectedTab}
              onSelect={(id) => setSelectedTab(id)}
            />
            {!isCreateMode && (
              <XStack ai="center">
                <YStack borderRightWidth="1px" borderRightColor="$gray6" h="100%" />
                <XStack ai="center" gap="$3" p="$2.5" px="$3">
                  <XStack cursor="pointer" onPress={onSave} pressStyle={{ opacity: 0.8 }} hoverStyle={{ scale: 1.05 }} >
                    <Save size={18} color="var(--color)" />
                  </XStack>
                  {/* <XStack cursor="pointer" onPress={() => { }} pressStyle={{ opacity: 0.8 }} hoverStyle={{ scale: 1.05 }} >
                    <X size={18} color="var(--color)" />
                  </XStack> */}
                </XStack>
              </XStack>
            )}
          </XStack>
          <Tinted>
            {
              tabs.map((tabItem) => (
                <YStack display={tabItem.id === (selectedTab ?? "rules") ? "flex" : "none"} key={tabItem.id} f={1} gap="$4" p="$4">
                  {tabItem.content || (
                    <YStack f={1} ai="center" jc="center">
                      <Text color="$gray11">No content available for this tab</Text>
                    </YStack>
                  )}
                </YStack>
              ))
            }
          </Tinted>
        </YStack>
      </Tinted >
      {errors?.length > 0 ?
        <YStack>
          {errors.map((error, index) => (
            <Paragraph key={"err" + index} color="$red9" fontSize="$4">{error}</Paragraph>
          ))}
        </YStack>
        : <></>
      }
    </YStack >
  );
};

import { YStack, XStack, Spacer, ScrollView, useThemeName, Input, Text, Button } from '@my/ui'
import { AlertDialog } from '../../components/AlertDialog';
import { Slides } from '../../components/Slides'
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionCardSettings } from '../autopilot/ActionCardSettings';
import { useProtoStates } from '@extensions/protomemdb/lib/useProtoStates'
import { Search, ScanEye, Rocket } from "@tamagui/lucide-icons";
import { Tinted } from '../Tinted';
import { getIconUrl } from '../IconSelect';
import { useThemeSetting } from '@tamagui/next-theme'
import { v4 as uuidv4 } from 'uuid';
import { Markdown } from '../../components/Markdown';

const SelectGrid = ({ children }) => {
  return <XStack jc="flex-start" ai="center" gap={25} flexWrap='wrap'>
    {children}
  </XStack>
}

const FirstSlide = ({ selected, setSelected, options }) => {
  const themeName = useThemeName()
  const { resolvedTheme } = useThemeSetting()
  const darkMode = resolvedTheme == 'dark'
  const [search, setSearch] = useState('')
  const isAction = (option) => option.defaults?.type === 'action'
  const [selectedGroups, setSelectedGroups] = useState([]);
  const cardNameInputRef = useRef(null)

  // Extrae los grupos disponibles de las options
  const groups = useMemo(() => {
    return [...new Set(options.map(o => o.group).filter(Boolean))];
  }, [options]);

  const toggleGroup = (group) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const filteredOptions = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return options.filter(opt => {
      const matchSearch = opt.name?.toLowerCase().includes(lowerSearch);
      const matchGroup = selectedGroups.length === 0 || selectedGroups.includes(opt.group);
      return matchSearch && matchGroup;
    });
  }, [options, search, selectedGroups]);

  const groupedOptions = useMemo(() => {
    return filteredOptions.reduce((acc, opt) => {
      const groupKey = opt.group ?? "__no_group__";
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(opt);
      return acc;
    }, {});
  }, [filteredOptions]);

  useEffect(() => {
    cardNameInputRef.current.focus()
  }, [selected])

  return (
    <YStack f={1}>
      <Tinted>
        <XStack pb={8} mb={5} position="relative">
          <Search pos="absolute" left="$3" top={14} size={16} pointerEvents="none" />
          <Input
            bg="$gray3"
            color="$gray12"
            paddingLeft="$7"
            bw={themeName === 'dark' ? 0 : 1}
            h="47px"
            boc={'$gray5'}
            w="100%"
            placeholder="search card..."
            placeholderTextColor="$gray9"
            outlineColor="$gray8"
            value={search}
            onChangeText={setSearch}
          />
        </XStack>
        <XStack gap="$2" mb="$4" flexWrap="wrap">
          {groups.map((group) => {
            const isActive = selectedGroups.includes(group);
            return (
              <Button
                key={group}
                onPress={() => toggleGroup(group)}
                size="$3"
                style={{
                  backgroundColor: isActive ? 'var(--color4)' : 'var(--gray3)',
                  borderColor: isActive ? 'var(--color7)' : 'var(--gray5)',
                  borderWidth: '1px',
                  borderRadius: "$10",
                  color: isActive ? 'white' : 'inherit',
                }}
              >
                {group}
              </Button>
            );
          })}
        </XStack>

        <XStack flex={1} gap="$3">
          <ScrollView>
            {Object.entries(groupedOptions).map(([group, options]) => (
              <YStack key={group} mb="$3">
                {group !== "__no_group__" && (
                  <>
                    <Text fontSize="$5" fontWeight="600" mb="$2">{group}</Text>
                    <YStack height="1px" bg="$gray6" mb="$3" />
                  </>
                )}

                <SelectGrid>
                  {options.map((option) => (
                    <XStack
                      width={200}
                      height={70}
                      key={option.id}
                      gap={"$2"}
                      p={"$2"}
                      cursor="pointer"
                      onPress={() => setSelected(option)}
                      borderRadius={"$3"}
                      ai="center"
                      bc={selected?.id === option.id ? "$color4" : "$gray3"}
                      bw={"1px"}
                      boc={selected?.id === option.id ? "$color7" : "$gray5"}
                      hoverStyle={{ bc: "$color4", boc: "$color7" }}
                    >
                      <YStack
                        br={isAction(option) ? "$10" : "$2"}
                        p={"$2"}
                        bc={
                          option?.defaults?.color
                            ? option?.defaults?.color
                            : isAction(option)
                              ? "$yellow7"
                              : "$blue7"
                        }
                      >
                        {option?.defaults?.icon ? (
                          <img src={getIconUrl(option.defaults.icon)} width={20} height={20} style={darkMode ? { filter: 'brightness(0) saturate(100%) invert(1)' } : {}} />
                        ) : isAction(option) ? (
                          <Rocket />
                        ) : (
                          <ScanEye />
                        )}
                      </YStack>
                      <Text fow={selected?.id === option.id && "600"} ml="$2" fontSize="$4">{option.name}</Text>
                    </XStack>
                  ))}
                </SelectGrid>
              </YStack>
            ))}
          </ScrollView>
          <YStack
            width={600}
            height={"100%"}
            cursor="pointer"
            ai="center"
            jc="flex-start"
            blw={"1px"}
            blc={"$gray6"}
            gap="$3"
            pl="$3"
          >
            <YStack flex={1} w="100%" h="100%" jc="flex-start" ai="center" px="$2" gap="$3" overflow='scroll'>
              <Text fontSize="$8" fontWeight="600" mb="$2" textAlign='center'>{selected.name}</Text>
              <Input placeholder='card name' w="100%" ref={cardNameInputRef} onChangeText={(value) => {
                setSelected(prev => {
                  return { ...prev, defaults: { ...prev.defaults, customName: value } }
                })
              }} />
              <YStack w="100%" pt="$5">
                <Text fontSize="$5" fontWeight="400" color="$gray9" w="fit-content"
                  bbw="1px" bbc="$gray9">Readme</Text>
                <Markdown readOnly={true} data={selected.readme ?? "no readme provided for this card"} />
              </YStack>
            </YStack>
          </YStack>
        </XStack>
        <Spacer marginBottom="$1" />
      </Tinted>
    </YStack>
  )
}

const iconTable = {
  'value': 'tag',
  'action': 'zap'
}

const SecondSlide = ({ remountKey, card, board, states, icons, actions, setCard, errors }) => {
  return (
    <YStack mb="$4" marginTop="$-5" marginHorizontal="$-6" f={1}>
      <ActionCardSettings
        key={remountKey}
        mode="create"
        board={board}
        states={states}
        icons={icons}
        card={card}
        actions={actions}
        onEdit={(data) => setCard(data)}
        errors={errors}
      />
    </YStack>
  )
}

const typeCodes = {
  value: `//@card/react

function Widget(card) {
  const value = card.value;
  return (
      <Tinted>
        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>
            <YStack f={1} height="100%" ai="center" jc="center" width="100%">
                {card.icon && card.displayIcon !== false && (
                    <Icon name={card.icon} size={48} color={card.color}/>
                )}
                {card.displayResponse !== false && (
                    <CardValue mode={card.markdownDisplay ? 'markdown' : 'normal'} value={value ?? "N/A"} />
                )}
            </YStack>
        </ProtoThemeProvider>
      </Tinted>
  );
}

`,
  action: `//@card/react

function Widget(card) {
  const value = card.value;

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
          <ActionCard data={card}>
            {card.displayButton !== false ? <ParamsForm data={card}>{content}</ParamsForm> : card.displayResponse !== false && content}
          </ActionCard>
        </ProtoThemeProvider>
      </Tinted>
  );
}
`,

}

const extraCards = [
  {
    defaults: {
      type: 'action',
      name: 'card',
      displayResponse: true
    },
    name: 'Action',
    //readme: "",
    id: 'action'
  },
  {
    defaults: {
      width: 3,
      height: 12,
      type: 'action',
      name: 'AI card',
      displayResponse: true,
      rulesCode: "const response = await context.chatgpt.prompt({\n  message: `\n<instructions>You are integrated into a board system.\nThe board is composed of states and actions.\nYou will receive a user message and your mission is to generate a json response.\nOnly respond with a JSON in the following format:\n\n{\n    \"response\": \"whatever you want to say\",\n    \"actions\": [\n        {\n            \"name\": \"action_1\",\n            \"params\": {\n                \"example_param\": \"example_value\"\n            } \n        }\n    ]\n}\n\nThe key response will be shown to the user as a response to the user prompt.\nThe actions array can be empty if the user prompt requires no actions to be executed.\nWhen executing an action, always use the action name. Never use the action id to execute actions, just the name. \n\n</instructions>\n<board_actions>\n${JSON.stringify(boardActions)}\n</board_action>\n<board_states>\n${JSON.stringify(board)}\n</board_states>\n\nThe user prompt is:\n\n${params.prompt}\n`,\n  conversation: await context.chatgpt.getSystemPrompt({\n    prompt: `You can analyze images provided in the same user turn. \nDo NOT claim you cannot see images. \nAnswer following the JSON contract only (no code fences).`,\n  }),\n  images: await context.boards.getStatesByType({\n    board: board,\n    type: \"frame\",\n    key: \"frame\",\n  }),\n  files: await context.boards.getStatesByType({\n    board: board,\n    type: \"file\",\n    key: \"path\",\n  }),\n});\n\nreturn context.chatgpt.processResponse({\n  response: response,\n  execute_action: execute_action,\n});\n",
      html: "//@card/react\n\nfunction Widget(card) {\n  const value = card.value;\n\n  const content = <YStack f={1}  mt={\"20px\"} ai=\"center\" jc=\"center\" width=\"100%\">\n      {card.icon && card.displayIcon !== false && (\n          <Icon name={card.icon} size={48} color={card.color}/>\n      )}\n      {card.displayResponse !== false && (\n          <CardValue mode={card.markdownDisplay ? 'markdown' : 'normal'} value={value ?? \"N/A\"} />\n      )}\n  </YStack>\n\n  return (\n      <Tinted>\n        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>\n          <ActionCard data={card}>\n            {card.displayButton !== false ? <ParamsForm data={card}>{content}</ParamsForm> : card.displayResponse !== false && content}\n          </ActionCard>\n        </ProtoThemeProvider>\n      </Tinted>\n  );\n}\n",
      params: {
        prompt: ""
      },
      configParams: {
        prompt: {
          visible: true,
          defaultValue: "",
          type: "text"
        }
      },
      displayIcon: false,
      displayButton: true,
      displayButtonIcon: true,
      icon: 'sparkles'
    },
    name: 'AI Action',
    id: 'aiaction',
  },
  {
    defaults: {
      type: 'value',
      name: 'value'
    },
    name: 'Observer',
    id: 'value'
  }
]

function flattenTree(obj, currentGroup = null) {
  let leaves = [];

  function traverse(node, group) {
    if (node && typeof node === 'object') {
      if (node.name) {
        leaves.push({ ...node, group: group }); // añade el grupo a cada hoja
      } else {
        for (const [key, value] of Object.entries(node)) {
          traverse(value, group ?? key); // el primer nivel se considera grupo
        }
      }
    }
  }

  traverse(obj, currentGroup);
  return leaves;
}

const useCards = (extraCards = []) => {
  const availableCards = useProtoStates({}, 'cards/#', 'cards')
  return [...extraCards, ...flattenTree(availableCards)]
}

const makeDefaultCard = (tpl) => ({
  key: "key",
  width: tpl?.defaults?.type === 'value' ? 1 : 2,
  height: tpl?.defaults?.type === 'value' ? 4 : 6,
  icon: iconTable[tpl?.defaults?.type],
  html: typeCodes[tpl?.defaults?.type],
  ...tpl?.defaults,
})

function generateVersionatedName(name, existing) {
  const set = existing instanceof Set ? existing : new Set(existing);
  if (!set.has(name)) return name; // if doesn't exist, keep it

  // separate extension (doesn't count .env as extension)
  const i = name.lastIndexOf('.');
  const ext = i > 0 ? name.slice(i) : '';
  const base0 = i > 0 ? name.slice(0, i) : name;

  // only " base NUM" format at the end
  const m = /^(.*?)(?: (\d+))?$/.exec(base0);
  const base = m[1];
  let n = m[2] ? +m[2] : 1; // if no number -> start at 1 so first ++ is 2

  let candidate;
  do candidate = `${base} ${++n}${ext}`;
  while (set.has(candidate));

  return candidate;
}

export const CardSelector = ({ defaults = {}, board, addOpened, setAddOpened, onFinish, states, icons, actions, errors }) => {
  const cards = useCards(extraCards)

  const [selectedCard, setSelectedCard] = useState(null)
  const [card, setCard] = useState(null)
  const [remountKey, setRemountKey] = useState(uuidv4())

  useEffect(() => {
    if (cards?.length && !selectedCard) {
      setSelectedCard(cards[0])
    }
  }, [cards, selectedCard])

  useEffect(() => {
    if (!selectedCard) return
    setCard(makeDefaultCard(selectedCard))
    setRemountKey(uuidv4())
  }, [selectedCard])

  useEffect(() => {
    if (!addOpened) return
    const tpl = selectedCard ?? cards?.[0]
    if (tpl) {
      setCard(makeDefaultCard(tpl))
    }
    setRemountKey(uuidv4())
  }, [addOpened])

  return <AlertDialog
    integratedChat
    p="$2"
    pt="$5"
    pl="$5"
    setOpen={setAddOpened}
    open={addOpened}
    hideAccept
    description=""
  >
    <YStack f={1} jc="center" ai="center">
      <XStack f={1} mr="$5">
        <Slides
          hideHeader={true}
          styles={{ f: 1, w: "90vw", maw: 1400, h: "90vh", mah: 1200 }}
          lastButtonCaption="Create"
          onFinish={async () => {
            try {
              const existingNames = board?.cards.map(c => c.name) ?? []
              card["name"] = card.customName ?? generateVersionatedName(card.name, existingNames)
              await onFinish(card)
              setAddOpened(false)
            } catch (e) {
              console.error("Error creating card: ", e)
            }
          }}
          slides={[
            {
              name: "Create new card",
              component: (
                <FirstSlide options={cards} selected={selectedCard} setSelected={setSelectedCard} />
              ),
            },
            // {
            //   name: "Configure your card",
            //   component: card ? (
            //     <SecondSlide remountKey={remountKey} board={board} states={states} icons={icons} actions={actions} card={card} setCard={setCard} errors={errors} />
            //   ) : null,
            // },
          ]}
        />
      </XStack>
    </YStack>
  </AlertDialog>
}
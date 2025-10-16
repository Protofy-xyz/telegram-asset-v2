import { Panel, PanelGroup } from "react-resizable-panels";
import { YStack, ScrollView, Text, Input, XStack, Button, Label, Accordion, Square } from "@my/ui";
import CustomPanelResizeHandle from "../MainPanel/CustomPanelResizeHandle";
import { JSONView } from "../JSONView";
import { useCallback, useMemo, useState } from "react";
import { AlignLeft, Braces, ChevronDown, Copy, Globe, LayoutDashboard, Search } from "@tamagui/lucide-icons";
import { TabBar } from "../TabBar";
import { generateActionCode, generateStateCode } from "@extensions/boards/utils/ActionsAndStates"
import { Tinted } from "../Tinted";

function flattenObject(obj, prefix = "", maxDepth = undefined, currentDepth = 1) {
    let result = [];
    for (let key in obj) {
        if (!obj.hasOwnProperty(key)) continue;

        const value = obj[key];
        const newPath = prefix ? prefix + " -> " + key : key;

        if (typeof value === "object" && value !== null && currentDepth < maxDepth) {
            if (Object.keys(value).length > 0) {
                const nested = flattenObject(value, prefix, maxDepth, currentDepth + 1);
                result.push(...nested);
            } else {
                result.push([[newPath], JSON.stringify(newPath)]);
            }

        } else {
            result.push([[newPath], newPath]);
        }
    }

    return result;
}

const StatesBoardsView = ({ data, boardName }) => {
    const [selectedBoard, setSelectedBoard] = useState(boardName)

    return <YStack gap="$2" ai="flex-start" f={1} width="100%">
        {Object.keys(data ?? {}).length > 0
            ? <BoardsAccordion boards={data} selectedBoard={selectedBoard} onSelectBoard={setSelectedBoard}>
                <JSONView
                    collapsed={1}
                    style={{ backgroundColor: 'transparent' }}
                    src={data?.[selectedBoard]}
                    collapseStringsAfterLength={100}
                    enableClipboard={(copy) => {
                        const path = generateStateCode([selectedBoard, ...copy.namespace], "boards")
                        navigator.clipboard.writeText(path)
                        return false
                    }}
                />

            </BoardsAccordion>
            : <YStack f={1} w="100%" ai="center" mt="$10">
                <Text fos="$4" col="$gray8">No states found</Text>
            </YStack>
        }
    </YStack>
}

const BoardsAccordion = ({ boards, children, selectedBoard, onSelectBoard }) => {

    const boardsList = useMemo(() => Object.keys(boards ?? {}), [boards]);


    return <YStack gap="$2" width={"100%"}> {
        boardsList.map((category => {
            return <XStack key={category} f={1}>
                <Accordion value={selectedBoard} onValueChange={onSelectBoard} collapsible onPress={(e) => e.stopPropagation()} type="single" flex={1}>
                    <Accordion.Item value={category} boc="$gray6">
                        <Accordion.Trigger bc="$gray2" unstyled p={"$3"} flexDirection="row" ai="center" br="$4">
                            {({ open }) => (
                                <XStack flex={1} flexDirection="row" ai="center" jc="space-between">
                                    <Text fos="$4" ml={"$2"} fow={100}>{category}</Text>
                                    <Square o={0.8} animation="quick" rotate={open ? '180deg' : '0deg'} mr={"$1.5"}>
                                        <ChevronDown size="$1" />
                                    </Square>
                                </XStack>
                            )}
                        </Accordion.Trigger>
                        <Accordion.Content bc="transparent" p={0}>
                            {children}
                        </Accordion.Content>
                    </Accordion.Item>
                </Accordion>
            </XStack>
        }))
    }
    </YStack>
}

const ActionsList = ({ maxDepth = 1, copyIndex = 1, displayIndex = 1, data, hideValue = false, onCopy = (text) => text }) => {
    const [showCopied, setShowCopied] = useState<number | null>(null)

    const list = useMemo(() => {
        if (!data || typeof data !== 'object') return [];
        return flattenObject(data, "", maxDepth);
    }, [data, maxDepth]);

    const handleCopy = useCallback((text: string, index: number) => {
        const copiedText = onCopy(text)
        navigator.clipboard.writeText(copiedText)
        setShowCopied(index)
        setTimeout(() => setShowCopied(null), 700)
    }, [onCopy])


    return (
        <YStack width={"100%"} gap="$2" p="$3">
            {list.map((line, index) => {
                const isCopied = showCopied === index
                const keyLabel = line[0]
                const value = line[copyIndex]

                return (
                    <Tinted>
                        <Button
                            key={keyLabel + index}
                            bc={isCopied ? "transparent" : "$bgPanel"}
                            alignSelf="flex-start"
                            width="auto"
                            size="$2"
                            iconAfter={<Copy color={isCopied ? "transparent" : "$color8"} />}
                            hoverStyle={{ backgroundColor: isCopied ? "transparent" : "$color5" }}
                            onPress={() => handleCopy(value, index)}
                        >
                            {isCopied
                                && <Text numberOfLines={1} overflow="visible" fos="$4" color="$color">
                                    copied to clipboard!
                                </Text>
                            }
                            <XStack opacity={isCopied ? 0 : 1}>
                                <Text fos="$4">
                                    {keyLabel + (hideValue ? '' : ' : ')}
                                </Text>
                                {!hideValue && (
                                    <Text fos="$4" color="$color7">
                                        {line[displayIndex] || value}
                                    </Text>
                                )}
                            </XStack>
                        </Button>
                    </Tinted>
                )
            })}
        </YStack>
    )
}

const FormattedView = ({ maxDepth = 1, copyIndex = 1, displayIndex = 1, data, hideValue = false, copyMode = "rules", format = "actions", boardName = "" }) => {
    const [selectedBoard, setSelectedCategory] = useState(boardName)

    const copy = (text) => {
        const val = format === "boards" ? data?.[selectedBoard]?.[text] : data?.[text];
        if (!val || !val.url) return '';
        const targetBoard = getBoardIdFromActionUrl(val.url);
        let copyVal = val.url;

        if (targetBoard && targetBoard === boardName) {
            copyVal = val.name
        }

        if (copyMode === "rules") {
            return generateActionCode(copyVal)
        }

        if (copyMode === "code" || copyMode === "flows") {
            return generateActionCode(copyVal, val.params ?? {})
        }

        return text
    }

    return (
        <YStack width={"100%"} >
            {
                format === "boards"
                    ? <BoardsAccordion boards={data} selectedBoard={selectedBoard} onSelectBoard={setSelectedCategory} >
                        <ActionsList
                            maxDepth={maxDepth}
                            copyIndex={copyIndex}
                            displayIndex={displayIndex}
                            data={data?.[selectedBoard] ?? {}}
                            hideValue={hideValue}
                            onCopy={copy}
                        />
                    </BoardsAccordion>
                    : <ActionsList maxDepth={maxDepth} copyIndex={copyIndex} displayIndex={displayIndex} data={data} hideValue={hideValue} onCopy={copy} />
            }
        </YStack>
    )
}

function getBoardIdFromActionUrl(path: string): string | null {
    const match = path.match(/^\/api\/core\/v1\/boards\/([^\/]+)\/actions\/.+$/);
    return match ? match[1] : null;
}

function filterObjectBySearch(data, search) {
    if (data === null || data === undefined) return undefined;
    const lowerSearch = search.toLowerCase();

    if (typeof data !== "object") {
        const strData = String(data).toLowerCase();
        return strData.includes(lowerSearch) ? data : undefined;
    }

    if (Array.isArray(data)) {
        const filteredArr = [];
        for (const item of data) {
            const filteredItem = filterObjectBySearch(item, search);
            if (filteredItem !== undefined) {
                filteredArr.push(filteredItem);
            }
        }
        return filteredArr.length > 0 ? filteredArr : undefined;
    }

    const result = {};
    for (const [key, value] of Object.entries(data)) {
        const keyMatches = key.toLowerCase().includes(lowerSearch);
        const filteredValue = filterObjectBySearch(value, search);

        if (keyMatches || filteredValue !== undefined) {
            result[key] = filteredValue === undefined ? value : filteredValue;
        }
    }

    return Object.keys(result).length > 0 ? result : undefined;
}

export const ActionsAndStatesPanel = ({ board, panels = ["actions", "states"], actions, states, copyMode, showActionsTabs = false, showStatesTabs = false }) => {
    const [inputMode, setInputMode] = useState<"json" | "formatted">("formatted")
    const [search, setSearch] = useState('')
    const [selectedStatesTab, setSelectedStatesTab] = useState(board.name)
    const [stateSearch, setStateSearch] = useState('')
    const [selectedActionsTab, setSelectedActionsTab] = useState(board.name)
    console.log("ActionsAndStatesPanel:", { actions, states });

    const cleanedActions = useMemo(() => {
        const cleaned = {};
        if (!actions || typeof actions !== 'object') return cleaned;
        for (const [level1Key, level1Value] of Object.entries(actions)) {
            if (!level1Value || typeof level1Value !== 'object') continue;
            for (const [level2Key, level2Value] of Object.entries(level1Value)) {
                if (!level2Value || typeof level2Value !== 'object') continue;
                const { name, description, params, url } = level2Value;
                if (!cleaned[level1Key]) cleaned[level1Key] = {};
                cleaned[level1Key][level2Key] = { name, description, params, url };
            }
        }
        return cleaned;
    }, [actions]);

    const filteredActionData = useMemo(() => {
        const visibleActions = selectedActionsTab === "otherBoards"
            ? Object.entries(cleanedActions ?? {})
                .filter(([boardId]) => boardId !== board?.name)
                .sort(([a], [b]) => a.localeCompare(b))
                .reduce((acc, [id, content]) => ({ ...acc, [id]: content }), {})
            : cleanedActions?.[selectedActionsTab]
        const filtered = filterObjectBySearch(visibleActions ?? {}, search)
        return filtered
    }, [cleanedActions, search, selectedActionsTab]);

    const filteredStateData = useMemo(() => {
        const visibleStates = selectedStatesTab === "otherBoards"
            ? Object.entries(states ?? {})
                .filter(([boardId]) => boardId !== board?.name)
                .reduce((acc, [id, content]) => ({ ...acc, [id]: content }), {})
            : states?.[selectedStatesTab]
        const filtered = filterObjectBySearch(visibleStates ?? {}, stateSearch)
        return filtered
    }, [states, stateSearch, selectedStatesTab]);


    const statesPanel = useMemo(() => {
        return <YStack gap="$2" ai="flex-start" f={1} >
            {
                filteredStateData
                    ? <JSONView collapsed={1} style={{ backgroundColor: 'transparent' }} src={filteredStateData} collapseStringsAfterLength={100} enableClipboard={(copy) => {
                        const path = generateStateCode(copy.namespace, "state")
                        navigator.clipboard.writeText(path)
                        return false
                    }} />
                    : <YStack f={1} w="100%" ai="center" mt="$10">
                        <Text fos="$4" col="$gray8">No states found</Text>
                    </YStack>
            }
        </YStack>
    }, [filteredStateData, board?.name, copyMode]);

    const actionsPanel = useMemo(() => {
        return <YStack gap="$2" ai="flex-start" f={1}>
            {inputMode === "formatted" && <FormattedView hideValue={true} data={filteredActionData} copyMode={copyMode} boardName={board?.name} />}
            {inputMode == "json" && <JSONView collapsed={3} style={{ backgroundColor: 'transparent' }} src={filteredActionData} />}
        </YStack>
    }, [filteredActionData, filteredActionData, inputMode, board?.name, copyMode]);

    const otherBoardsPanel = useMemo(() => {
        return <YStack gap="$2" ai="flex-start" f={1}>
            {inputMode === "formatted" && <FormattedView hideValue={true} data={filteredActionData} format={"boards"} copyMode={copyMode} boardName={board?.name} />}
            {inputMode == "json" && <JSONView collapsed={3} style={{ backgroundColor: 'transparent' }} src={filteredActionData} />}
        </YStack>
    }, [filteredActionData, filteredActionData, inputMode, board?.name, copyMode]);

    const statesOtherBoardsPanel = useMemo(() => {
        return <StatesBoardsView data={filteredStateData ?? {}} boardName={board?.name} />
    }, [filteredStateData])


    const actionsTabs = [
        { id: board.name, label: board.name, icon: <LayoutDashboard size={"$1"} />, content: actionsPanel },
        { id: "otherBoards", label: "Other boards", icon: <Globe size={"$1"} />, content: otherBoardsPanel },
    ]

    const statesTabs = [
        { id: board.name, label: board.name, content: statesPanel, icon: <LayoutDashboard size={"$1"} /> },
        { id: "otherBoards", label: "Other boards", content: statesOtherBoardsPanel, icon: <Globe size={"$1"} /> },
    ]

    const selectedAction = useMemo(
        () => actionsTabs.find(t => t.id === selectedActionsTab),
        [actionsTabs, selectedActionsTab]
    );

    const selectedState = useMemo(
        () => statesTabs.find(t => t.id === selectedStatesTab),
        [statesTabs, selectedStatesTab]
    );

    return <Panel defaultSize={30}>
        <PanelGroup direction="vertical">
            {panels && panels?.includes('actions') && <Panel defaultSize={50} minSize={20} maxSize={80} >
                <YStack flex={1} height="100%" p="$3" gap="$2" overflow="hidden">
                    <Tinted>
                        <XStack jc="space-between" width="100%">
                            <Label pl="$3" lineHeight={"$4"} >Actions</Label>
                            <XStack gap="$2">
                                <Button
                                    icon={AlignLeft}
                                    bc={inputMode === "formatted" ? "$bgPanel" : "$bgContent"}
                                    color={inputMode === "formatted" ? "$color8" : "$color"}
                                    scaleIcon={1.6}
                                    size="$2"
                                    onPress={() => setInputMode("formatted")}
                                />
                                <Button
                                    icon={Braces}
                                    color={inputMode === "json" ? "$color8" : "$color"}
                                    bc={inputMode === "json" ? "$bgPanel" : "$bgContent"}
                                    scaleIcon={1.6}
                                    size="$2"
                                    onPress={() => setInputMode("json")}
                                />
                            </XStack>
                        </XStack>
                    </Tinted>
                    <XStack gap="$2">
                        <Search pos="absolute" left="$3" top={14} size={16} />
                        <Input
                            bg="$bgPanel"
                            color="$gray12"
                            paddingLeft="$7"
                            bw={0}
                            h="47px"
                            boc="$gray6"
                            w="100%"
                            placeholder="search..."
                            placeholderTextColor="$gray9"
                            outlineColor={"$gray8"}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </XStack>
                    {
                        showActionsTabs
                            ? <>
                                <TabBar
                                    tabs={actionsTabs}
                                    selectedId={selectedActionsTab}
                                    onSelect={setSelectedActionsTab}
                                />
                                <ScrollView flex={1} width="100%" height="100%" overflow="auto">
                                    <XStack mt="$2">
                                        {selectedAction?.content ?? null}
                                    </XStack>
                                </ScrollView>
                            </>
                            : <ScrollView flex={1} width="100%" height="100%" overflow="auto">
                                <XStack mt="$2">
                                    {selectedAction?.content ?? null}
                                </XStack>
                            </ScrollView>
                    }

                </YStack>
            </Panel>}
            <CustomPanelResizeHandle direction="horizontal" borderLess={false} borderColor="var(--gray4)" />
            <Panel defaultSize={50} minSize={20} maxSize={80}>
                <YStack flex={1} height="100%" borderRadius="$3" p="$3" gap="$2" overflow="hidden" >
                    <Label pl="$3" lineHeight={"$4"} >States</Label>
                    <XStack>
                        <Search pos="absolute" left="$3" top={14} size={16} />
                        <Input
                            bg={"$bgPanel"}
                            color={"$gray12"}
                            paddingLeft="$7"
                            bw={0}
                            h="47px"
                            boc="$gray6"
                            w="100%"
                            placeholder="search..."
                            placeholderTextColor="$gray9"
                            outlineColor={"$gray8"}
                            value={stateSearch}
                            onChangeText={setStateSearch}
                        />
                    </XStack>
                    {
                        showStatesTabs
                            ? <>
                                <TabBar
                                    tabs={statesTabs}
                                    selectedId={selectedStatesTab}
                                    onSelect={setSelectedStatesTab}
                                />
                                <ScrollView flex={1} width="100%" height="100%" overflow="auto">
                                    <XStack mt="$2" f={1}>
                                        {selectedState?.content ?? null}
                                    </XStack>
                                </ScrollView>
                            </>
                            : <ScrollView flex={1} width="100%" height="100%" overflow="auto">
                                <XStack mt="$2" f={1}>
                                    {selectedState?.content ?? null}
                                </XStack>
                            </ScrollView>
                    }
                </YStack>
            </Panel>
        </PanelGroup>
    </Panel>
}

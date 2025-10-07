import { Panel, PanelGroup } from "react-resizable-panels";
import { YStack, ScrollView, Text, Input, XStack, Button } from "@my/ui";
import CustomPanelResizeHandle from "../MainPanel/CustomPanelResizeHandle";
import { JSONView } from "../JSONView";
import { useCallback, useMemo, useState } from "react";
import { AlignLeft, Braces, Copy, Globe, LayoutDashboard, Search, Settings } from "@tamagui/lucide-icons";
import { TabBar } from "../../components/TabBar";

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

const FormattedView = ({ maxDepth = 1, copyIndex = 1, displayIndex = 1, data, hideValue = false, onCopy = (text) => text }) => {
    const [showCopied, setShowCopied] = useState<number | null>(null)

    // Evita recalcular si `data` no cambia
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
        <>
            {list.map((line, index) => {
                const isCopied = showCopied === index
                const keyLabel = line[0]
                const value = line[copyIndex]

                return (
                    <XStack
                        key={keyLabel + index}
                        cursor="pointer"
                        p="$2"
                        px="$4"
                        bg="transparent"
                        gap="$2"
                        br="$4"
                        hoverStyle={{ backgroundColor: "$color5" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--gray5)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        onPress={() => handleCopy(value, index)}
                    >
                        {isCopied && (
                            <Text fos="$4" color="$gray10" pos="absolute" left="$4" >
                                copied to clipboard!
                            </Text>
                        )}

                        <XStack opacity={isCopied ? 0 : 1} mr="$5">
                            <Text fos="$4">
                                {keyLabel + (hideValue ? '' : ' : ')}
                            </Text>
                            {!hideValue && (
                                <Text fos="$4" color="$color7">
                                    {line[displayIndex] || value}
                                </Text>
                            )}
                        </XStack>

                        <YStack flex={1} hoverStyle={{ opacity: 1 }} opacity={0}>
                            <Copy display="flex" color="$blue8" pos="absolute" r="$1" top={2} size={14} />
                        </YStack>
                    </XStack>
                )
            })}
        </>
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

export const ActionsAndStatesPanel = ({ board, panels = ["actions", "states"], actions, states, copyMode, colors = {} }) => {

    const [inputMode, setInputMode] = useState<"json" | "formatted">("formatted")
    const [search, setSearch] = useState('')
    const [stateSearch, setStateSearch] = useState('')
    const [selectedActionTab, setSelectedActionTab] = useState('board')
    const [selectedStateTab, setSelectedStateTab] = useState('board')

    // Show/hide action and state tabs
    const showActionsTabs = false
    const showStatesTabs = false

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

    const filteredData = useMemo(() => {
        const filtered = filterObjectBySearch(cleanedActions?.[board.name] ?? {}, search)
        return filtered
    }, [cleanedActions, search]);

    const filteredStateData = useMemo(() => {
        const filtered = filterObjectBySearch(states?.[board.name] ?? {}, stateSearch)
        return filtered
    }, [states, stateSearch]);

    console.log("filteredStateData:", filteredStateData);
    const actionData = filteredData

    const copy = (text, mode) => {
        const val = actions[board.name][text];
        if (!val || !val.url) return '';
        const targetBoard = getBoardIdFromActionUrl(val.url);
        let copyVal = val.url;
        if (targetBoard && targetBoard === board?.name) {
            copyVal = val.name
        }

        if (mode === "rules") {
            return `await executeAction({name: "${copyVal}"})`
        }

        if (mode === "code" || mode === "flows") {
            return `await executeAction({name: "${copyVal}", params: {
${Object.entries(val.params || {}).map(([key, value]) => {
                return `\t${key}: '', // ${value}`;
            }).join('\n')}
}})`
        }


        return text
    }

    const statesPanel = useMemo(() => {
        return <YStack gap="$2" ai="flex-start">
            {filteredStateData && <JSONView collapsed={1} style={{ backgroundColor: 'transparent' }} src={filteredStateData} collapseStringsAfterLength={100} enableClipboard={(copy) => {
                const path = 'board' + copy.namespace
                    .filter(v => v)
                    .map(k => `?.[${JSON.stringify(k)}]`)
                    .join('') + ' '

                navigator.clipboard.writeText(path)
                return false
            }} />
            }
            {!filteredStateData && <Text>No states found</Text>}
        </YStack>
    }, [filteredStateData, board?.name, copyMode]);

    const actionsPanel = useMemo(() => {
        return <YStack gap="$2" ai="flex-start">
            {inputMode === "formatted" && <FormattedView hideValue={true} onCopy={(text) => copy(text, copyMode)} data={actionData} />}
            {inputMode == "json" && <JSONView collapsed={3} style={{ backgroundColor: 'transparent' }} src={filteredData} />}
        </YStack>
    }, [filteredData, actionData, inputMode, board?.name, copyMode]);


    const actionsTab = [
        { id: 'board', label: 'Board', icon: <LayoutDashboard size={"$1"} />, content: actionsPanel },
        { id: 'global', label: 'Global', icon: <Globe size={"$1"} />, content: <h1>Global actions panel (todo)</h1> },
        { id: 'system', label: 'System', icon: <Settings size={"$1"} />, content: <h1>System actions panel (todo)</h1> }
    ]

    const statesTab = [
        { id: 'board', label: 'Board', icon: <LayoutDashboard size={"$1"} />, content: statesPanel },
        { id: 'global', label: 'Global', icon: <Globe size={"$1"} />, content: <h1>Global states panel (todo)</h1> },
        { id: 'system', label: 'System', icon: <Settings size={"$1"} />, content: <h1>System states panel (todo)</h1> }
    ]

    const selectedAction = useMemo(
        () => actionsTab.find(t => t.id === selectedActionTab),
        [actionsTab, selectedActionTab]
    );

    const selectedState = useMemo(
        () => statesTab.find(t => t.id === selectedStateTab),
        [statesTab, selectedStateTab]
    );


    return <Panel defaultSize={30}>
        <PanelGroup direction="vertical">
            {panels && panels?.includes('actions') && <Panel defaultSize={50} minSize={20} maxSize={80}>
                <YStack flex={1} height="100%" borderRadius="$3" p="$3" gap="$2" backgroundColor={colors["bgColor"] ?? "$gray3"} overflow="hidden" >
                    <XStack pb={8}>
                        <Search pos="absolute" left="$3" top={14} size={16} />
                        <Input
                            bg={colors["inputBgColor"] ?? "$gray1"}
                            color="$gray12"
                            paddingLeft="$7"
                            bw={0}
                            h="47px"
                            boc="$gray6"
                            // br={100}
                            w="100%"
                            placeholder="search..."
                            placeholderTextColor="$gray9"
                            outlineColor={"$gray8"}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </XStack>
                    <XStack jc="space-between" width="100%">
                        <p>Actions</p>
                        <XStack gap="$2">
                            <Button
                                icon={AlignLeft}
                                bc={inputMode === "formatted" ? "$gray7" : "$gray4"}
                                scaleIcon={1.6}
                                size="$2"
                                onPress={() => setInputMode("formatted")}
                            />
                            <Button
                                icon={Braces}
                                bc={inputMode === "json" ? "$gray7" : "$gray4"}
                                scaleIcon={1.6}
                                size="$2"
                                onPress={() => setInputMode("json")}
                            />
                        </XStack>
                    </XStack>
                    <ScrollView flex={1} width="100%" height="100%" overflow="auto">
                        {showActionsTabs ? (
                            <>
                                <TabBar
                                    tabs={actionsTab}
                                    selectedId={selectedActionTab}
                                    onSelect={setSelectedActionTab}
                                />
                                <XStack mt="$2">
                                    {selectedAction?.content ?? null}
                                </XStack>
                            </>
                        ) : (
                            actionsPanel
                        )}
                    </ScrollView>
                </YStack>
            </Panel>}
            <CustomPanelResizeHandle direction="horizontal" />
            <Panel defaultSize={50} minSize={20} maxSize={80}>
                <YStack flex={1} height="100%" borderRadius="$3" p="$3" gap="$2" backgroundColor={colors["bgColor"] ?? "$gray3"} overflow="hidden" >
                    <XStack pb={8}>
                        <Search pos="absolute" left="$3" top={14} size={16} />
                        <Input
                            bg={colors["inputBgColor"] ?? "$gray1"}
                            color={"$gray12"}
                            paddingLeft="$7"
                            bw={0}
                            h="47px"
                            boc="$gray6"
                            // br={100}
                            w="100%"
                            placeholder="search..."
                            placeholderTextColor="$gray9"
                            outlineColor={"$gray8"}
                            value={stateSearch}
                            onChangeText={setStateSearch}
                        />
                    </XStack>
                    <XStack jc="space-between" width="100%">
                        <p>State</p>
                    </XStack>
                    <ScrollView flex={1} width="100%" height="100%" overflow="auto" >
                        {showStatesTabs ? (
                            <>
                                <TabBar
                                    tabs={statesTab}
                                    selectedId={selectedStateTab}
                                    onSelect={setSelectedStateTab}
                                />
                                <XStack mt="$2">
                                    {selectedState?.content ?? null}
                                </XStack>
                            </>
                        ) : (
                            statesPanel
                        )}
                    </ScrollView>

                </YStack>
            </Panel>
        </PanelGroup>
    </Panel>
}
import * as React from 'react';
import { XStack, YStack, Text, Button } from '@my/ui'
import { ALargeSmall, Binary, Braces, ChevronDown, ListTree, Zap } from '@tamagui/lucide-icons'
import { useState } from 'react';

const ActionRow = ({ action, onPress = () => { } }) => {
    return <XStack justifyContent="space-between" gap="$3" alignItems="center" onPress={onPress}
    >
        <XStack justifyContent="flex-start" gap="$3" alignItems="center">
            <Zap color="var(--gray9)" stroke="1px" height="18px" />
            {action.name}
        </XStack>
        <Text color="$blue11">{(action?.description ?? "")?.length >= 30 ? (action?.description ?? "").slice(0, 30) + "..." : (action?.description ?? "")}</Text>
    </XStack>
}

const StateRow = ({ state, onPress }) => {
    const type = typeof state.value
    const [showProperties, setShowProperties] = useState(false)

    if (type === "number") {
        return <XStack onPress={() => onPress()} justifyContent="space-between" gap="$3" alignItems="center">
            <XStack justifyContent="flex-start" gap="$3" alignItems="center">
                <Binary
                    style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }}
                />
                {state.name}
            </XStack>
            <Text color="$green11">{state.value}</Text>
        </XStack>
    }

    if (type === "string") {
        return <XStack onPress={() => onPress()} justifyContent="space-between" gap="$3" alignItems="center">
            <XStack justifyContent="flex-start" gap="$3" alignItems="center">
                <ALargeSmall
                    style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }}
                />
                {state.name}
            </XStack>
            <Text color="$green11" textAlign="right">{state.value.length > 30 ? state.value.slice(0, 30) + "..." : state.value}</Text>
        </XStack>
    }

    if (type === "object") {
        return <YStack onPress={() => setShowProperties(prev => !prev)} gap="$3">
            <XStack justifyContent="space-between" gap="$3" alignItems="center">
                <XStack justifyContent="flex-start" gap="$3" alignItems="center">
                    <ListTree
                        style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }}
                    />
                    {state.name}
                </XStack>
                <YStack br="$2" hoverStyle={{ backgroundColor: "$gray8" }}
                    onPress={(e) => {
                        e.stopPropagation()
                        setShowProperties(prev => !prev)
                    }} >
                    <ChevronDown
                        height="20px"
                        color="$gray9"
                        rotate={showProperties ? "180deg" : "0deg"}
                        style={{
                            transition: "all ease-in-out 120ms"
                        }}
                    />
                </YStack>
            </XStack>
            {
                showProperties && <YStack pl="$5" pb="$2">
                    {Object.keys(state.value).map(key => {
                        const valueType = typeof state.value[key]
                        return <XStack jc="space-between" gap="$3" br="$2" px="$2" py="$1" hoverStyle={{ backgroundColor: "var(--gray8)" }} onPress={() => onPress(key)}>
                            <XStack justifyContent="flex-start" gap="$3" alignItems="center">
                                {
                                    valueType === "object"
                                        ? <Braces style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }} />
                                        : valueType === "number"
                                            ? <Binary style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }} />
                                            : <ALargeSmall style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }} />
                                }
                                <Text>{key}</Text>
                            </XStack>
                            <Text color="$green11">{typeof state.value[key]}</Text>
                        </XStack>
                    })}
                </YStack>
            }
        </YStack>
    }

    return <XStack justifyContent="flex-start" gap="$3" alignItems="center">
        {state.name}
    </XStack>
}

export const ShortcutDropdown = ({ disableShortCuts = [], filteredOptions = [], selectDropdownOption, actions, dumpedValue, ref, itemRefs, states, dropdownPosition, showDropdown, setShowDropdown, selectedIndex, setSelectedIndex }) => {
    const dropdownRef = React.useRef<HTMLElement | null>(null);
    const closeDropdown = () => {
        setShowDropdown(null)
        setTimeout(() => { ref?.current?.focus() }, 50)
    }
    
    const getDropdownSelection = () => {
        let selection = filteredOptions[selectedIndex]
        if (selection === undefined || selection === null) return
        return selection
    }

    return <YStack
        ref={dropdownRef}
        style={{
            position: "absolute",
            minWidth: "220px",
            maxWidth: "100%",
            width: "max-content",
            zIndex: 10,
            top: dropdownPosition.top,
            left: dropdownPosition.left,
        }}
        maxHeight={"200px"}
        overflowY="scroll"
        p="10px"
        br="$4"
        bg="$gray4"
        borderWidth="1px"
        borderColor={"$gray6"}
        gap="$2"
    >
        <XStack gap="$1">
            {
                [
                    { name: "actions", col: "blue" },
                    { name: "states", col: "green" },
                    ...(!disableShortCuts.includes("params") ? [{ name: "params", col: "purple" }] : [])
                ].map(type => {
                    return <XStack
                        key={type.name}
                        onPress={() => { setShowDropdown(type.name); setSelectedIndex(0) }}
                        bc={showDropdown === type.name ? `$${type.col}6` : "transparent"}
                        px="$3"
                        py="$1"
                        br="$2">
                        <Text
                            color={showDropdown === type.name ? `$${type.col}11` : "$gray9"}
                            fontSize={"$5"}
                            textAlign="center"
                            alignSelf="center"
                            cursor="pointer"
                            style={{ transition: "all ease-in-out 80ms" }}
                        >
                            {type.name}
                        </Text>
                    </XStack>
                })
            }
        </XStack>
        {
            filteredOptions?.length
                ? filteredOptions.map((v, i) => {
                    return <YStack
                        key={v}
                        ref={el => (itemRefs.current[i] = el)}
                        onMouseEnter={(e) => setSelectedIndex(i)}
                        backgroundColor={i === selectedIndex ? "var(--gray6)" : "transparent"}
                        hoverStyle={{ backgroundColor: "var(--gray6" }}
                        justifyContent="flex-start"
                        cursor="pointer"
                        p="$2"
                        br="$2"
                    >
                        {
                            showDropdown === "actions"

                                ? <ActionRow
                                    action={actions[v]}
                                    onPress={() => {
                                        closeDropdown()
                                        selectDropdownOption(getDropdownSelection(), dumpedValue)
                                    }}
                                />
                                : showDropdown === "states"
                                    ? <StateRow
                                        state={{ name: v, value: states[v], }}
                                        onPress={(k = null) => {
                                            let selection = getDropdownSelection()
                                            if (k !== null) {
                                                selection = [selection, k]
                                            }
                                            selectDropdownOption(selection, dumpedValue)
                                            closeDropdown()
                                        }}
                                    />
                                    : <XStack
                                        onPress={() => {
                                            closeDropdown()
                                            selectDropdownOption(getDropdownSelection(), dumpedValue)
                                        }}
                                        jc="flex-start"
                                        gap="$3"
                                        ai="center"
                                    >
                                        <Braces style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }} />
                                        {v}
                                    </XStack>
                        }
                    </YStack>
                })
                : <Text> no {showDropdown} found</Text>
        }
    </YStack>
}


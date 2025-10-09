import { useMemo, useState, useCallback } from 'react'
import { YStack, XStack, Label, Input, Checkbox, Text, Paragraph, ScrollView } from '@my/ui'
import { Check } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { IconSelect } from '../IconSelect'
import { InputColor } from '../InputColor'

export const SettingsTitle = ({ children, error = "", ...props }) => {
    return (
        <XStack ai={"center"}>
            <Label ml={"$3"} h={"$3.5"} color="$gray9" size="$5" {...props}>
                {children}
            </Label>
            {error ? (
                <Text color={"$red9"} fontSize={"$1"} ml={"$3"}>
                    {error}
                </Text>
            ) : null}
        </XStack>
    )
}

const SettingsSection = ({ children, title, ...props }) => {
    return (
        <YStack f={1} borderRadius="$3" p="$3" bc="$gray3">
            <SettingsTitle>{title}</SettingsTitle>
            <YStack {...props}>{children}</YStack>
        </YStack>
    )
}

type Setting = {
    key: string
    label: string
    section: string
    type: 'checkbox' | 'text'
    indent?: number
    placeholder?: string
    visible?: (ctx: { card: any; cardData: any }) => boolean
    // get/set custom for especial cases (tokens, buttonMode...)
    get?: (cardData: any, card: any) => any
    set?: (cardData: any, value: any) => any // returns new cardData
}

export const DisplayEditor = ({
    card,
    cardData,
    setCardData,
    icons,
    board,
    style, 
}: {
    card: any
    cardData: any
    icons: any
    setCardData: (data: any) => void
    board: any
    style?: any
}) => {
    const [error, setError] = useState<string | null>(null)

    const getCheckedDefault = useCallback((cd: any, key: string, noValueIs: boolean = false) => {
        if (cd[key] === undefined) return noValueIs
        return cd[key]
    }, [])

    const settings: Setting[] = [
        // ----- General -----
        { label: 'Keep value permanently', key: 'persistValue', type: 'checkbox', section: 'General', visible: ({ card }) => card.type === 'action' },
        { label: 'Autorun on start', key: 'autorun', type: 'checkbox', section: 'General', visible: ({ card }) => card.type === 'action' },
        { label: 'Always report value', key: 'alwaysReportValue', type: 'checkbox', section: 'General' },

        // ----- Display -----
        { label: 'Display title', key: 'displayTitle', type: 'checkbox', section: 'Display', get: (cd) => cd.displayTitle !== false },
        { label: 'Display icon', key: 'displayIcon', type: 'checkbox', section: 'Display', get: (cd) => cd.displayIcon !== false },
        { label: 'Display frame', key: 'displayFrame', type: 'checkbox', section: 'Display', get: (cd) => cd.displayFrame !== false },
        { label: 'Markdown display', key: 'markdownDisplay', type: 'checkbox', section: 'Display' },
        { label: 'Display value', key: 'displayResponse', type: 'checkbox', section: 'Display', get: (cd) => cd.displayResponse !== false, visible: ({ card }) => card.type === 'action' },
        { label: 'Display button', key: 'displayButton', type: 'checkbox', section: 'Display', get: (cd) => cd.displayButton !== false, visible: ({ card }) => card.type === 'action' },
        { label: 'Button text', key: 'buttonLabel', type: 'text', section: 'Display', indent: 1, visible: ({ card, cardData }) => card.type === 'action' && !!getCheckedDefault(cardData, 'displayButton', true) },
        {
            label: 'Button Full',
            key: 'buttonMode',
            type: 'checkbox',
            section: 'Display',
            indent: 1,
            visible: ({ card, cardData }) => card.type === 'action' && !!getCheckedDefault(cardData, 'displayButton', true),
            get: (cd) => cd.buttonMode === 'full',
            set: (cd, checked) => {
                if (checked) return { ...cd, buttonMode: 'full' }
                const { buttonMode, ...rest } = cd
                return rest
            },
        },
        {
            label: 'Display icon',
            key: 'displayButtonIcon',
            type: 'checkbox',
            section: 'Display',
            indent: 1,
            visible: ({ card, cardData }) => card.type === 'action' && !!getCheckedDefault(cardData, 'displayButton', true),
            get: (cd) => cd.displayButtonIcon === true,
            set: (cd, checked) => ({ ...cd, displayButtonIcon: !!checked }),
        },
        { label: 'Auto Minimize', key: 'autoResponsive', type: 'checkbox', section: 'Display', get: (cd) => cd.autoResponsive !== false },

        // ----- Paths and Permissions -----
        {
            label: 'API access',
            key: 'apiAccess',
            type: 'checkbox',
            section: 'Paths and Permissions',
            get: (cd) => Object.keys(cd.tokens ?? {}).length > 0,
            set: (cd, checked) => {
                if (checked) return { ...cd, tokens: { read: uuidv4(), run: uuidv4() } }
                const { tokens, ...rest } = cd
                return rest
            },
        },
        { label: 'User access', key: 'userAccess', type: 'checkbox', section: 'Paths and Permissions' },
        { label: 'Admin access', key: 'adminAccess', type: 'checkbox', section: 'Paths and Permissions' },

        { label: 'Allow public read', key: 'publicRead', type: 'checkbox', section: 'Paths and Permissions' },
        { label: 'Custom read path', key: 'enableCustomPath', type: 'checkbox', section: 'Paths and Permissions' },
        {
            label: 'Path to card',
            key: 'customPath',
            type: 'text',
            section: 'Paths and Permissions',
            indent: 1,
            visible: ({ cardData }) => !!cardData.enableCustomPath,
            get: (cd) => cd.customPath ?? `/workspace/cards/${cd.name}`,
        },

        { label: 'Read Card Page Path', key: 'customCardViewPath', type: 'text', placeholder: "Path to card (Ex: /card)", section: 'Paths and Permissions' },
        // @ts-ignore
        ...(cardData.type === "action"
            ? [
                { label: 'Allow public run', key: 'publicRun', type: 'checkbox', section: 'Paths and Permissions' },
                { label: 'Custom run path', key: 'enableCustomRunPath', type: 'checkbox', section: 'Paths and Permissions' },
                {
                    label: 'Path to card run',
                    key: 'customRunPath',
                    type: 'text',
                    section: 'Paths and Permissions',
                    indent: 1,
                    visible: ({ cardData }) => !!cardData.enableCustomRunPath,
                    get: (cd) => cd.customRunPath ?? `/workspace/cards/${cd.name}/run`,
                },

                { label: 'Run Card Page Path', key: 'customCardRunViewPath', type: 'text', placeholder: "Path to card run (Ex: /card/run)", section: 'Paths and Permissions' }
            ]
            : []
        ),
    ]

    // Group settings by section and filter by visible
    const settingsBySection = useMemo(() => {
        const acc: Record<string, Setting[]> = {}
        const ctx = { card, cardData }
        for (const s of settings) {
            if (s.visible && !s.visible(ctx)) continue
            if (!acc[s.section]) acc[s.section] = []
            acc[s.section].push(s)
        }
        return acc
    }, [settings, card, cardData])

    const renderSetting = (s: Setting) => {
        const indentMl = s.indent ? `$${s.indent * 4}` : undefined

        if (s.type === 'checkbox') {
            const checked = s.get ? !!s.get(cardData, card) : getCheckedDefault(cardData, s.key)
            const onCheckedChange = (checkedVal: boolean) => {
                if (s.set) {
                    setCardData(s.set(cardData, checkedVal))
                } else {
                    setCardData({ ...cardData, [s.key]: checkedVal })
                }
            }

            return (
                <XStack key={s.key} ai="center" gap="$2" ml={indentMl}>
                    <Checkbox
                        w="$2"
                        h="$2"
                        focusStyle={{ outlineWidth: 0 }}
                        checked={checked}
                        onCheckedChange={onCheckedChange}
                        className="no-drag"
                        bc={"$gray1"}
                        boc="$gray6"
                    >
                        <Checkbox.Indicator>
                            <Check size={16} color='var(--color8)'/>
                        </Checkbox.Indicator>
                    </Checkbox>
                    <Label>{s.label}</Label>
                </XStack>
            )
        }

        if (s.type === 'text') {
            const value = s.get ? s.get(cardData, card) : cardData?.[s.key] ?? ''
            return (
                <YStack key={s.key} ml={indentMl} w={400}>
                    <Label pl="$4">{s.label}</Label>
                    <Input
                        br={"8px"}
                        value={value}
                        placeholder={s["placeholder"] ?? s.label}
                        onChangeText={(t) => {
                            if (s.set) setCardData(s.set(cardData, t))
                            else setCardData({ ...cardData, [s.key]: t })
                        }}
                        bc="$gray1"
                        placeholderTextColor="$gray9"
                        boc="$gray6"
                    />
                </YStack>
            )
        }

        return null
    }

    return (
        <YStack f={1} gap="$4" style={style}>
            <XStack space="$4" flexWrap="wrap">
                <YStack flex={1} maw={400}>
                    <SettingsTitle error={error ?? ''}>
                        Name <Text color={"$color8"}>*</Text>
                    </SettingsTitle>
                    <Input
                        br={"8px"}
                        value={cardData.name}
                        bc="transparent"
                        boc="$gray6"
                        color={error ? '$red9' : undefined}
                        onChangeText={(t) => {
                            const regex = /^[a-zA-Z0-9-_ ]*$/
                            if (regex.test(t)) setError(null)
                            // else setError("Invalid input, only letters, numbers, spaces, - and _ are allowed.")
                            setCardData({ ...cardData, name: t })
                        }}
                    />
                </YStack>

                <YStack w={400}>
                    <SettingsTitle>Icon</SettingsTitle>
                    <IconSelect
                        br={"8px"}
                        icons={icons}
                        onSelect={(icon) => setCardData({ ...cardData, icon })}
                        selected={cardData.icon}
                    />
                </YStack>

                <YStack w={400}>
                    <SettingsTitle>Color</SettingsTitle>
                    <InputColor
                        br={"8px"}
                        color={cardData.color}
                        onChange={(e) => setCardData({ ...cardData, color: e.hex })}
                        inputProps={{ backgroundColor: 'transparent', borderColor: error ? '$red9' : '$gray6' }}
                    />
                </YStack>
            </XStack>

            <ScrollView>
                <YStack>
                    <YStack display="grid" gap="$2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        {Object.entries(settingsBySection).map(([section, items]) => {
                            const layout = section == "General" ? 'full' : 'half'
                            const gridColumn = layout === 'full' ? '1 / -1' : 'auto'
                            return (
                                // @ts-ignore
                                <YStack key={section} gridColumn='1 / -1' $gtMd={{ gridColumn }} >
                                    <SettingsSection title={section} flexDirection={layout === 'full' ? 'row' : 'column'} gap="$3">
                                        {items.map(renderSetting)}
                                    </SettingsSection>
                                </YStack>
                            )
                        })}
                    </YStack>
                </YStack>
            </ScrollView>
        </YStack>
    )
}

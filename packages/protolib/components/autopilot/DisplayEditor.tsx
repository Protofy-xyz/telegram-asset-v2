import { YStack, XStack, Label, Input, Checkbox, Text, Paragraph, ScrollView } from '@my/ui'
import { Check } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid';
import { IconSelect } from '../IconSelect';
import { InputColor } from '../InputColor';
import { useState } from 'react'

export const SettingsTitle = ({ children, error = "", ...props }) => {
    return <XStack ai={"center"}>
        <Label ml={"$3"} h={"$3.5"} color="$gray9" size="$5" {...props}>
            {children}
        </Label>
        {error ? <Text color={"$red9"} fontSize={"$1"} ml={"$3"}>{error}</Text> : <></>}
    </XStack>
}

const SettingsSection = ({ children, title, ...props }) => {
    return (
        <YStack f={1} borderRadius="$3" p="$3" bc="$gray3" >
            <SettingsTitle color="$color">{title}</SettingsTitle>
            <YStack {...props}>
                {children}
            </YStack>
        </YStack>
    )
}

export const DisplayEditor = ({
    card,
    cardData,
    setCardData,
    icons,
    board
}: {
    card: any
    cardData: any
    icons: any
    setCardData: (data: any) => void,
    board: any
}) => {
    const cellWidth = 350
    const cellHeight = 50
    const getChecked = (key: string) => cardData[key] !== false

    const handleCheckboxChange = (key: string) => (checked: boolean) => {
        setCardData({ ...cardData, [key]: checked })
    }

    const renderCheckbox = (label: string, key: string, checked?, onCheckedChange?) => (
        <XStack ai="center" gap="$2">
            <Checkbox
                w="$2"
                h="$2"
                focusStyle={{ outlineWidth: 0 }}
                checked={checked ?? getChecked(key)}
                onCheckedChange={onCheckedChange ?? handleCheckboxChange(key)}
                className="no-drag"
            >
                <Checkbox.Indicator>
                    <Check size={16} />
                </Checkbox.Indicator>
            </Checkbox>
            <Label>{label}</Label>
        </XStack>
    )
    const [error, setError] = useState(null)
    return (
        <YStack f={1} gap="$4">
            <XStack space="$4" flexWrap='wrap'>
                <YStack flex={1} maw={400} >
                    <SettingsTitle error={error}>
                        Name <Text color={"$color8"}>*</Text>
                    </SettingsTitle>
                    <Input
                        br={"8px"}
                        value={cardData.name}
                        color={error ? '$red9' : null}
                        onChangeText={(t) => {
                            const regex = /^[a-zA-Z0-9-_ ]*$/;
                            if (regex.test(t)) {
                                setError(null);
                            } else {
                                //setError("Invalid input, only letters, numbers, spaces, - and _ are allowed.");
                            }
                            setCardData({
                                ...cardData,
                                name: t,
                            })
                        }
                        }
                    />
                </YStack>
                <YStack w={400}>
                    <SettingsTitle>
                        Icon
                    </SettingsTitle>
                    <IconSelect
                        br={"8px"}
                        icons={icons}
                        onSelect={(icon) => {
                            setCardData({
                                ...cardData,
                                icon,
                            });
                        }}
                        selected={cardData.icon}
                    />
                </YStack>
                <YStack w={400}>
                    <SettingsTitle>
                        Color
                    </SettingsTitle>
                    <InputColor
                        br={"8px"}
                        color={cardData.color}
                        onChange={(e) =>
                            setCardData({ ...cardData, color: e.hex })
                        }
                    />
                </YStack>
            </XStack>
            <ScrollView flexWrap="wrap" space="$2">
                <SettingsSection title="General" flexDirection="row" flexWrap="wrap" gap="$6">
                    {card.type === 'action' && renderCheckbox('Keep value permanently', 'persistValue', cardData.persistValue ? true : false)}
                    {card.type === 'action' && renderCheckbox('Autorun on start', 'autorun', cardData.autorun ? true : false)}
                    {renderCheckbox('Always report value', 'alwaysReportValue', cardData.alwaysReportValue ? true : false)}
                </SettingsSection>
                <XStack flexWrap='wrap' space="$2">
                    <SettingsSection title="Display">
                        {renderCheckbox('Display title', 'displayTitle')}
                        {renderCheckbox('Display icon', 'displayIcon')}
                        {renderCheckbox('Display frame', 'displayFrame')}
                        {renderCheckbox('Markdown display', 'markdownDisplay', cardData.markdownDisplay ? true : false)}
                        {card.type === 'action' && (
                            <>
                                <YStack>
                                    {renderCheckbox('Display value', 'displayResponse')}
                                    <YStack>
                                        {renderCheckbox('Display button', 'displayButton')}

                                        {getChecked('displayButton') && (
                                            <YStack ai="flex-start" ml="$6" ac="flex-start">
                                                <Input
                                                    outlineColor="$colorTransparent"
                                                    id="button-text-input"
                                                    size="$4"
                                                    placeholder="Button text"
                                                    value={cardData.buttonLabel ?? 'Run'}
                                                    onChangeText={(value) => {
                                                        setCardData({ ...cardData, buttonLabel: value })
                                                    }}
                                                    className="no-drag"
                                                />
                                                {renderCheckbox('Button Full', 'buttonMode', cardData.buttonMode === 'full', (checked: boolean) => {
                                                    let newData = { ...cardData }
                                                    if (checked) {
                                                        newData.buttonMode = 'full'
                                                    } else {
                                                        delete newData.buttonMode
                                                    }
                                                    setCardData({ ...newData })
                                                })}
                                                {renderCheckbox('Display icon', 'displayButtonIcon', cardData.displayButtonIcon === true)}
                                            </YStack>
                                        )}
                                    </YStack>
                                </YStack>
                            </>
                        )}
                    </SettingsSection>
                    <SettingsSection title="Paths and Permissions">
                        <XStack ai="center" gap="$2">
                            <Checkbox
                                w="$2"
                                h="$2"
                                focusStyle={{ outlineWidth: 0 }}
                                checked={Object.keys(cardData.tokens ?? {}).length > 0}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setCardData({
                                            ...cardData, tokens: {
                                                'read': uuidv4(),
                                                'run': uuidv4()
                                            }
                                        })
                                    } else {
                                        const { tokens, ...rest } = cardData
                                        setCardData(rest)
                                    }
                                }}
                                className="no-drag"
                            >
                                <Checkbox.Indicator>
                                    <Check size={16} />
                                </Checkbox.Indicator>
                            </Checkbox>
                            <Label>API access</Label>
                        </XStack>
                        {renderCheckbox('Allow public read', 'publicRead', cardData.publicRead ? true : false)}
                        {renderCheckbox('Custom read path', 'enableCustomPath', cardData.enableCustomPath ? true : false)}
                        {cardData.enableCustomPath ? <YStack ai="flex-start" ml="$6" ac="flex-start">
                            <Input
                                outlineColor="$colorTransparent"
                                id="button-text-input"
                                size="$4"
                                placeholder="Path to card"
                                value={cardData.customPath ?? '/workspace/cards/' + cardData.name}
                                onChangeText={(value) => {
                                    setCardData({ ...cardData, customPath: value })
                                }}
                                className="no-drag"
                            />
                        </YStack> : <></>}

                        {renderCheckbox('Allow public run', 'publicRun', cardData.publicRun ? true : false)}
                        <YStack>
                            {renderCheckbox('Custom run path', 'enableCustomRunPath', cardData.enableCustomRunPath ? true : false)}
                            {cardData.enableCustomRunPath ? <Input
                                outlineColor="$colorTransparent"
                                id="button-text-input"
                                size="$4"
                                placeholder="Path to card"
                                value={cardData.customRunPath ?? '/workspace/cards/' + cardData.name + '/run'}
                                onChangeText={(value) => {
                                    setCardData({ ...cardData, customRunPath: value })
                                }}
                                className="no-drag"
                            />
                                : <></>}
                        </YStack>

                        <YStack w={cellWidth} h={cellHeight * 3}>
                            <Paragraph>Card Page Path</Paragraph>
                            <Input
                                outlineColor="$colorTransparent"
                                id="button-text-input"
                                size="$4"
                                placeholder={"Path to card. Ex: /" + cardData.name}
                                value={cardData.customCardViewPath}
                                onChangeText={(value) => {
                                    setCardData({ ...cardData, customCardViewPath: value })
                                }}
                                className="no-drag"
                            />
                            <Paragraph>Run Card Page Path</Paragraph>
                            <Input
                                outlineColor="$colorTransparent"
                                id="button-text-input"
                                size="$4"
                                placeholder={"Path to card. Ex: /" + cardData.name}
                                value={cardData.customCardRunViewPath}
                                onChangeText={(value) => {
                                    setCardData({ ...cardData, customCardRunViewPath: value })
                                }}
                                className="no-drag"
                            />
                        </YStack>

                    </SettingsSection>
                </XStack>
            </ScrollView>
        </YStack>
    )
}

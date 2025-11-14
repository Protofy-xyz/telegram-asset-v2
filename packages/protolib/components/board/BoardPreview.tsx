import { YStack, Text, XStack, Tooltip, Paragraph, Dialog, Label, Input, Button, TooltipSimple, Checkbox, } from '@my/ui';
import { Tinted } from '../Tinted';
import { Sparkles, Cog, Type, LayoutTemplate, AlertTriangle, Check } from "@tamagui/lucide-icons";
import { BoardModel } from '@extensions/boards/boardsSchemas';
import { useRouter } from 'solito/navigation';
import { getIconUrl } from '../IconSelect';
import { ItemMenu } from '../ItemMenu';
import { useState } from 'react';
import { API, set, setErrorMap } from 'protobase';
import { Toggle } from '../Toggle';
import { Workflow, LayoutDashboard, Presentation } from "@tamagui/lucide-icons";
import { InteractiveIcon } from 'protolib/components/InteractiveIcon'




export default ({ element, width, onDelete, ...props }: any) => {
    const board = new BoardModel(element);
    const [editSettingsDialog, seteditSettingsDialog] = useState(false);
    const [createTemplateDialog, setCreateTemplateDialog] = useState(false);
    const [selectedBoard, setSelectedBoard] = useState(null);
    const [description, setDescription] = useState('');
    const [templateName, setTemplateName] = useState(selectedBoard?.data.name);

    const hasSystemTag = (tags?: string[]) =>
        Array.isArray(tags) && tags.includes('system')

    const addSystemTag = (tags?: string[]) =>
        Array.from(new Set([...(tags ?? []), 'system']))

    const removeSystemTag = (tags?: string[]) =>
        (tags ?? []).filter(t => t !== 'system')

    const [tags, setTags] = useState<string[]>(board.get('tags') ?? [])
    const [checked, setChecked] = useState<boolean>(hasSystemTag(tags))

    const router = useRouter();

    const navIcons = [
        { key: 'graph' as const, label: 'Graph', Icon: Workflow },
        { key: 'board' as const, label: 'Dashboard', Icon: LayoutDashboard },
        { key: 'ui' as const, label: 'Presentation', Icon: Presentation },
    ];
    const goToView = (key: 'graph' | 'board' | 'ui', e: any) => {
        e.stopPropagation?.();
        e.preventDefault?.();

        const boardName = board.get('name');
        router.push(`/boards/view?board=${boardName}#${key}`);
    };



    return (
        <YStack
            cursor="pointer"
            bg="$bgPanel"
            elevation={4}
            br="$4"
            width={'100%'}
            f={1}
            display="flex"
            maxWidth={width ?? 474}
            p="$4"
            gap="$4"
            pointerEvents={editSettingsDialog || createTemplateDialog ? 'none' : 'auto'}
            {...props} >
            {Array.isArray(board?.get('tags')) && board.get('tags').includes('system') && <Tinted>
                <TooltipSimple label="This is a system agent if you edit or delete it, it may affect core functionality." delay={{ open: 500, close: 0 }} restMs={0}>
                    <XStack pos='absolute' gap="$2" right="14px" top="-10px" jc="center" ai="center" br="$2" bg="$yellow9" px="$2" py="$1">
                        <AlertTriangle color={"black"} size={14} />
                        <Text color={"black"} fow="600" fos="$1">System Agent</Text>
                    </XStack>
                </TooltipSimple>
            </Tinted>}
            <XStack jc={"space-between"} ai={"start"} >
                <XStack gap="$2" ai={"start"} >
                    <YStack>
                        <Text fos="$8" fow="600" maw={(width ?? 474) - 100} overflow='hidden' textOverflow='ellipsis' whiteSpace='nowrap'>
                            {board?.get("displayName") ?? board?.get("name")}
                        </Text>
                        <Text fos="$2" fow="600" >{board?.get("name")}</Text>
                    </YStack>
                </XStack>
                <XStack
                    ai={"center"}
                    onClick={(e) => { e.stopPropagation?.(); e.preventDefault?.(); }}
                    onPointerDown={(e) => { e.stopPropagation?.(); }}
                    onMouseDown={(e) => { e.stopPropagation?.(); }}
                    onPress={(e) => { e.stopPropagation?.(); }}
                >
                    <Tinted><Sparkles color={board.get("autopilot") ? "$color8" : "$gray8"} /></Tinted>

                    <ItemMenu
                        type={"item"}
                        mt={"1px"}
                        ml={"-5px"}
                        element={board}
                        deleteable={() => true}
                        onDelete={onDelete}
                        extraMenuActions={[
                            {
                                text: "Settings",
                                icon: Cog,
                                action: (element) => {
                                    seteditSettingsDialog(true)
                                    setSelectedBoard(element)
                                    const nextTags = element?.data?.tags ?? []
                                    setTags(nextTags)
                                    setChecked(hasSystemTag(nextTags))
                                },
                                isVisible: () => true
                            },
                            {
                                text: "Create template",
                                icon: LayoutTemplate,
                                action: (element) => { setCreateTemplateDialog(true); setSelectedBoard(element) },
                                isVisible: () => true
                            }
                        ]}
                    />
                </XStack>
            </XStack>
            <XStack
                gap="$3"
                ai="center"
                jc="flex-start"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                mb="$2"
            >
                <Tinted>
                {navIcons.map(({ key, Icon, label }) => (
                    <InteractiveIcon
                        key={key}
                        Icon={Icon}
                        IconColor="var(--color10)"
                        hoverStyle={{ bc: "var(--color5)" }}
                        pressStyle={{ o: 0.8 }}
                        size={30}
                        tooltip={label}
                        onClick={(e) => goToView(key, e)}
                    />
                ))}
                </Tinted>
            </XStack>
            <YStack gap="$2">
                <Text fow="600">Values</Text>
                {
                    board?.get("cards")?.length
                        ? <XStack gap="$2" f={1} mah={"$9"} flexWrap="wrap" overflow="scroll">
                            {board.get("cards")?.filter(i => i).map((card: any, index: number) => (
                                <Tinted key={card.name}>
                                    <Tooltip>
                                        <Tooltip.Trigger>
                                            <YStack
                                                h={"$3"}
                                                w={"$3"}
                                                br={card.type == "action" ? "$10" : "$2"}
                                                jc={"center"}
                                                ai={"center"}
                                                bc={card.color ?? "$color6"}
                                            >
                                                <img
                                                    src={getIconUrl(card.icon)}
                                                    width={20}
                                                    height={20}
                                                />
                                            </YStack>
                                        </Tooltip.Trigger>
                                        <Tooltip.Content>
                                            <Tooltip.Arrow />
                                            <Paragraph fow="600">{card.type}</Paragraph>
                                            <Paragraph>{card.name}</Paragraph>
                                        </Tooltip.Content>
                                    </Tooltip>
                                </Tinted>
                            ))}
                        </XStack>
                        : <Text color={"$color9"}>No values</Text>
                }
            </YStack>
            <YStack gap="$2" >
                <Text fow="600">Rules</Text>
                {
                    board.get("rules")?.length
                        ?
                        <YStack gap="$3" mah={300} overflow="scroll">
                            {board.get("rules")?.map((rule: any, index: number) => (
                                <XStack key={rule} gap={"$2"}  >
                                    <YStack display='flex' w="20px" >
                                        <Text > {index + 1 + "."}</Text>
                                    </YStack>
                                    <Text>{rule}</Text>
                                </XStack>)
                            )}
                        </YStack>
                        : <Text color={"$color9"}>No rules added yet</Text>
                }
            </YStack>

            <Dialog key={selectedBoard?.id} open={createTemplateDialog} onOpenChange={setCreateTemplateDialog}>
                <Dialog.Portal className='DialogPopup'>
                    <Dialog.Overlay className='DialogPopup' />
                    <Dialog.Content overflow="hidden" p={"$8"} height={'400px'} width={"400px"} className='DialogPopup'
                        onClick={(e) => { e.stopPropagation(); }}
                        onMouseDown={(e) => { e.stopPropagation(); }}
                        onPointerDown={(e) => { e.stopPropagation(); }}>
                        <YStack height="100%" justifyContent="space-between">
                            <Text fos="$8" fow="600" mb="$3" className='DialogPopup'>Agent Template</Text>
                            <XStack ai={"center"} className='DialogPopup'>
                                <Label ml={"$2"} h={"$3.5"} size={"$5"} className='DialogPopup'>Name</Label>
                            </XStack>
                            <Input
                                br={"8px"}
                                className='DialogPopup'
                                value={templateName}
                                // color={error ? '$red9' : null}
                                onChange={(e) => {
                                    setTemplateName(e.target.value);
                                }}
                            />

                            <XStack ai={"center"} className='DialogPopup'>
                                <Label ml={"$2"} h={"$3.5"} size={"$5"} className='DialogPopup'>Description</Label>
                            </XStack>
                            <Input
                                br={"8px"}
                                className='DialogPopup'
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                }}
                            />

                            <YStack flex={1} className='DialogPopup' />
                            <Button className='DialogPopup'
                                onMouseDown={(e) => { e.stopPropagation(); }}
                                onPointerDown={(e) => { e.stopPropagation(); }} onPress={async (e) => {
                                    e.stopPropagation();
                                    try {
                                        await API.post(`/api/core/v2/templates/boards`, {
                                            name: templateName,
                                            description,
                                            from: selectedBoard?.data?.name
                                        })
                                        setSelectedBoard(null);
                                        setCreateTemplateDialog(false);
                                    } catch (e) {
                                        console.log('e: ', e)
                                    }
                                }}>Create
                            </Button>
                        </YStack>
                        <Dialog.Close />
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog>


            <Dialog open={editSettingsDialog} onOpenChange={seteditSettingsDialog}>
                <Dialog.Portal className='DialogPopup'>
                    <Dialog.Overlay className='DialogPopup' />
                    <Dialog.Content overflow="hidden" p={"$8"} height={'400px'} width={"400px"} className='DialogPopup'>
                        <YStack height="100%" justifyContent="space-between">
                            <Text fos="$8" fow="600" mb="$3" className='DialogPopup'>Settings</Text>
                            <XStack ai={"center"} className='DialogPopup'>
                                <Label ml={"$2"} h={"$3.5"} size={"$5"} className='DialogPopup'> <Type color={"$color8"} mr="$2" />Display Name</Label>
                            </XStack>
                            <Input
                                br={"8px"}
                                className='DialogPopup'
                                value={selectedBoard?.data.displayName}
                                // color={error ? '$red9' : null}
                                onChange={(e) => {
                                    setSelectedBoard({
                                        data: {
                                            ...selectedBoard.data,
                                            displayName: e.target.value
                                        }
                                    })
                                }
                                }
                            />
                            <XStack ai="center" gap="$2" mt="$4"
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                onMouseDown={(e) => { e.stopPropagation(); }}
                                onPointerDown={(e) => { e.stopPropagation(); }}>
                                <Label h={"$3.5"} size={"$5"} >Hide board</Label>
                                <Toggle
                                    checked={checked}
                                    onChange={(next) => {
                                        setChecked(next)
                                        const updatedTags = next ? addSystemTag(tags) : removeSystemTag(tags)
                                        setTags(updatedTags)
                                        setSelectedBoard(prev => {
                                            if (!prev) return prev
                                            return {
                                                data: {
                                                    ...prev.data,
                                                    tags: updatedTags,
                                                },
                                            }
                                        })
                                    }}
                                />
                            </XStack>
                            <YStack flex={1} className='DialogPopup' />
                            <Button className='DialogPopup' onPress={async () => {
                                try {
                                    await API.post(`/api/core/v1/boards/${selectedBoard?.data?.name}`, selectedBoard.data)
                                    setSelectedBoard(null);
                                    seteditSettingsDialog(false);
                                } catch (e) {
                                    console.log('e: ', e)
                                }
                            }}>Save
                            </Button>
                        </YStack>
                        <Dialog.Close />
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog>
        </YStack>
    )
}
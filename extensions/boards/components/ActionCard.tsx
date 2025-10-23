import { Cable, Copy, Trash2, Settings, MoreVertical, Book, FileJson, ClipboardList, FileCode, FileInput, ExternalLink, Globe, ArrowDownRight, Play } from '@tamagui/lucide-icons'
import { YStack, XStack, Popover, Text, TooltipSimple, Paragraph, Button } from '@my/ui'
import { CenterCard } from '@extensions/services/widgets'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Tinted } from 'protolib/components/Tinted'
import dynamic from 'next/dynamic'
import { useEventEffect } from '@extensions/events/hooks'
import { JSONView } from 'protolib/components/JSONView'
import { useIsHighlightedCard, executeAction } from '../store/boardStore'
import { PublicIcon } from 'protolib/components/IconSelect'

const ActionRunner = dynamic(() => import('protolib/components/ActionRunner').then(mod => mod.ActionRunner), { ssr: false })

const CardIcon = ({ Icon, onPress, ...props }) => {
    return <Tinted>
        <XStack {...props} right={-10} hoverStyle={{ backgroundColor: '$backgroundFocus' }} pressStyle={{ backgroundColor: '$backgroundPress' }} borderRadius="$5" alignItems="center" justifyContent="center" cursor="pointer" padding="$2" onPress={onPress}>
            <Icon size={20} onPress={onPress} />
        </XStack>
    </Tinted>
}

const CardActions = ({ id, data, onEdit, onDelete, onEditCode, onCopy, onDetails, states }) => {
    // console.log("🤖 ~ CardActions ~ data:", data)
    const [menuOpened, setMenuOpened] = useState(false)
    const [cardStatesOpen, setCardStatesOpen] = useState(false)
    const MenuButton = ({ text, Icon, onPress }: { text: string, Icon: any, onPress: any }) => {
        return (
            <XStack width="100%" id={id} opacity={1} borderRadius="$5" padding="$3" alignSelf="flex-start" cursor="pointer" pressStyle={{ opacity: 0.7 }} hoverStyle={{ backgroundColor: "$color5" }}
                onPress={(e) => {
                    onPress(e)
                    setMenuOpened(false)
                }}
            >
                <Icon size="$1" color="var(--color9)" strokeWidth={2} />
                <Text marginLeft="$3">{text}</Text>
            </XStack>
        )
    }

    const menuShortcuts = [
        { id: 'config', text: 'Edit Settings', icon: Settings },
        { id: 'rules', text: 'Edit Rules', icon: ClipboardList },
        { id: 'params', text: 'Edit Inputs', icon: FileInput },
        { id: 'view', text: 'Edit UI', icon: FileCode }
    ].filter(menu => {
        if (data?.editorOptions?.hiddenTabs?.includes(menu.id)) return false;
        return true;
    })

    const isJSONView = states && typeof states !== 'string' && typeof states !== 'number' && typeof states !== 'boolean'
    const origin =
        typeof window !== 'undefined' ? window.location.origin : ''
    const boardName =
        typeof window !== 'undefined' ? (window as any)['protoBoardName'] : ''

    const normalizeUrl = (u?: string) => {
        if (!u) return undefined
        if (/^https?:\/\//i.test(u)) return u
        return `${origin}${u.startsWith('/') ? '' : '/'}${u}`
    }

    const makeReadUrl = () => {
        if (data?.enableCustomPath && data?.customPath) return normalizeUrl(data.customPath)
        return `${origin}/api/core/v1/boards/${boardName}/cards/${data?.name}`
    }

    const makeRunUrl = () => {
        if (data?.enableCustomRunPath && data?.customRunPath) return normalizeUrl(data.customRunPath)
        return `${origin}/api/core/v1/boards/${boardName}/cards/${data?.name}/run`
    }

    return <Tinted>
        <XStack paddingTop="$1" flex={1} paddingRight="$4" justifyContent="space-between" alignItems="center">
            <Popover key="card-states" onOpenChange={setCardStatesOpen} open={cardStatesOpen} allowFlip={true} stayInFrame={true} placement='bottom-start'>
                <Popover.Trigger>
                    <CardIcon className='no-drag' Icon={Book} onPress={(e) => { e.stopPropagation(); setCardStatesOpen(true) }} />
                </Popover.Trigger>
                {/* @ts-ignore */}
                <Popover.Content gap="$2" padding={0} ai="flex-start" minWidth="300px" maxWidth="400px" minHeight="100px" maxHeight="500px" overflow='auto' space={0} l="$2" p="$2" bw={1} boc="$gray6" bc={"$gray1"} >
                    <XStack justifyContent="center" alignItems="center" width="100%" gap="$2" flexWrap='wrap-reverse'>
                        <Text color="$gray10" textAlign="center">{data.name}</Text>
                        {data?.icon && <PublicIcon
                            name={data.icon}
                            color="var(--gray10)"
                            size={18}
                        />}
                    </XStack>
                    {data?.configParams && Object.keys(data.configParams).length > 0 && <YStack paddingLeft="$2" gap="$2">
                        <Text color="$color" fontSize="$3">Inputs</Text>
                        <XStack flexWrap="wrap" width="100%" gap="$2">
                            {Object.keys(data.configParams).map((param, index) => (
                                <TooltipSimple key={index} label={data.configParams[param]?.defaultValue || 'No default value'} delay={{ open: 200, close: 0 }} restMs={0}>
                                    <YStack cursor='help' hoverStyle={{ backgroundColor: "$gray5" }} paddingHorizontal="$3" paddingVertical="$1" borderRadius="$3" borderWidth={1} borderColor="$gray4" backgroundColor={"$gray3"}>
                                        <Text fontWeight="500">{param}</Text>
                                    </YStack>
                                </TooltipSimple>
                            ))}
                        </XStack>
                    </YStack>
                    }
                    <YStack padding="$2" gap="$2" width="100%" borderRadius="$2">
                        <Text color="$color" fontSize="$3">State</Text>
                        {isJSONView ? <JSONView src={states ?? {}} /> : <Text color={states ? "$color" : "$gray10"}>{states ?? "N/A"}</Text>}
                    </YStack>
                </Popover.Content>
            </Popover>

            <XStack className='no-drag'>
                {data?.sourceFile && <CardIcon Icon={Cable} onPress={onEditCode} />}
                <CardIcon Icon={Settings} onPress={() => onEdit(data?.editorOptions?.defaultTab ?? "params")} />

                <Popover key="card-menu" onOpenChange={setMenuOpened} open={menuOpened} allowFlip={true} stayInFrame={true} placement='bottom-end'>
                    <Popover.Trigger>
                        <CardIcon Icon={MoreVertical} onPress={(e) => { e.stopPropagation(); setMenuOpened(true) }} />
                    </Popover.Trigger>
                    <Popover.Content padding={0} space={0} left={"$7"} top={"$2"} borderWidth={1} borderColor="$gray6" backgroundColor={"$gray1"}>
                        <Tinted>
                            <YStack alignItems="center" justifyContent="center" padding={"$3"} paddingVertical={"$3"} onPress={(e) => e.stopPropagation()}>
                                <YStack>
                                    {
                                        menuShortcuts.map((menu, index) => (
                                            <MenuButton key={index} text={menu.text} Icon={menu.icon} onPress={() => onEdit(menu.id)} />
                                        ))
                                    }
                                    {data?.publicRead && (
                                        <MenuButton
                                            text="Visit public Read"
                                            Icon={Globe}
                                            onPress={() => window.open(makeReadUrl(), '_blank', 'noopener,noreferrer')}
                                        />
                                    )}
                                    {data?.publicRun && (
                                        <MenuButton
                                            text="Visit public Run"
                                            Icon={ExternalLink}
                                            onPress={() => window.open(makeRunUrl(), '_blank', 'noopener,noreferrer')}
                                        />
                                    )}

                                    <MenuButton text="Duplicate" Icon={Copy} onPress={() => onCopy()} />
                                    <MenuButton text="Api Details" Icon={FileJson} onPress={() => onDetails()} />
                                    <MenuButton text="Delete" Icon={Trash2} onPress={() => onDelete()} />
                                </YStack>
                            </YStack>
                        </Tinted>
                    </Popover.Content>
                </Popover>
            </XStack>
        </XStack>
    </Tinted>
}

export const ActionCard = ({
    board,
    id,
    displayResponse,
    html,
    value = undefined,
    name,
    title,
    params,
    icon = undefined,
    color = "var(--color7)",
    onRun = (name, params) => { },
    onEditCode = () => { },
    onDelete = () => { },
    onEdit = (tab) => { },
    onDetails = () => { },
    onCopy = () => { },
    data = {} as any,
    states = undefined,
    containerProps = {},
    setData = (data, id) => { }
}) => {
    const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle')
    const [hovered, setHovered] = useState(false)
    const lockRef = useRef(false)
    const hideTitle = data.displayTitle === false
    const highlighted = useIsHighlightedCard(board?.name, data?.name)
    const action = window["protoActions"]?.boards?.[board.name]?.[name]
    //console.log('highlightedCard: ', highlighted, board?.name + '/' + data?.name)
    const cardRef = useRef(null);

    const isAutoResponsive = data?.autoResponsive !== false;
    const isCardMinimized = isAutoResponsive && cardRef.current?.offsetHeight < 200;
    const valueString = (value === undefined || value == "") ? "N/A" : JSON.stringify(value);
    const POPOVER_MAX_HEIGHT = 500
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('bottom')

    useEffect(() => {
        if (!popoverOpen) return
        const updatePlacement = () => {
            if (!cardRef.current || typeof window === 'undefined') return
            const rect = (cardRef.current as any).getBoundingClientRect()
            const viewportH = window.innerHeight
            const spaceBelow = viewportH - rect.bottom
            const spaceAbove = rect.top
            // include a small margin so it doesn't feel cramped
            const needed = POPOVER_MAX_HEIGHT + 16
            // choose top if below is tight and above has more room
            const shouldTop = spaceBelow < needed && spaceAbove > spaceBelow
            setPopoverPlacement(shouldTop ? 'top' : 'bottom')
        }

        updatePlacement()
        window.addEventListener('resize', updatePlacement)
        window.addEventListener('scroll', updatePlacement, true) // capture scrolls in parents too
        return () => {
            window.removeEventListener('resize', updatePlacement)
            window.removeEventListener('scroll', updatePlacement, true)
        }
    }, [popoverOpen])

    useEventEffect((payload, msg) => {
        try {
            const parsedMessage = JSON.parse(msg.message)
            const payload = parsedMessage.payload
            //console.log('Message: ', payload)

            const next = payload.status
            if (next === 'running') {
                //console.log('Running action: ', name)
                lockRef.current = true
                setStatus('running')
                requestAnimationFrame(() => {
                    lockRef.current = false
                })
            } else {
                const apply = () => {
                    if (next === 'done') {
                        console.log('Done action: ', name)
                        setStatus('idle')
                    } else if (next === 'error' || next === 'code_error') {
                        console.log('Error action: ', name)
                        setStatus('error')
                        console.error('Error: ', payload.error)
                    }
                }

                if (lockRef.current) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(apply)
                    })
                } else {
                    apply()
                }
            }
        } catch (e) {
            console.error(e)
        }
    }, { path: "actions/boards/" + board.name + "/" + name + "/#" })

    useEffect(() => {
        if (!action || !action.status) return;
        setStatus(action.status);
    }, [action?.status]);

    const children = useMemo(() => (
        <ActionRunner
            setData={setData}
            id={id}
            data={data}
            displayResponse={displayResponse}
            name={name}
            description="Run action"
            actionParams={params}
            onRun={onRun}
            icon={icon}
            color={color}
            html={html}
            value={value}
        />
    ), [setData, id, data, displayResponse, name, params, onRun, icon, color, html, value])

    return (
        <CenterCard
            ref={cardRef}
            highlighted={highlighted}
            containerProps={{
                onHoverIn: () => setHovered(true),
                onHoverOut: () => setHovered(false),
                ...containerProps,
            }}
            status={status}
            hideFrame={data.displayFrame === false}
            id={id}
            header={
                <>
                    {
                        (title && !hideTitle) && (
                            <XStack
                                width="100%"
                                btrr={9}
                                btlr={9}
                                mt={"$3"}
                                h={20}
                                ai="center"
                                zIndex={1}
                            >
                                <Paragraph
                                    flex={1}
                                    fontWeight="500"
                                    textOverflow={"ellipsis"}
                                    textAlign="center"
                                    overflow="hidden"
                                    whiteSpace={"nowrap"}
                                    fontSize={"$4"}
                                >
                                    {title}
                                </Paragraph>
                            </XStack>
                        )
                    }
                    <XStack
                        width="100%"
                        marginTop={"$3"}
                        height={20}
                        alignItems="center"
                        position="absolute"
                        opacity={hovered ? 0.75 : 0}
                        zIndex={999}
                    >
                        <CardActions
                            id={id}
                            data={data}
                            states={states}
                            onDelete={onDelete}
                            onDetails={onDetails}
                            onEdit={onEdit}
                            onEditCode={onEditCode}
                            onCopy={onCopy}
                        />
                    </XStack>
                </>
            }
        >
            <Popover
                open={popoverOpen}
                onOpenChange={setPopoverOpen}
                placement={`${popoverPlacement}-start`}
                allowFlip={false}
                stayInFrame
            >
                <Popover.Trigger
                    cursor='pointer'
                    display={isCardMinimized ? 'flex' : 'none'}
                    className='no-drag'
                    flex={1}
                    width="100%"
                    padding="$3"
                    justifyContent="center"
                    alignItems="center"
                >
                    <XStack gap="$2" flex={1} width="100%" height="100%" alignItems="center" justifyContent={"center"}>
                        <TooltipSimple disabled={!value} label={valueString} delay={{ open: 1000, close: 0 }} restMs={0}>
                            <Text opacity={hovered ? 0.7 : 1} flex={1} fontSize={valueString.length < 10 ? "$8" : "$6"} textAlign={"center"} fontWeight={"600"} overflow='hidden' textOverflow='ellipsis' whiteSpace='nowrap'>
                                {valueString}
                            </Text>
                        </TooltipSimple>
                        {(data.type == "action" && hovered) && <Button
                            pressStyle={{ filter: "brightness(0.95)", backgroundColor: color }}
                            hoverStyle={{ backgroundColor: color, filter: "brightness(1.1)" }}
                            backgroundColor={color}
                            position='absolute'
                            right={"$1"}
                            bottom={"$1"}
                            size="$4"
                            borderRadius="$5"
                            aspectRatio={1}
                            padding="$1"
                            enterStyle={{ opacity: 0.4 }}
                            animation="bouncy"
                            scaleIcon={1.4}
                            icon={<PublicIcon name={icon ?? "play"} />}
                            onPress={e => {
                                e.stopPropagation();
                                executeAction(name, {})
                            }}
                        >
                        </Button>}
                    </XStack>
                </Popover.Trigger>
                <Popover.Content backgroundColor="$bgPanel" borderWidth={1} borderColor="$gray6" maxHeight={POPOVER_MAX_HEIGHT} minWidth={300} overflow='auto' alignItems='stretch'>
                    <div>
                        {children}
                    </div>
                </Popover.Content>
            </Popover>
            {!isCardMinimized && children}
        </CenterCard>
    )
}
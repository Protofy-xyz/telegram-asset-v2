import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Button, Input, XStack, Spinner, Dialog, Text, StackProps, YStack, ScrollView, TooltipSimple } from "@my/ui"
import { Folder, X as CloseIcon } from '@tamagui/lucide-icons'
import { Tinted, } from './Tinted'
import { Center } from './Center'
import dynamic from 'next/dynamic'

const FileBrowser = dynamic<any>(() =>
    import('../adminpanel/next/components/FileBrowser').then(module => module.FileBrowser),
    { ssr: false, loading: () => <Tinted><Center><Spinner size='small' color="$color7" scale={4} /></Center></Tinted> }
);

type FilePickerProps = {
    onFileChange?: (value: string | string[]) => void,
    file?: string | string[],
    placeholder?: string
    initialPath?: string
    fileFilter?: Function,
    disabled?: boolean
    onPressOpen?: Function
    allowMultiple?: boolean
}


const toArray = (value?: string | string[]) => {
    if (!value) return [] as string[];
    return Array.isArray(value) ? value : [value];
};

const toSingle = (value?: string | string[]) => {
    if (!value) return "";
    return Array.isArray(value) ? (value[0] ?? "") : value;
};

const parseTextToArray = (text: string) => {
    if (!text) return [] as string[];
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed.map((entry) => typeof entry === 'string' ? entry.trim() : '').filter(Boolean);
        }
    } catch { }
    return text
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
};

const normalizeArray = (value: string | string[]) => {
    const arr = toArray(value);
    return Array.from(new Set(arr.map((entry) => entry.trim()).filter(Boolean)));
};

const CardContainer = ({ children }: { children: ReactNode }) => (
    <XStack
        f={1}
        flexWrap="wrap"
        rowGap="$2"
        px="$2"
        columnGap="$2"
        borderRadius="$4"
        width="100%"
        borderWidth={0}
        ai="center"
    >
        {children}
    </XStack>
);

const FileChip = ({ path, onRemove }: { path: string; onRemove: () => void }) => {
    const segments = path.split('/').filter(Boolean)
    const fileName = segments[segments.length - 1] ?? path
    const location = segments.length > 1 ? `/${segments.slice(0, -1).join('/')}` : '/'

    return (
        <XStack
            alignItems="center"
            gap="$1"
            backgroundColor="$gray4"
            borderRadius="$4"
            paddingHorizontal="$2"
            maxWidth="100%"
            h={"$1.5"}
        >
            <YStack maxWidth={200} overflow="hidden">
                <Text fontSize={12} fontWeight="700" numberOfLines={1}>{path}</Text>
            </YStack>
            <Button
                size="$1"
                mr={-4}
                circular
                chromeless
                bc="transparent"
                pressStyle={{ bc: "tr" }}
                borderWidth={0}
                onPress={onRemove}
                icon={<CloseIcon size={12} color="var(--red8)" />}
                aria-label={`Remove ${fileName}`}
            />
        </XStack>
    )
};

export function FilePicker({ onFileChange, file, placeholder, initialPath = "", fileFilter, disabled, onPressOpen = () => { }, allowMultiple = false, ...props }: FilePickerProps & StackProps) {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState<string | string[]>(allowMultiple ? toArray(file) : toSingle(file))
    const [tmpFile, setTmpFile] = useState<string | string[]>(allowMultiple ? toArray(file) : toSingle(file))
    const [draftValue, setDraftValue] = useState<string>("")

    useEffect(() => {
        const nextValue = allowMultiple ? toArray(file) : toSingle(file)
        setValue(nextValue)
        setTmpFile(nextValue)
        setDraftValue("")
    }, [file, allowMultiple])


    const onChange = (val: string | string[]) => {
        setValue(val)
        setTmpFile(val)
        if (onFileChange) onFileChange(val)
    }

    const handleManualChange = (text: string) => {
        if (allowMultiple) {
            onChange(parseTextToArray(text))
        } else {
            onChange(text)
        }
    }

    const currentValue = file !== undefined ? (allowMultiple ? toArray(file) : toSingle(file)) : value
    const handleRemoveValue = useCallback((path: string) => {
        if (!allowMultiple) return
        const remaining = normalizeArray(currentValue).filter((entry) => entry !== path)
        onChange(remaining)
    }, [allowMultiple, currentValue, onChange])

    const commitDraft = useCallback(() => {
        if (!allowMultiple) return
        if (!draftValue.trim()) {
            setDraftValue("")
            return
        }
        const entries = normalizeArray([...normalizeArray(currentValue), ...parseTextToArray(draftValue)])
        setDraftValue("")
        onChange(entries)
    }, [allowMultiple, currentValue, draftValue, onChange])

    const handleDraftKeyPress = useCallback((event: any) => {
        if (!allowMultiple) return
        const key = event?.nativeEvent?.key ?? event?.key
        if (key === 'Enter' || key === ',' || key === 'Tab') {
            event.preventDefault?.()
            commitDraft()
        }
        if (key === 'Backspace' && draftValue === "") {
            const entries = normalizeArray(currentValue)
            if (entries.length) {
                handleRemoveValue(entries[entries.length - 1])
            }
        }
    }, [allowMultiple, draftValue, currentValue, commitDraft, handleRemoveValue])

    const multiValueChips = useMemo(() => {
        if (!allowMultiple) return null
        const entries = normalizeArray(currentValue)
        return entries.map((entry) => (
            <FileChip
                key={entry}
                path={entry}
                onRemove={() => handleRemoveValue(entry)}
            />
        ))
    }, [allowMultiple, currentValue, handleRemoveValue])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <XStack {...props} >
                {allowMultiple ? (
                    <YStack h="$4" f={1} bw={"1px"} boc="$gray7" br="$4" overflow="hidden" p="$1">
                        <ScrollView h f={1} boc="$red" bc="$gray1" horizontal={true} showsVerticalScrollIndicator={false}>
                            <CardContainer>
                                {multiValueChips}
                                <Input
                                    
                                    bw={0}
                                    unstyled
                                    f={1}
                                    placeholder={multiValueChips?.length ? "Add path" : placeholder ?? "Path or URL"}
                                    value={draftValue}
                                    onChangeText={setDraftValue}
                                    onKeyPress={handleDraftKeyPress}
                                    onBlur={commitDraft}
                                />
                            </CardContainer>
                        </ScrollView>
                    </YStack>
                ) : (
                    <Input
                        placeholder={placeholder ?? "Path or URL"}
                        value={Array.isArray(currentValue) ? toSingle(currentValue) : currentValue}
                        onChangeText={(e) => handleManualChange(e)}
                        f={1}
                        paddingRight={"50px"}
                        disabled={disabled}
                    >
                    </Input>
                )}
                <Dialog.Trigger >
                    <Button
                        h="$4"
                        position="absolute"
                        borderColor={"$color6"}
                        borderTopLeftRadius={"$0"}
                        borderBottomLeftRadius={"$0"}
                        disabled={disabled}
                        right={"$0"}
                        onPress={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onPressOpen()
                            setOpen(!open)
                        }}
                        icon={<Folder fillOpacity={0} color="gray" size={15} />}>
                    </Button>
                </Dialog.Trigger>
            </XStack>
            <Dialog.Portal>
                <Dialog.Content height={"80vh"} width={"80vw"} padding="$6" >
                    <Tinted>
                        <Text fontWeight="bold" fontSize={30} color={"$color8"}>File Browser</Text>
                        <Text marginBottom="$4">
                            Selected {allowMultiple ? 'files' : 'file'}:
                            {' '}
                            <Text color={"$color7"} fontStyle="italic">
                                {allowMultiple
                                    ? (Array.isArray(tmpFile) ? tmpFile.join(', ') || 'None' : toArray(tmpFile).join(', ') || 'None')
                                    : (Array.isArray(tmpFile) ? tmpFile[0] ?? '' : tmpFile)}
                            </Text>
                        </Text>
                    </Tinted>
                    <FileBrowser
                        initialPath={initialPath}
                        onOpenFile={(file) => {
                            setOpen(false)
                            if (allowMultiple) {
                                onChange(file?.path ? [file.path] : [])
                            } else {
                                onChange(file.path)
                            }
                        }}
                        onChangeSelection={(f) => {
                            if (allowMultiple) {
                                const selectedFiles = f.map((file) => file?.path).filter(Boolean)
                                setTmpFile(selectedFiles)
                            } else {
                                const pathFile = f[0]?.path
                                if (pathFile) {
                                    setTmpFile(pathFile)
                                }
                            }
                        }}
                        fileFilter={fileFilter}
                        selection={allowMultiple ? (Array.isArray(tmpFile) ? tmpFile[0] : toArray(tmpFile)[0]) : tmpFile}
                    />
                    <XStack gap="$4" justifyContent="center" alignSelf="center" width={"100%"} maxWidth={"500px"}>
                        <Tinted>
                            <Button
                                f={1}
                                onPress={() => setOpen(false)}
                                backgroundColor={"transparent"}
                                borderWidth={2}
                                borderColor="$color6"
                                hoverStyle={{
                                    backgroundColor: "$color2",
                                    borderColor: "$color6",
                                    borderWidth: 2
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                f={1}
                                onPress={() => {
                                    setOpen(false)
                                    onChange(tmpFile)
                                }}>
                                Accept
                            </Button>
                        </Tinted>
                    </XStack>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog>
    )
}
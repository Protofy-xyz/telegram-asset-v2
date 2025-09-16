import { useState, useEffect, useCallback } from "react";
import { XStack, YStack, Text, Switch, Input, TextArea, Button } from "@my/ui";
import { useThemeSetting } from '@tamagui/next-theme'
import { Monaco } from "../Monaco";
import { Tinted } from "../Tinted";
import { TextEditDialog } from "../TextEditDialog";
import { FilePicker } from "../FilePicker";
import { SelectList } from "../SelectList";

export const Icon = ({ name, size, color, style }) => {
    return (
        <div
            style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: `${color}`,
                maskImage: `url(/public/icons/${name}.svg)`,
                WebkitMaskImage: `url(/public/icons/${name}.svg)`,
                maskRepeat: `no-repeat`,
                WebkitMaskRepeat: `no-repeat`,
                maskSize: `contain`,
                WebkitMaskSize: `contain`,
                maskPosition: `center`,
                WebkitMaskPosition: `center`,
                ...style,
            }}
        />
    );
};

export const ParamsForm = ({ data, children }) => {
    const allKeys = Object.keys(data.params || {});
    const [loading, setLoading] = useState(false);
    const [boardStates, setBoardStates] = useState<string[]>([]);
    const { resolvedTheme } = useThemeSetting()
    const [paramsState, setParamsState] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {};
        for (const key of Object.keys(data.params || {})) {
            const defaultValue = data.configParams?.[key]?.defaultValue;
            if (defaultValue !== undefined) initial[key] = defaultValue;
        }
        return initial;
    });
    const setParam = useCallback((key: string, val: any) => {
        setParamsState(prev => ({ ...prev, [key]: val }));
    }, []);

    const stateOptions = boardStates.filter(s => s !== data.name).map(s => `board.${s}`);
    const isButtonFull = data.buttonMode === "full"

    useEffect(() => {
        if (typeof window === "undefined") return;

        const getBoardStates = () => {
            const proto = (window as any).protoStates;
            const boards = proto?.boards || {};

            const params = new URLSearchParams(window.location.search);
            const boardParam = params.get("board");
            const boardName = boardParam ? decodeURIComponent(boardParam) : undefined;

            if (!boardName || !boards[boardName]) {
                setBoardStates([]);
                return;
            }

            setBoardStates(Object.keys(boards[boardName]));
        };

        getBoardStates();
        window.addEventListener("protoStates:update", () => getBoardStates());
        return () => window.removeEventListener("protoStates:update", () => getBoardStates());
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const cleanedParams = {};
            for (const key of allKeys) {
                const param = data.configParams?.[key] || {};
                const defaultValue = param.defaultValue;
                const state = paramsState[key];
                if (state !== undefined && state !== "") {
                    cleanedParams[key] = state;
                } else if (defaultValue !== undefined && defaultValue !== "") {
                    cleanedParams[key] = defaultValue;
                }
            }
            await window['executeAction'](data.name, cleanedParams);
        } finally {
            setLoading(false);
        }
    };

    return (
            <YStack w={"100%"} ai="center" jc="center" f={1}>
            {children}
            <YStack w={"100%"} ai="center" jc="center" mt={data.buttonMode !== "full" ? "$5" : 0}>
                {allKeys.map((key) => {
                    const cfg = data.configParams?.[key] || {};
                    const { visible = true, defaultValue = "", type = 'string' } = cfg;
                    const value = paramsState[key] ?? defaultValue ?? "";
                    const placeholder = data.params[key] ?? "";

                    if (!visible) {
                        return (
                            <input
                                key={key}
                                type="hidden"
                                name={key}
                                defaultValue={defaultValue}
                            />
                        );
                    }

                    return (
                        <YStack
                            key={key}
                            style={{
                                display: "flex",
                                width: "100%",
                                marginBottom: "10px",
                                boxSizing: "border-box",
                                flexDirection: "column",
                            }}
                        >
                            <Text ml="20px" mb="$2">{key}</Text>
                            {(type == 'text' || !['json', 'array', 'boolean', 'path', 'state'].includes(type)) &&
                                <TextEditDialog f={1}>
                                    {type == 'text'
                                        ? <TextArea
                                            className="no-drag"
                                            f={1}
                                            mx="10px"
                                            focusStyle={{ outlineWidth: "1px" }}
                                            value={value}
                                            onChangeText={(val) => setParam(key, val)}
                                            placeholder={placeholder}
                                            rows={6}
                                        />
                                        : <Input
                                            className="no-drag"
                                            value={value}
                                            placeholder={placeholder}
                                            minWidth={100}
                                            mx="10px"
                                            onChangeText={(val) => setParam(key, val)}
                                        />
                                    }
                                    <TextEditDialog.Trigger bc="$backgroundColor" pos="absolute" right={"$2"} m="$3" bottom={0}>
                                        <Icon name="square-arrow-out-up-right" size={20} color={"var(--gray8)"} style={{}} />
                                    </TextEditDialog.Trigger>
                                    <TextEditDialog.Editor
                                        placeholder={key}
                                        value={value}
                                        readValue={() => paramsState[key] ?? ""}
                                        onChange={(val) => setParam(key, val ?? "")}
                                    />
                                </TextEditDialog>
                            }
                            {type == 'state' && (
                                <XStack mx={"$3"} f={1}>
                                    <SelectList
                                        title="Select state"
                                        elements={(stateOptions && stateOptions?.length > 0) ? stateOptions : []}
                                        value={value}
                                        setValue={(v) => setParam(key, v)}
                                        triggerProps={{ f: 1, bc: "$gray1", boc: "$gray6", hoverStyle: { bc: "$gray1", boc: "$gray7" } }}
                                        placeholder="Select state"

                                    />
                                </XStack>
                            )}

                            {(type == 'json' || type == 'array')
                                && <XStack
                                    p="$3"
                                    bc="$gray1"
                                    borderColor="$gray8"
                                    bw={1}
                                    br="$4"
                                    overflow="hidden"
                                    mx="10px"
                                    f={1}
                                    height={200}
                                >
                                    <Monaco
                                        language='json'
                                        darkMode={resolvedTheme === 'dark'}
                                        sourceCode={value}
                                        onChange={(code) => setParam(key, code)}
                                        options={{
                                            formatOnPaste: true,
                                            formatOnType: true,
                                            minimap: { enabled: false },
                                            lineNumbers: "off"
                                        }}
                                    />
                                </XStack>}

                            {type == 'boolean' && <Tinted><Switch
                                ml="12px"
                                id="autopilot-switch"
                                size="$4"
                                checked={(value ?? "") === "true"}
                                onCheckedChange={(checked) => {
                                    setParam(key, checked ? "true" : "false");
                                }}
                                className="no-drag" // Hace que el switch no sea draggable
                            >
                                <Switch.Thumb className="no-drag" animation="quick" />
                            </Switch></Tinted>}



                            {type == 'path'
                                && <FilePicker
                                    mx="10px"
                                    initialPath={"/data/public"}
                                    onFileChange={filePath => {
                                        setParam(key, filePath);
                                    }}
                                />
                            }
                        </YStack>
                    );
                })}
            </YStack>

            {data.type === "action" && (
                <YStack w={"100%"} {...(data.buttonMode === "full" ? { f: 1 } : {})} ai="center" jc="center" padding={data.buttonMode !== "full" ? "10px" : "0"}>
                    <Button
                        id={`${data.name}-run-button`}
                        className="no-drag"
                        onPress={handleSubmit}
                        h={isButtonFull && "100%"}
                        mx={isButtonFull ? 0 : "10px"}
                        w={"100%"}
                        maw={"100%"}
                        f={isButtonFull && 1}
                        mt={isButtonFull ? 0 : "$5"}
                        p={"10px"}
                        textAlign="center"
                        bc={data.color}
                        onHoverIn={(e) => e.currentTarget.style.filter = "brightness(1.05)"}
                        onHoverOut={(e) => e.currentTarget.style.filter = "none"}
                        pressStyle={{ bc: data.color, filter: "brightness(0.85)" }}
                        color={data.color}
                        textProps={{ fow: "400", filter: "brightness(0.5)", fos: "$5" }}
                        icon={(props) =>
                            data.icon && (data.displayButtonIcon || data.buttonMode === 'full')
                            && <Icon
                                {...props}
                                style={{ filter: "brightness(0.5)" }}
                                name={data.icon}
                                size={data.buttonMode === 'full' ? 48 : 24}
                            />
                        }
                    >
                        {loading ? "..." : (data.buttonLabel || "Run")}
                    </Button>
                </YStack>

            )}
        </YStack>
    )
};

export const ActionCard = ({ data, children }) => {
    return (
        <YStack height="100%" justifyContent="center" alignItems="center" className="no-drag">
            {children}
        </YStack>
    );
};
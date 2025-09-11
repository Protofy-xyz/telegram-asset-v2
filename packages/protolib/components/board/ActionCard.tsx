import { useRef, useState } from "react";
import { XStack, YStack, Text, Switch, Input, TextArea } from "@my/ui";
import { useThemeSetting } from '@tamagui/next-theme'
import { Monaco } from "../Monaco";
import { Tinted } from "../Tinted";
import { TextEditDialog } from "../TextEditDialog";
import { FilePicker } from "../FilePicker";

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

    const { resolvedTheme } = useThemeSetting()
    const contentRef = useRef({});
    const defaultRef = useRef({});
    const inputRefs = useRef({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.target);
            const params = Object.fromEntries(formData['entries']());
            const defaults = defaultRef.current || {};
            const cleanedParams = contentRef.current || {};

                for (const key in params) {
                if (params[key] || params[key] === "0") {
                    cleanedParams[key] = params[key];
                }
            }
            
            for (const key in defaults) {
                if ((cleanedParams[key] === undefined || cleanedParams[key] === "") && (defaults[key] || defaults[key] === "0")) {
                    cleanedParams[key] = defaults[key];
                }
            }

            await window['executeAction'](data.name, cleanedParams);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column"
            }}
        >
            <YStack w={"100%"} ai="center" jc="center" f={1}>

                {children}
                <YStack w={"100%"} ai="center" jc="center" mt={data.buttonMode !== "full" ? "$5" : 0}>
                    {allKeys.map((key) => {
                        const cfg = data.configParams?.[key] || {};
                        const { visible = true, defaultValue = "", type = 'string' } = cfg;
                        // Ensure params with default values are available on content Ref
                        if (contentRef.current[key] === undefined && defaultValue !== "") {
                            contentRef.current[key] = defaultValue;
                        }
                        if (defaultRef.current[key] === undefined || defaultRef.current[key] != defaultValue) {
                            defaultRef.current[key] = defaultValue;
                        }
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
                                {(type == 'text' || !['json', 'array', 'boolean', 'path'].includes(type)) &&
                                    <TextEditDialog mx="10px" f={1}>
                                        {type == 'text'
                                            ? <TextArea
                                                className="no-drag"
                                                name={key}
                                                f={1}
                                                focusStyle={{ outlineWidth: "1px" }}
                                                ref={(el) => inputRefs.current[key] = el}
                                                defaultValue={contentRef.current[key]}
                                                onChangeText={(val) => {
                                                    contentRef.current[key] = val;
                                                }}
                                                placeholder={placeholder}
                                                rows={6}
                                            />
                                            : <Input
                                                className="no-drag"
                                                name={key}
                                                defaultValue={defaultValue}
                                                placeholder={placeholder}
                                                minWidth={100}
                                                onChangeText={(val) => {
                                                    contentRef.current[key] = val;
                                                }}
                                                ref={(el) => inputRefs.current[key] = el}
                                            />
                                        }
                                        <TextEditDialog.Trigger bc="$backgroundColor" pos="absolute" right={0} m="$3" bottom={0}>
                                            <Icon name="square-arrow-out-up-right" size={20} color={"var(--gray8)"} style={{}} />
                                        </TextEditDialog.Trigger>
                                        <TextEditDialog.Editor
                                            placeholder={key}
                                            value={contentRef.current[key] ?? ""}
                                            readValue={() => contentRef.current[key] ?? ""}
                                            onChange={(val) => {
                                                contentRef.current[key] = val ?? "";
                                                const el = inputRefs.current[key];
                                                if (el) el.value = val ?? "";
                                            }}
                                        />
                                    </TextEditDialog>
                                }

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
                                            sourceCode={defaultValue}
                                            onChange={(code) => contentRef.current[key] = code}
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
                                    defaultChecked={contentRef.current[key] ? contentRef.current[key] === "true" : defaultValue === "true"}
                                    onCheckedChange={(value) => {
                                        contentRef.current[key] = value ? "true" : "false";
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
                                            contentRef.current[key] = filePath;
                                        }}
                                    />
                                }
                            </YStack>
                        );
                    })}
                </YStack>


                {data.type === "action" && (
                    <YStack w={"100%"} {...(data.buttonMode === "full" ? { f: 1 } : {})} ai="center" jc="center" padding={data.buttonMode !== "full" ? "10px" : "0"}>
                        <button
                            id={`${data.name}-run-button`}
                            className="no-drag"
                            type="submit"
                            style={{
                                ...(data.buttonMode === "full" ? { height: "100%", } : {}),
                                ...(data.buttonMode !== "full" ? { marginLeft: "10px" } : {}),
                                ...(data.buttonMode !== "full" ? { marginRight: "10px" } : {}),
                                width: "100%",
                                maxWidth: "100%",
                                ...(data.buttonMode === "full" ? { flex: 1 } : {}),
                                ...(data.buttonMode !== "full" ? { marginTop: "5px" } : {}),
                                display: "flex",
                                padding: "10px",
                                textAlign: "center",
                                backgroundColor: data.color,
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "filter 0.2s ease-in-out",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.filter = "brightness(1.05)")}
                            onMouseOut={(e) => (e.currentTarget.style.filter = "none")}
                            onMouseDown={(e) =>
                            (e.currentTarget.style.filter =
                                "saturate(1.2) contrast(1.2) brightness(0.85)")
                            }
                            onMouseUp={(e) => (e.currentTarget.style.filter = "brightness(1.05)")}
                        >
                            <span
                                style={{
                                    color: data.color,
                                    filter: "brightness(0.5)",
                                    fontWeight: 400,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                }}
                            >
                                {data.icon && (data.displayButtonIcon || data.buttonMode === 'full') ? (
                                    <Icon
                                        name={data.icon}
                                        size={data.buttonMode === 'full' ? 48 : 24}
                                        color={data.color}
                                        style={{ marginLeft: "5px" }}
                                    />
                                ) : <></>}
                                {loading ? "..." : data.buttonLabel || "Run"}
                            </span>
                        </button>
                    </YStack>

                )}
            </YStack>
        </form>
    );
};

export const ActionCard = ({ data, children }) => {
    return (
        <YStack height="100%" justifyContent="center" alignItems="center" className="no-drag">
            {children}
        </YStack>
    );
};
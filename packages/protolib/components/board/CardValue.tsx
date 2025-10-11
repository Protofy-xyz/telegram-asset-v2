import { ScrollView, XStack } from "tamagui";
import { JSONView } from "../JSONView";
import { Markdown } from "../Markdown";
import { useEffect, useState } from "react";
import { Html } from "../Html";

type CardValueProps = {
    value: any,
    style?: React.CSSProperties,
    id?: string,
    mode?: 'markdown' | 'html' | undefined,
    readOnly?: boolean,
    executeActionOnEdit?: (val: string) => void
}

export const CardValue = ({ value, style = {}, id = undefined, mode = undefined, readOnly = true, executeActionOnEdit = (val) => { } }: CardValueProps) => {
    let fullHeight = false;
    const [data, setData] = useState(typeof value === 'string' ? value : String(value));

    useEffect(() => {
        if (["markdown", "html"].includes(mode)) {
            setData(value);
        }
    }, [value, mode]);

    if (mode === 'markdown') {
        return <Markdown mih="160px" width={"100%"} readOnly={readOnly} data={data} setData={(val) => { setData(val); if (executeActionOnEdit) { executeActionOnEdit(val) } }} />
    }

    if (mode === "html") {
        return <Html mih="160px" width={"100%"} readOnly={readOnly}
            data={data}
            setData={(val) => {
                setData(val);
                if (executeActionOnEdit) executeActionOnEdit(val);
            }} />
    }

    //check if value is string, number or boolean
    if (!['string', 'number', 'boolean'].includes(typeof value)) {
        return <ScrollView mt="20px" mb={"10px"} width="calc(100% - 20px)" f={1} bg="$bgContent" borderRadius="$3">
            <JSONView src={value} />
        </ScrollView>
    }
    value = typeof value === 'string' ? value : String(value)
    if (typeof value === 'string' && value.length > 20 || value.includes("\n")) {
        return <XStack mt="20px" mb="10px" width="calc(100% - 20px)" f={1}><textarea
            className="no-drag"
            style={{
                color: "var(--color9)",
                backgroundColor: "var(--bgContent)",
                flex: 1,
                padding: "5px 10px",
                border: "0.5px solid var(--gray7)",
                borderRadius: "8px",
                boxSizing: "border-box",
                resize: "none" // o "none" si no quieres que pueda cambiar el tamaño
            }}
            value={value}
            readOnly
        /></XStack>
    }
    return <div id={id} style={{
        height: fullHeight ? '100%' : 'auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '30px',
        fontWeight: 'bold',
        marginTop: '15px',
        whiteSpace: 'pre-wrap',
        ...style
    }}>{value}</div>
}
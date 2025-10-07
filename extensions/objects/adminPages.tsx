
import { useEffect, useMemo, useRef, useState } from 'react'
import { ObjectModel, ObjectSchema } from './objectsSchemas'
import { DataView } from 'protolib/components/DataView';
import { DataTable2 } from 'protolib/components/DataTable2';
import { Chip } from 'protolib/components/Chip';
import { AdminPage } from 'protolib/components/AdminPage';
import { Monaco } from 'protolib/components/Monaco';
import { RecordComp } from 'protolib/components/EditableObject/RecordComponent';
import { Pencil, Code, List, LayoutList } from '@tamagui/lucide-icons';
import { usePageParams } from 'protolib/next';
import { XStack, Text, YStack, ToggleGroup, Label, Paragraph, Spinner } from "@my/ui";
import { API, z } from 'protobase'
import ErrorMessage from "protolib/components/ErrorMessage"
import { PaginatedData } from "protolib/lib/SSR"
import { ProtoModel } from 'protobase'
import { useRouter } from 'next/router'
import { AsyncView } from 'protolib/components/AsyncView';
import { ObjectViewLoader } from 'protolib/components/ObjectViewLoader';
import { Tinted } from 'protolib/components/Tinted';

const format = 'YYYY-MM-DD HH:mm:ss'
const ObjectIcons = {}
const rowsPerPage = 20

const sourceUrl = '/api/core/v1/objects'

export const hasHTMLCompiler = process.env.NODE_ENV !== "production";

const ObjectView = ({ workspace, pageState, initialItems, itemData, pageSession, extraData, object }: any) => {
    const objExists = object ? true : false
    let objModel = null
    let apiUrl = null
    if (objExists) {
        objModel = ProtoModel.getClassFromDefinition(object)
        const { name, prefix } = objModel.getApiOptions()
        console.log("Object API options", { name, prefix })
        apiUrl = prefix + name
    }

    const fields = objModel?.getObjectFields()
    let reducedView = false
    if(!fields || fields.length === 0 || (fields.length === 1 && fields[0] == "id")) {
        reducedView = true
    }
    // const {name, prefix} = Objects.inventory.getApiOptions()
    // const apiUrl = prefix + name
    return (<AdminPage title={"Object " + object?.name} workspace={workspace} pageSession={pageSession}>
        {!objExists ? <ErrorMessage msg="Object not found" /> : null}
        {objExists ? <DataView
            disableViews={reducedView ? ["grid", "list"]:[]}
            sourceUrl={apiUrl}
            initialItems={initialItems}
            numColumnsForm={1}
            name={object?.name}
            model={objModel}
            pageState={pageState}
            hideFilters={false}
        /> : null}
    </AdminPage>)
}

const getKeysSource = (data: any, keys: any) => {
    const name = data?.name ?? 'Object';
    const payload = {
        id: data?.id ?? `${name.replace(/\s/g, '')}Model`,
        name,
        features: data?.features ?? {},
        keys: keys ?? {}
    };

    try {
        return ObjectModel.load(payload).getSourceCode();
    } catch (err) {
        return '{}'
    }
};

type KeysSchemaFieldProps = { path: string[], value: any, setValue: (value: any) => void, mode: string, formData: any }

const KeysEditor = ({ path, value, setValue, mode, formData }: KeysSchemaFieldProps) => {
    const dataObject = formData ?? {};
    const [code, setCode] = useState(() => getKeysSource(dataObject, value));
    const [loading, setLoading] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const dataRef = useRef<any>({ ...dataObject, keys: value ?? {} });
    const readOnly = mode === 'view' || mode === 'preview';
    const [codeView, setCodeView] = useState(false);
    const lastValueStringRef = useRef<string>(JSON.stringify(value ?? {}));
    const recordElement = useMemo(() => ({ name: 'keys', _def: (ObjectSchema.shape as any).keys._def }), []);
    const recordData = dataRef.current.keys ?? {};

    const applyCodeToForm = async () => {
        if (readOnly) return;
        setLoading(true);
        const parsedCode = code?.trim();
        if (!parsedCode) {
            setParseError(null);
            dataRef.current = { ...dataObject, keys: {} };
            setValue({});
            setLoading(false);
            return;
        }
        const { isError, data } = await API.post('/api/core/v1/objects/parseKeys', { code: parsedCode, name: dataObject?.name ?? 'Temp' });
        if (isError) setParseError('Could not parse the schema.');
        else {
            setParseError(null);
            dataRef.current = { ...dataObject, keys: data?.keys ?? {} };
            setValue(data?.keys ?? {});
        }
        setLoading(false);
    };

    const handleSetData = (updated: any) => {
        const nextData = updated?.data ?? {};
        dataRef.current = nextData;
        const nextKeys = nextData.keys ? { ...nextData.keys } : {};
        setValue(nextKeys);
    };

    const handleSetFormData = (_: any, nextKeys: any) => {
        const normalized = nextKeys ? { ...nextKeys } : {};
        dataRef.current = { ...dataRef.current, keys: normalized };
        setValue(normalized);
    };

    useEffect(() => {
        if (!codeView) {
            const nextString = JSON.stringify(value ?? {});
            if (nextString !== lastValueStringRef.current) {
                lastValueStringRef.current = nextString;
                const nextCode = getKeysSource(dataObject, value);
                setCode(nextCode);
            }
        }
    }, [value, codeView]);

    return (
        <YStack flex={1} gap="$2">
            <ToggleGroup pos="absolute" right={0} top="$1" zIndex={9999} size="$3" type="single"
                value={codeView ? "code" : "form"}
                onValueChange={async (val) => {
                    if (val === "form") await applyCodeToForm()
                    setCodeView(val === "code")
                }}>
                <ToggleGroup.Item value="form" aria-label="Form View" > <LayoutList /> </ToggleGroup.Item>
                <ToggleGroup.Item value="code" aria-label="Code View" > <Code /></ToggleGroup.Item>
            </ToggleGroup>
            <YStack minHeight="220px" gap="$2" display={(codeView && !loading) ? 'flex' : 'none'}>
                <Tinted>
                    <Label fontWeight="bold">
                        <List mr="$2" color="var(--color9)" size="$1" strokeWidth={1} />
                        keys
                        <Paragraph ml="$1" color="$color8">*</Paragraph>
                    </Label>
                </Tinted>
                <Monaco
                    language='typescript'
                    sourceCode={code}
                    onChange={setCode}
                    onSave={applyCodeToForm}
                    options={{
                        minimap: { enabled: false },
                        formatOnPaste: true,
                        readOnly: readOnly
                    }}
                />
                {parseError ? <Text color="$red9" fontSize="$3">{parseError}</Text> : null}
            </YStack>
            <YStack minHeight="220px" gap="$2" display={(!codeView && !loading) ? 'flex' : 'none'}>
                <RecordComp
                    ele={recordElement}
                    elementDef={recordElement._def}
                    icon={List}
                    path={path}
                    data={dataRef.current}
                    setData={handleSetData}
                    mode={mode}
                    customFields={{}}
                    inArray={false}
                    recordData={recordData}
                    setFormData={handleSetFormData}
                    URLTransform={(url) => url}
                />
            </YStack>
            <YStack alignItems="center" jc="center" display={loading ? 'flex' : 'none'} minHeight="220px">
                <Tinted><Spinner size='large' color="$color8" alignSelf="center" /></Tinted>
            </YStack>
        </YStack>
    );
};

export default {
    'objects': {
        component: ({ pageState, initialItems, pageSession }: any) => {
            const { replace } = usePageParams(pageState)
            return (<AdminPage title="Objects" pageSession={pageSession}>
                <DataView
                    sourceUrl={sourceUrl}
                    initialItems={initialItems}
                    numColumnsForm={2}
                    name="storage"
                    entityName='Storages'
                    columns={DataTable2.columns(
                        DataTable2.column("name", row => row.name, "name", row => <XStack id={"objects-datatable-" + row.name}><Text>{row.name}</Text></XStack>),
                        DataTable2.column("features", row => row.features, "features", row => Object.keys(row.features).map(f => <Chip mr={"$2"} text={f} color={'$gray5'} />)),
                    )}
                    extraFieldsFormsAdd={{
                        databaseType: z.union([z.literal("Default Provider"), z.literal("Google Sheets"), z.literal("JSON File")])
                            .after("keys")
                            .label("database type")
                            .defaultValue("Default Provider"),
                        param: z.string()
                            .after("keys")
                            .label("Google Sheet Link")
                            .hint("https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/edit?usp=sharing")
                            .visible((displayType, object) => object?.data?.databaseType === "Google Sheets"),
                        adminPage: z.boolean()
                            .after("keys")
                            .label("customizable admin page")
                            .defaultValue(false)
                            .visible((displayType, object) => hasHTMLCompiler),
                    }}
                    // hideAdd={true}
                    model={ObjectModel}
                    pageState={pageState}
                    icons={ObjectIcons}
                    customFieldsForms={{
                        keys: {
                            hideLabel: true,
                            component: (path, currentValue, setCurrentValue, mode, formData) => (
                                <KeysEditor
                                    path={path}
                                    value={currentValue}
                                    setValue={setCurrentValue}
                                    mode={mode}
                                    formData={formData}
                                />
                            )
                        }
                    }}
                    extraMenuActions={[
                        {
                            text: "Edit Object file",
                            icon: Pencil,
                            action: (element) => { replace('editFile', element.getDefaultSchemaFilePath()) },
                            isVisible: (data) => true
                        }
                    ]}
                />
            </AdminPage>)
        },
        getServerSideProps: PaginatedData(sourceUrl, ['admin'])
    },
    view: {
        component: (props: any) => {
            const router = useRouter()
            const { object } = router.query
            if (!object) return <></>
            return <AsyncView ready={router.isReady}>
                <ObjectViewLoader key={object} {...props} object={object} widget={ObjectView}/>
            </AsyncView>
        }
    }
}
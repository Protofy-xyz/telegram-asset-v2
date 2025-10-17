
import { API } from 'protobase'
import { YStack, XStack, useToastController, useTheme } from '@my/ui'
import { Tinted } from '../../components/Tinted'
import { useState, useRef, useMemo } from 'react'
import { useSettingValue } from "@extensions/settings/hooks";
import { getDefinition, toSourceFile } from 'protonode/dist/lib/code'
import { ArrowFunction } from 'ts-morph';
import { CodeView } from '@extensions/files/intents';
import { Save } from '@tamagui/lucide-icons'
import { useKeyState } from '../KeySetter'
import { RulesKeySetter } from './RulesKeySetter'
import { Panel, PanelGroup } from "react-resizable-panels";
import CustomPanelResizeHandle from "../MainPanel/CustomPanelResizeHandle";
import { ActionsAndStatesPanel } from './ActionsAndStatesPanel';


function generateStateDeclarations(obj) {
    const recurse = (o) => {
        return (
            '{\n' +
            Object.entries(o ?? {})
                .map(([key, val]) => {
                    if (typeof val === 'object' && val !== null) {
                        return `  ${key}: ${recurse(val)};`;
                    } else {
                        return `  ${key}: any;`;
                    }
                })
                .join('\n') +
            '\n}'
        );
    };

    return `declare const states: ${recurse(obj)};`;
}


export const RulesSideMenu = ({ leftIcons = <></>, icons = <></>, automationInfo, boardRef, board, actions, states, resolvedTheme }) => {
    const boardStates = states?.boards ? states.boards[board.name] : {}
    const boardActions = actions?.boards ? actions.boards[board.name] : {}
    const [rulesMode, setRulesMode] = useState(null)

    const boardStatesDeclarations = useMemo(() => {
        return generateStateDeclarations(boardStates)
    }, [boardStates]);

    //console.log("Board States Declarations:", boardStatesDeclarations);
    //console.log("Board Actions:", boardActions);

    const boardDeclaration = useMemo(() => {
        const possibleNames = Object.keys(boardActions ?? {}).map(name => `"${name}"`).join(' | ')
        return `declare const board: {\n` +
            `  onChange: (params: { name: string, changed: (value: any) => void, inmediate?: boolean }) => void;\n` +
            `  execute_action: (params: { name: ${possibleNames}, params?: Record<string, any> }) => Promise<any>;\n` +
            `  id: string;\n` +
            `  log: (...args: any[]) => void;\n` +
            `};` +
            '\n};';
    }, [board.name]);

    const code = useMemo(() => {
        const sourceFile = toSourceFile(automationInfo.code)
        const definition = getDefinition(sourceFile, '"code"')
        if (definition && ArrowFunction.isArrowFunction(definition)) {
            return definition.getBodyText()
        }
        return ''
    }, [automationInfo.code]);


    const savedCode = useRef(code)
    const editedCode = useRef(code)
    const [generatingBoardCode, setGeneratingBoardCode] = useState(false)
    const toast = useToastController()
    const isAIEnabled = useSettingValue('ai.enabled', false);
    const { hasKey, updateKey, loading } = useKeyState('OPENAI_API_KEY')

    const theme = useTheme()
    const flows = useMemo(() => {
        return <CodeView
            rulesProps={{ title: "Board Rules" }}
            onModeChange={(currMode) => setRulesMode(currMode)}
            onApplyRules={async (rules) => {
                try {
                    boardRef.current.rules = rules
                    const rulesCode = await API.post(`/api/core/v1/autopilot/getBoardCode`, { rules: rules, previousRules: boardRef.current.rules, states: boardStates, actions: actions.boards ? actions.boards[board.name] : {} })
                    if (rulesCode.error || !rulesCode.data?.jsCode) {
                        toast.show(`Error generating board code: ${rulesCode.error.message}`)
                        return
                    }

                    savedCode.current = rulesCode.data.jsCode
                    editedCode.current = rulesCode.data.jsCode
                    await API.post(`/api/core/v1/boards/${board.name}`, boardRef.current)

                    // save generated code on apply rules
                    const sourceFile = toSourceFile(automationInfo.code)
                    const definition = getDefinition(sourceFile, '"code"').getBody()
                    definition.replaceWithText("{\n" + editedCode.current + "\n}");
                    await API.post(`/api/core/v1/boards/${board.name}/automation`, { code: sourceFile.getFullText() })

                    automationInfo.code = sourceFile.getFullText()

                    toast.show(`Rules applied successfully!`)
                } catch (e) {
                    toast.show(`Error generating board code: ${e.message}`)
                    console.error(e)
                }
            }}
            disableAIPanels={!isAIEnabled}
            defaultMode={isAIEnabled ? 'rules' : 'code'}
            rules={board.rules}
            rulesConfig={{
                enabled: hasKey,
                disabledView: () => <RulesKeySetter updateKey={updateKey} loading={loading} />
            }}
            leftIcons={
                <XStack gap="$3" pl="$2">
                    {leftIcons}
                </XStack>
            }
            icons={<XStack gap="$3">
                {/* <XStack cursor='pointer' onPress={async () => {
                   
                }} o={0.7} pressStyle={{ opacity: 0.7 }} hoverStyle={{ opacity: 1 }}>
                    <Sparkles size="$1" color="var(--color)" />
                </XStack> */}
                {icons}
                <XStack p="$2" pr="$3" cursor='pointer' onPress={async () => {
                    const sourceFile = toSourceFile(automationInfo.code)
                    const definition = getDefinition(sourceFile, '"code"').getBody()
                    definition.replaceWithText("{\n" + editedCode.current + "\n}");
                    await API.post(`/api/core/v1/boards/${board.name}/automation`, { code: sourceFile.getFullText() })
                    toast.show('Automation saved')
                }} o={0.8} pressStyle={{ opacity: 0.8 }} ml="$5" hoverStyle={{ opacity: 1 }}>
                    <Save size="$1" color="var(--color)" />
                </XStack>
            </XStack>}
            viewPort={{ x: 20, y: window.innerHeight / 8, zoom: 0.8 }}
            onFlowChange={(code) => {
                // editedCode.current = code
            }}
            onCodeChange={(code) => {
                // editedCode.current = code
            }}
            path={board.name + '.ts'}
            sourceCode={editedCode}
            monacoOnMount={(editor, monaco) => {
                monaco.languages.typescript.typescriptDefaults.addExtraLib(
                    boardDeclaration + "\n" +
                    boardStatesDeclarations,
                    'ts:filename/customTypes.d.ts'
                );
            }}
            monacoOptions={{
                folding: true,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 0,
                lineNumbers: true,
                minimap: { enabled: false }
            }}
        />
    }, [resolvedTheme, board.name, theme, editedCode.current, isAIEnabled, hasKey, loading]);
    return <PanelGroup direction="horizontal" style={{ height: '100%' }}>
        <Panel defaultSize={70} minSize={20}>
            <YStack w="100%" backgroundColor="transparent" backdropFilter="blur(5px)" height="100%">
                <Tinted>
                    <YStack flex={1} alignItems="center" justifyContent="center">
                        {flows}
                    </YStack>
                </Tinted>
            </YStack>
        </Panel>
        <CustomPanelResizeHandle direction="vertical" />
        <ActionsAndStatesPanel
            board={board}
            panels={['actions', 'states']}
            actions={{ [board.name]: boardActions }}
            states={{ [board.name]: boardStates }}
            copyMode={rulesMode}
        />
    </PanelGroup>
}
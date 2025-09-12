import { API, set } from 'protobase'
import { useEffect, useRef, useState } from 'react'
import { useUpdateEffect } from 'usehooks-ts'
import { AutopilotEditor } from './AutopilotEditor'
import { YStack, Text, XStack, Input, Button, Spinner } from '@my/ui'
import { useKeyState } from "../KeySetter";
import { Plus } from '@tamagui/lucide-icons'

export const RuleEditor = ({ board, actions, states, cardData, setCardData, compiler, onCodeChange, extraCompilerData = {} }) => {
  const [hasCode, setHasCode] = useState(cardData.rulesCode !== undefined)
  const [value, setValue] = useState()
  const { keyValue, hasKey, updateKey, loading } = useKeyState('OPENAI_API_KEY')
  const [key, setKey] = useState(0)
  const aiKeyText = useRef(null)

  const getRulesCode = async (rules) => {
    if (rules && rules.length > 0) {
      const boardStates = states?.[board.name] ?? {}
      //remove cardData.name key from boardStates
      if (cardData.type == 'value') delete boardStates[cardData.name]
      setHasCode(false)
      const code = await API.post('/api/core/v1/autopilot/' + compiler + '?debug=true', { board: board.name, states: boardStates, rules: rules, card: cardData, ...extraCompilerData })
      if (code?.error) return { error: code.error?.error || 'Error generating rules code', message: code?.error?.message || '' }
      if (!code?.data?.jsCode) return {}
      setHasCode(true)
      return {
        rulesCode: code.data.jsCode,
        rulesExplained: code.data?.explanation
      }
    }
    return { rulesCode: '//empty rules', rulesExplained: 'The rules are empty' }
  }

  useEffect(() => {
    if (cardData.rulesCode) {
      try {
        const value = onCodeChange(cardData, states)
        setValue(value)
      } catch (e) { }
    }
  }, [cardData.rulesCode])

  return <AutopilotEditor
    key={key}
    cardData={cardData}
    board={board}
    panels={cardData.type == 'value' ? ['states'] : ['actions', 'states']}
    setRulesCode={(rulesCode) => {
      setCardData(prev => ({ ...prev, rulesCode }))
    }}
    rulesCode={cardData.rulesCode}
    actions={actions}
    states={states}
    rules={cardData.rules ?? []}
    value={value}
    setRules={async (rules) => {
      const rulesRes = await getRulesCode(rules)
      if (rulesRes.error) throw new Error(rulesRes.error)

      setKey(k => k + 1)

      setCardData(prev => {
        const next = { ...prev, ...rulesRes, rules }
        return next
      })
    }}
    rulesConfig={{
      enabled: hasKey,
      disabledView: () => <YStack f={1} jc='center' ai="center" p="$4">
        <Text fontSize="$4" fontWeight="500" textAlign="center" mb="$2">
          AI Rules require an OpenAI API Key.
        </Text>
        <XStack p="$2" w="100%" gap="$2" ai="center" >
          <Input
            f={1}
            placeholder={"Enter your OpenAI API Key"}
            placeholderTextColor="$gray9"
            boc="$gray4"
            value={aiKeyText.current}
            bc="$gray1"
            disabled={loading}
            onChangeText={(text) => aiKeyText.current = text}
          />
          <Button circular icon={loading ? Spinner : Plus} onPress={() => updateKey(aiKeyText.current)} disabled={loading}></Button>
        </XStack>
      </YStack>
    }}
    valueReady={hasCode} />
}

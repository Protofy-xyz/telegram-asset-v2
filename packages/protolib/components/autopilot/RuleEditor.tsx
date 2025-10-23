import { API } from 'protobase'
import { useEffect, useRef, useState } from 'react'
import { AutopilotEditor } from './AutopilotEditor'
import { useKeyState } from "../KeySetter";
import { RulesKeySetter } from './RulesKeySetter'
import { TabContainer, TabTitle } from './Tab';

export const RuleEditor = ({ board, actions, states, cardData, setCardData, compiler, onCodeChange, extraCompilerData = {} }) => {
  const [hasCode, setHasCode] = useState(cardData.rulesCode !== undefined)
  const [value, setValue] = useState()
  const { hasKey, updateKey, loading } = useKeyState('OPENAI_API_KEY')
  const [key, setKey] = useState(0)

  const getRulesCode = async (rules) => {
    if (rules && rules.length > 0) {
      const boardStates = states?.[board.name] ?? {}
      //remove cardData.name key from boardStates
      if (cardData.type == 'value') delete boardStates[cardData.name]
      setHasCode(false)
      const code = await API.post('/api/core/v1/autopilot/' + compiler + '?debug=true', { board: board.name, states: boardStates, rules: rules, previousRules: cardData.rules, card: cardData, ...extraCompilerData })
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

  {/* <TabTitle tabname={"Card Rules"} tabDescription='Define the behavior of your card using using natural language' /> */ }
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
      if (rulesRes.error) throw new Error(rulesRes.message ?? rulesRes.error)

      setKey(k => k + 1)

      setCardData(prev => {
        const next = { ...prev, ...rulesRes, rules }
        return next
      })
    }}
    rulesConfig={{
      enabled: hasKey,
      loading: loading,
      disabledView: () => <RulesKeySetter updateKey={updateKey} loading={loading} />
    }}
    setReturnType={(t) => setCardData(prev => ({ ...prev, returnType: t }))}
    valueReady={hasCode} />
}

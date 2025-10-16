import React, { useEffect, useState } from 'react'
import { Text, TooltipSimple } from '@my/ui'
import { XStack, YStack, Button, Spinner } from '@my/ui'
import { Trash, Plus, ArrowUp, X, Sparkles } from '@tamagui/lucide-icons'
import dynamic from 'next/dynamic';

const BoardTextArea = dynamic(() =>
  import('@extensions/boards/components/BoardTextArea').then(mod => mod.BoardTextArea),
  { ssr: false }
);

export const RuleItem = ({ value, loading, onDelete, onEdit, onBlur = (e) => { }, ...props }) => {
  return (
    <XStack ai="flex-end" gap="$2" mb="$2" width="100%" {...props}>
      <BoardTextArea
        speechRecognition={true}
        readOnly={!onEdit}
        value={value}
        onChange={(e) => onEdit?.(e.target.value)}
        onBlur={onBlur}
        placeholder="Rule Value..."
        enableShortcuts={false}
        style={{ width: '100%' }}
      />
      <Button
        disabled={loading}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        theme="red"
        bg="transparent"
        color="$red9"
        circular
        scaleIcon={1.2}
        icon={loading ? Spinner : Trash}
        onPress={onDelete}
      />
    </XStack>
  )
}

async function normalizeAdd(onAddRule, ...args) {
  try {
    await onAddRule(...args);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e?.message || 'Error adding rule.' };
  }
}

export const Rules = ({
  rules,
  loading = false,
  onAddRule,
  onDeleteRule,
  onEditRule,
  loadingIndex,
  disabledConfig = {},
  onReloadRules = async (_rules) => { }
}) => {
  const [draftRules, setDraftRules] = useState(rules ?? [])
  const [newRule, setNewRule] = useState("")
  const [generating, setGenerating] = useState(false)
  const [isFocus, setIsFocus] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const setDraftAt = (i, text) =>
    setDraftRules(prev => {
      const next = [...prev]
      next[i] = text
      return next
    })

  const commitIfChanged = async (i) => {
    const next = draftRules[i] ?? ''
    const prev = rules[i] ?? ''
    if (next === prev) return

    setGenerating(true)
    setErrorMsg(null)
    try {
      await onEditRule?.(i, next)
      await onReloadRules(draftRules)
    } finally {
      setGenerating(false)
    }
  }

  const addRule = async (e) => {
    if (newRule.trim().length < 3) return
    setGenerating(true)
    setErrorMsg(null)
    const res = await normalizeAdd(onAddRule, e, newRule)
    setGenerating(false)
    if (res.ok) setNewRule('')
    else setErrorMsg(res.message || 'Error adding rule.')
  }

  const reloadRules = async (e) => {
    e.stopPropagation()
    setGenerating(true)
    setErrorMsg(null)
    await onReloadRules(draftRules)
    setGenerating(false)
  }

  const editFirstRule = async () => {
    setGenerating(true)
    try {
      await onEditRule?.(0, draftRules[0])
    } catch (e) {
      setErrorMsg(e?.message || 'Error editing rule.')
    }
    setGenerating(false)
  }

  const isLoadingOrGenerating = loadingIndex === rules.length || generating || loading
  const ruleHasChanged = draftRules[0] !== rules[0] && draftRules[0] != ""
  const differentRulesCode = ruleHasChanged && !isFocus

  const borderStyles = {
    borderColor: differentRulesCode ? "$color9" : errorMsg ? '$red10' : 'transparent',
    borderWidth: (errorMsg || differentRulesCode) && !isLoadingOrGenerating ? 2 : 0,
    borderStyle: 'dashed',
  }

  useEffect(() => {
    setDraftRules(rules ?? [])
  }, [rules])


  return (
    <YStack height="100%" f={1} w="100%">
      {!(disabledConfig["enabled"] === false) ? <>
        {/* <YStack style={{ overflowY: 'auto', flex: 1, width: '100%', padding: "2px" }}>
          {draftRules.map((rule, i) => (
            <RuleItem
              key={i}
              value={rule}
              loading={loadingIndex === i}
              onEdit={(text) => setDraftAt(i, text)}
              // onBlur={() => commitIfChanged(i)}
              onDelete={async () => {
                setGenerating(true)
                setErrorMsg(null)
                await onDeleteRule(i)
                setGenerating(false)
              }}
              opacity={isLoadingOrGenerating ? 0.5 : 1}
            />
          ))}
        </YStack> */}

        {/* Input para nueva regla */}
        <XStack gap="$3" width="100%" f={1} {...borderStyles}>
          <BoardTextArea
            onBlur={() => {
              setTimeout(() => setIsFocus(false), 100)
            }}
            onFocus={() => setIsFocus(true)}
            speechRecognition={true}
            placeholder={isLoadingOrGenerating ? "Generating rules..." : "Add your rules here..."}
            value={draftRules[0]}
            onChange={(e) => {
              // setNewRule(e.target.value)
              setErrorMsg(null)
              setDraftAt(0, e.target.value)
            }}
            onEnter={editFirstRule}
            style={{ width: '100%', paddingBottom: 30 }}
            disabled={isLoadingOrGenerating}
            enableShortcuts={true}
            footer={
              <XStack justifyContent='space-between' w="100%" ai="flex-end">
                <XStack mt="$1" mb="$2">
                  {(errorMsg || differentRulesCode) && (<Text display={isLoadingOrGenerating ? 'none' : 'flex'} color={differentRulesCode ? "$color9" : "$red10"} fontSize="$3" >
                    {differentRulesCode ? '⚠️ Rules not generated. Press "Enter" while generating or "press the send button".' : errorMsg}
                  </Text>)}
                </XStack>
                <XStack gap="$2">
                  {differentRulesCode  && <TooltipSimple
                    label={"Cancel changes"}
                    delay={{ open: 500, close: 0 }}
                    restMs={0}
                    >
                    <Button
                    display={isLoadingOrGenerating ? 'none' : 'flex'}
                      size="$3"
                      p="$0"
                      onMouseDown={(e) => e.stopPropagation()}
                      color={'$gray9'}
                      bc="$bgContent"
                      borderWidth={1}
                      borderColor="$gray9"
                      hoverStyle={{ backgroundColor: '$bgContent' }}
                      pressStyle={{ backgroundColor: '$bgContent' }}
                      circular
                      icon={X}
                      scaleIcon={1.4}
                      onPress={() => setDraftAt(0, rules[0] || "")}
                    />
                  </TooltipSimple>}
                  <TooltipSimple
                    label={newRule.trim().length > 1 ? "Add Rule" : "Reload Rules"}
                    delay={{ open: 500, close: 0 }}
                    restMs={0}
                  >
                    <Button
                      size="$3"
                      p="$0"
                      disabled={isLoadingOrGenerating || !ruleHasChanged}
                      onMouseDown={(e) => e.stopPropagation()}
                      bg={ruleHasChanged ? '$color' : 'transparent'}
                      color={ruleHasChanged ? "$gray3" : '$color'}
                      hoverStyle={{ backgroundColor: '$gray11' }}
                      pressStyle={{ backgroundColor: '$gray10' }}
                      circular
                      icon={isLoadingOrGenerating ? Spinner : (!ruleHasChanged ? Sparkles : ArrowUp)}
                      scaleIcon={1.4}
                      onPress={editFirstRule}
                    // onPress={newRule.trim().length > 1 ? addRule : reloadRules}
                    />
                  </TooltipSimple>
                </XStack>
              </XStack>
            }
          />

        </XStack>
      </> : disabledConfig?.["disabledView"]?.()}
    </YStack>
  )
}
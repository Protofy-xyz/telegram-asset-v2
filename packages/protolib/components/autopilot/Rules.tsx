import React, { useEffect, useState } from 'react'
import { Text, TooltipSimple } from '@my/ui'
import { XStack, YStack, Button, Spinner } from '@my/ui'
import { Trash, Plus, ArrowUp } from '@tamagui/lucide-icons'
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
    else setErrorMsg(res.message || 'No se pudo añadir la regla.')
  }

  const reloadRules = async (e) => {
    e.stopPropagation()
    setGenerating(true)
    setErrorMsg(null)
    await onReloadRules(draftRules)
    setGenerating(false)
  }

  const isLoadingOrGenerating = loadingIndex === rules.length || generating || loading

  useEffect(() => {
    setDraftRules(rules ?? [])
  }, [rules])

  const ruleHasChanged = draftRules[0] !== rules[0] && draftRules[0] != ""

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
        <XStack gap="$3" width="100%" f={1}>
          <BoardTextArea
            speechRecognition={true}
            placeholder={isLoadingOrGenerating ? "Generating rules..." : "Add your rules here..."}
            value={draftRules[0]}
            onChange={(e) => {
              // setNewRule(e.target.value)
              setDraftAt(0, e.target.value)
            }}
            onEnter={async (e) => {
              // addRule(e)
              setGenerating(true)
              await onEditRule?.(0, draftRules[0])
              setGenerating(false)
            }}
            style={{ width: '100%', paddingBottom: 30 }}
            disabled={isLoadingOrGenerating}
            enableShortcuts={true}
            footer={
              <XStack justifyContent='flex-end'>
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
                    bg={ruleHasChanged ? '$color' : '$gray3'}
                    color={ruleHasChanged ? "$gray3" : '$color'}
                    hoverStyle={{ backgroundColor: '$gray11' }}
                    pressStyle={{ backgroundColor: '$gray10' }}
                    circular
                    icon={isLoadingOrGenerating ? Spinner : (newRule.trim().length ? Plus : ArrowUp)}
                    scaleIcon={1.4}
                    onPress={async () => await onEditRule?.(0, draftRules[0])}
                    // onPress={newRule.trim().length > 1 ? addRule : reloadRules}
                  />
                </TooltipSimple>
              </XStack>
            }
          />

        </XStack>

        {errorMsg && (
          <YStack mt="$1" mb="$2" px="$1">
            <Text color="$red9" fontSize="$2">
              {errorMsg}
            </Text>
          </YStack>
        )}
      </> : disabledConfig?.["disabledView"]?.()}
    </YStack>
  )
}
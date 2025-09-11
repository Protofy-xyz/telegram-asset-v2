import React, { useEffect, useState } from 'react'
import { Text, TooltipSimple } from '@my/ui'
import { XStack, YStack, Button, Spinner } from '@my/ui'
import { Trash, Plus, RotateCcw } from '@tamagui/lucide-icons'
import dynamic from 'next/dynamic';

const AutoHeightTextArea = dynamic(() =>
  import('../AutoHeightTextArea').then(mod => mod.AutoHeightTextArea),
  { ssr: false }
);

export const RuleItem = ({ value, loading, onDelete, onEdit, onBlur, ...props }) => {
  return (
    <XStack ai="center" gap="$2" mb="$2" width="100%" {...props}>
      <AutoHeightTextArea
        speechRecognition={true}
        readOnly={!onEdit}
        value={value}
        onChange={(e) => onEdit?.(e.target.value)}
        onBlur={onBlur}
        placeholder="Rule Value..."
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
  onReloadRules = async (_rules) => { }
}) => {
  const [draftRules, setDraftRules] = useState(rules ?? [])
  const [newRule, setNewRule] = useState('')
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

  const handleNewRuleChange = (e) => {
    const val = e.target.value
    setErrorMsg(null)
    const newlineCount = (val.match(/\n/g) || []).length
    if (val.endsWith("\n") && newlineCount === 1) {
      addRule(e)
    } else {
      setNewRule(val)
    }
  }

  const reloadRules = async (e) => {
    e.stopPropagation()
    setGenerating(true)
    setErrorMsg(null)
    await onReloadRules(rules)
    setGenerating(false)
  }

  const isDisabled = loadingIndex === rules.length || generating
  const isLoadingOrGenerating = loadingIndex === rules.length || generating || loading

  useEffect(() => {
    setDraftRules(rules ?? [])
  }, [rules])

  return (
    <YStack height="100%" f={1} w="100%">
      <YStack style={{ overflowY: 'auto', flex: 1, width: '100%', padding: "2px" }}>
        {draftRules.map((rule, i) => (
          <RuleItem
            key={i}
            value={rule}
            loading={loadingIndex === i}
            onEdit={(text) => setDraftAt(i, text)}
            onBlur={() => commitIfChanged(i)}
            onDelete={async () => {
              setGenerating(true)
              setErrorMsg(null)
              await onDeleteRule(i)
              setGenerating(false)
            }}
            opacity={isLoadingOrGenerating ? 0.5 : 1}
          />
        ))}
      </YStack>

      {/* Input para nueva regla */}
      <XStack ai="center" gap="$2" mb="$2" mt="$4" width="100%">
        <AutoHeightTextArea
          speechRecognition={true}
          placeholder={isLoadingOrGenerating ? "Generating rules..." : "Add new rule..."}
          value={newRule}
          onChange={handleNewRuleChange}
          style={{ width: '100%' }}
          disabled={isLoadingOrGenerating}
        />
        <TooltipSimple
          label={newRule.trim().length > 1 ? "Add Rule" : "Reload Rules"}
          delay={{ open: 500, close: 0 }}
          restMs={0}
        >
          <Button
            disabled={isDisabled}
            onMouseDown={(e) => e.stopPropagation()}
            bg='$color8'
            color='$background'
            hoverStyle={{ backgroundColor: '$color9' }}
            circular
            icon={isLoadingOrGenerating ? Spinner : (newRule.trim().length ? Plus : RotateCcw)}
            scaleIcon={1.4}
            onPress={newRule.trim().length > 1 ? addRule : reloadRules}
          />
        </TooltipSimple>
      </XStack>

      {errorMsg && (
        <YStack mt="$1" mb="$2" px="$1">
          <Text color="$red9" fontSize="$2">
            {errorMsg}
          </Text>
        </YStack>
      )}
    </YStack>
  )
}
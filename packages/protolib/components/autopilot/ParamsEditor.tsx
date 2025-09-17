import { YStack, XStack, Label, Button, Input, ScrollView, Select, TooltipSimple } from '@my/ui'
import { Eye, Plus, Trash, ArrowUpRightFromSquare, Expand, Maximize, Maximize2 } from '@tamagui/lucide-icons'
import { useState, useEffect, useCallback } from 'react'
import { InteractiveIcon } from '../InteractiveIcon'
import { nanoid } from 'nanoid'
import { useUpdateEffect } from 'usehooks-ts'
import { SelectList } from '../SelectList'
import { TextEditDialog } from '../TextEditDialog'

export const ParamsEditor = ({
  params = {},
  setParams,
  configParams = {},
  setConfigParams = (x) => { },
  mode = 'action',
  availableStates = [],
}) => {
  const [rows, setRows] = useState(() => {
    const allKeys = new Set([...Object.keys(params), ...Object.keys(configParams)])

    return Array.from(allKeys).map((key) => ({
      rowId: nanoid(),
      paramKey: key,
      description: params[key] ?? '',
      visible: configParams[key]?.visible ?? true,
      defaultValue: configParams[key]?.defaultValue ?? '',
      type: configParams[key]?.type ?? 'string',
    }))
  })

  useUpdateEffect(() => {
    const newParams = {}
    const newConfigParams = {}
    console.log("rows", rows)
    rows.forEach(({ paramKey, description, visible, defaultValue, type }) => {

      if (!paramKey.trim()) return

      newParams[paramKey] = description
      newConfigParams[paramKey] = { visible, defaultValue, type }
    })
    console.log("params", newParams)
    setParams(newParams)
    if (mode == 'action') {
      console.log("configParams", newConfigParams)
      setConfigParams(newConfigParams)
    }
  }, [rows])

  const handleAddParam = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        rowId: nanoid(),
        paramKey: '',
        description: '',
        visible: true,
        defaultValue: '',
        type: 'string',
      },
    ])
  }, [])

  const handleRemoveParam = useCallback((rowIdToRemove) => {
    setRows((prev) => prev.filter((row) => row.rowId !== rowIdToRemove))
  }, [])

  const handleChangeParamKey = useCallback((rowId, newKey) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId ? { ...row, paramKey: newKey } : row
      )
    )
  }, [])

  const handleChangeDescription = useCallback((rowId, newDescription) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId ? { ...row, description: newDescription } : row
      )
    )
  }, [])


  const handleChangeDefaultValue = useCallback((rowId, newValue) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row
        return { ...row, defaultValue: newValue }
      })
    )
  }, [])

  const handleToggleVisible = useCallback((rowId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row
        return { ...row, visible: !row.visible }
      })
    )
  }, [])

  const handleChangeType = useCallback((rowId, newType) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row
        return { ...row, type: newType }
      })
    )
  }, [])

  const types = ["string", "number", "boolean", "json", "array", "text", "path"]
  const inputDefProps = { backgroundColor: "$gray1", borderColor: "$gray6", placeholderTextColor: "$gray9", flex: 1, w: "100%" }
  const selectTriggerDefProps = { ...inputDefProps, hoverStyle: { borderColor: "$color7", bc: "$gray1" } }

  return (
    <YStack flex={1} height="100%" borderRadius="$3" p="$3" backgroundColor="$gray3" overflow="hidden" >
      <XStack alignItems="center" justifyContent="space-between">
        <Label size="$4">Parameters</Label>
      </XStack>

      <ScrollView mt="$3" flex={1}>
        {rows.map(({ rowId, paramKey, description, visible, defaultValue, type }) => (
          <XStack key={rowId} space="$2" alignItems="center" padding="$2" borderRadius="$2" >
            {mode == 'action' && <InteractiveIcon Icon={Eye} IconColor={visible ? 'var(--color10)' : 'var(--gray9)'} onPress={() => handleToggleVisible(rowId)} />}

            <Input {...inputDefProps} placeholder={mode == 'action' ? "Param Key" : "name"} value={paramKey} onChange={(e) => handleChangeParamKey(rowId, e.target.value)} />

            <Input {...inputDefProps} placeholder={mode == 'action' ? "Description" : "value"} value={description} onChange={(e) => handleChangeDescription(rowId, e.target.value)} />
            <XStack width="150px">
              <SelectList triggerProps={selectTriggerDefProps} title="Select type" elements={types} value={type ?? "string"} setValue={(value) => handleChangeType(rowId, value)} />
            </XStack>
            {
              mode == 'action' && (
                //  type === 'state'
                //   ? <SelectList
                //     title="Select state"
                //     elements={(availableStates && availableStates.length > 0) ? availableStates.map(s => "board." + s) : []}
                //     value={defaultValue}
                //     setValue={(value) => handleChangeDefaultValue(rowId, value)}
                //     triggerProps={selectTriggerDefProps}
                //     placeholder="Select state"
                //   />
                //  :
                <TextEditDialog key={rowId}>
                  <TextEditDialog.Trigger bc="$backgroundColor" pos="absolute" right={"$10"} my="$4.5" bottom={0} cursor='pointer' >
                    <Maximize2 size={20} color={"var(--gray8)"} style={{}} />
                  </TextEditDialog.Trigger>
                  <Input {...inputDefProps} placeholder="Default Value" value={defaultValue} onChange={(e) => handleChangeDefaultValue(rowId, e.target.value)} />
                  <TextEditDialog.Editor
                    textAreaProps={{ bc: "$gray4" }}
                    placeholder={paramKey}
                    value={defaultValue}
                    readValue={() => defaultValue}
                    onChange={(value) => handleChangeDefaultValue(rowId, value)}
                  />
                </TextEditDialog>
              )
            }

            <InteractiveIcon Icon={Trash} IconColor="var(--red10)" onPress={() => handleRemoveParam(rowId)} />
          </XStack>
        ))}
        <TooltipSimple label="Add param" delay={{ open: 500, close: 0 }} restMs={0}>
          <Button
            bc="$gray6"
            circular
            icon={Plus}
            alignSelf="center"
            scaleIcon={1.2}
            onPress={handleAddParam}
          />
        </TooltipSimple>
      </ScrollView>
    </YStack>
  )
}



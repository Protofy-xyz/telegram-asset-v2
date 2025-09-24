import { YStack, XStack, Label, Button, Input, ScrollView, TooltipSimple, Popover } from '@my/ui'
import { Eye, Plus, Trash, Maximize2, Cable } from '@tamagui/lucide-icons'
import { useState, useCallback } from 'react'
import { InteractiveIcon } from '../InteractiveIcon'
import { nanoid } from 'nanoid'
import { useUpdateEffect } from 'usehooks-ts'
import { SelectList } from '../SelectList'
import { TextEditDialog } from '../TextEditDialog'
import { TabContainer, TabTitle } from './Tab'

export const ParamsEditor = ({
  params = {},
  setParams,
  configParams = {},
  setConfigParams = (x) => { },
  availableStates = [],
}) => {
  const [statesVisible, setStatesVisible] = useState<string | undefined>()
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
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
    console.log("configParams", newConfigParams)
    setConfigParams(newConfigParams)
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
    if (newValue.startsWith("board.") || newValue.startsWith("@")) {
      setStatesVisible(rowId)
    } else {
      setStatesVisible(undefined)
    }
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

  return <TabContainer>
    <TabTitle tabname={"Inputs Configuration"} tabDescription='Configure all the dynamic inputs for your card' />
    <YStack flex={1} height="100%" w="100%" borderRadius="$3" p="$3" backgroundColor="$gray3" overflow="hidden" >
      <XStack alignItems="center" justifyContent="space-between">
        <Label size="$4">Parameters</Label>
      </XStack>

      <ScrollView mt="$3" flex={1}>
        {rows.map(({ rowId, paramKey, description, visible, defaultValue, type }) => (
          <XStack key={rowId} space="$2" alignItems="center" padding="$2" borderRadius="$2"  >
            <InteractiveIcon Icon={Eye} IconColor={visible ? 'var(--color10)' : 'var(--gray9)'} onPress={() => handleToggleVisible(rowId)} />

            <Input {...inputDefProps} placeholder={"Param Key"} value={paramKey} onChange={(e) => handleChangeParamKey(rowId, e.target.value)} />

            <Input {...inputDefProps} placeholder={"Description"} value={description} onChange={(e) => handleChangeDescription(rowId, e.target.value)} />
            <XStack width="150px">
              <SelectList triggerProps={selectTriggerDefProps} title="Select type" elements={types} value={type ?? "string"} setValue={(value) => handleChangeType(rowId, value)} />
            </XStack>
            <TextEditDialog key={rowId}>
              <Popover
                placement='bottom-start'
                open={statesVisible == rowId}
                onOpenChange={(next) => {
                  setStatesVisible(next ? rowId : null)
                  setSelectedIndex(0)
                }}
              >
                <Popover.Trigger disabled={true}>
                  <TextEditDialog.Trigger bc="$backgroundColor" pos="absolute" r={0} m="$3" bottom={0} cursor='pointer' >
                    <Maximize2 size={20} color={"var(--gray8)"} style={{}} />
                  </TextEditDialog.Trigger>
                  <Input
                    {...inputDefProps}
                    placeholder="Default Value"
                    value={defaultValue}
                    pr="$7"
                    onChange={(e) => handleChangeDefaultValue(rowId, e.target.value)}
                    // si la key y esta abierto el popover mover seleccion del del state
                    onKeyPress={(e) => {
                      if (statesVisible === rowId) {
                        if (e["key"] === "ArrowDown") {
                          setSelectedIndex((prev) => Math.min(prev + 1, availableStates.length - 1))
                          e.preventDefault()
                        } else if (e["key"] === "ArrowUp") {
                          setSelectedIndex((prev) => Math.max(prev - 1, 0))
                          e.preventDefault()
                        } else if (e["key"] === "Enter") {
                          if (selectedIndex >= 0 && selectedIndex < availableStates.length) {
                            handleChangeDefaultValue(rowId, "board." + availableStates[selectedIndex])
                            setStatesVisible(null)
                            setSelectedIndex(0)
                            e.preventDefault()
                          }
                        }
                      }
                      return e
                    }
                    }
                  />
                </Popover.Trigger>
                <Popover.Content ai="flex-start" miw="200px" f={1} px={0} w={"100%"} bc={"$gray1"} py="$2" gap={"$2"}>
                  <Label lineHeight={"$2"} pl="$3" col="$gray10">States</Label>
                  <YStack overflow="auto" maxHeight={200} f={1} w="100%">
                    {(availableStates && availableStates.length > 0)
                      ? availableStates.map((s, i) => (
                        <XStack
                          px="$3"
                          w="100%"
                          bc={i === selectedIndex ? "var(--gray5)" : "transparent"}
                          onHoverIn={e => e.currentTarget.style.backgroundColor = "var(--gray4)"}
                          onHoverOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                          hoverStyle={{ bc: "$gray4" }} gap={"$2"} alignItems="center" justifyContent="space-between" width="100%"
                          onPress={() => { handleChangeDefaultValue(rowId, "board." + s); setStatesVisible(null) }}
                        >
                          <Label maw={300} whiteSpace='nowrap' overflow='hidden' textOverflow='ellipsis' >{s}</Label>
                        </XStack>
                      ))
                      : <Label px="$3" o={0.6}>No available states</Label>}
                  </YStack>
                </Popover.Content>
                <InteractiveIcon
                  ml="$2"
                  mt="4px"
                  Icon={Cable}
                  onPress={() =>
                    statesVisible === rowId
                      ? setStatesVisible(undefined)
                      : setStatesVisible(rowId)
                  } />
              </Popover>
              <TextEditDialog.Editor
                textAreaProps={{ bc: "$gray4" }}
                placeholder={paramKey}
                value={defaultValue}
                readValue={() => defaultValue}
                onChange={(value) => handleChangeDefaultValue(rowId, value)}
              />
            </TextEditDialog>
            <InteractiveIcon mt="4px" Icon={Trash} IconColor="var(--red10)" onPress={() => handleRemoveParam(rowId)} />
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
  </TabContainer>
}



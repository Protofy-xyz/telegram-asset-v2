import { Text, YStack, Paragraph, XStack, Checkbox, Input, TextArea } from '@my/ui'
import { Check } from "@tamagui/lucide-icons"
import { useEffect, useState } from 'react'
import { types } from "@extensions/boards/system/types"

export const OutputEditor = ({ card, setCardData }: any) => {
  const [selectedType, setSelectedType] = useState(card.returnType)
  const [isAuto, setIsAuto] = useState(true)

  useEffect(() => {
    if (selectedType === "auto") {
      setIsAuto(true)
    } else {
      setIsAuto(false)
    }

    setCardData(prev => ({
      ...prev,
      returnType: selectedType
    }))
  }, [selectedType])

  return <YStack gap="$8" px="$5" py="$5" flex={1} jc="flex-start" ai="flex-start">
    <YStack h="fit-content" w="fit-content">
      <Text fontSize={"$8"} fontWeight={"400"}>Output Configuration</Text>
      <Text fontSize={"$5"} fontWeight={"300"} color="$gray8">Configure all the possible behaviours that your card </Text>
    </YStack>
    <XStack flex={1} w="100%" >
      <YStack gap="$8" w="50%">
        <YStack>
          <Text fontSize={"$5"} fontWeight={"300"}>Return Type</Text>
          <Text fontSize={"$5"} fontWeight={"300"} color="$gray8">Define which should be the return type of the card execution</Text>
          <YStack h="$1" />
          <XStack gap="$2" flexWrap='wrap'>
            {types.map(type => <YStack
              px="$5"
              py="$2"
              bg={type === selectedType ? "$color4" : "$colorTransparent"}
              borderColor={type === selectedType ? "$color8" : "$color6"}
              borderWidth="1px"
              br="$3"
              cursor='pointer'
              style={{
                transition: "all 100ms ease-in-out"
              }}
              onPress={() => setSelectedType(type)}
            >{type}</YStack>)}
          </XStack>
        </YStack>
        <YStack pointerEvents={isAuto ? "none" : "auto"} opacity={isAuto ? 0.5 : 1}>
          <XStack gap="$3" jc="flex-start" ai="center">
            <Text fontSize={"$5"} fontWeight={"300"}>Enable Custom Fallback</Text>
            <Checkbox
              w="$2"
              h="$2"
              focusStyle={{ outlineWidth: 0 }}
              checked={card.enableReturnCustomFallback}
              onCheckedChange={(val) => setCardData(prev => ({
                ...prev,
                enableReturnCustomFallback: val
              }))}
            >
              <Checkbox.Indicator>
                <Check size={16} />
              </Checkbox.Indicator>
            </Checkbox>
          </XStack>
          <Text fontSize={"$5"} fontWeight={"300"} color="$gray8">Modify the default value returned if the card execution return type is not the configured</Text>
        </YStack>
      </YStack>
      <YStack w="50%">
        <YStack
          gap="$5"
          pointerEvents={!isAuto && card.enableReturnCustomFallback ? "auto" : "none"}
          opacity={!isAuto && card.enableReturnCustomFallback ? 1 : 0.5} flex={1}>
          <YStack>
            <Text fontSize={"$5"} fontWeight={"300"} >Custom Fallback</Text>
            <Text fontSize={"$5"} fontWeight={"300"} color="$gray8">Define which should be the return type of the card execution</Text>
          </YStack>
          <YStack flex={1}>
            <Text fontSize={"$5"} fontWeight={"300"} color="white" bg="$color10" px="$4" py="$2" btrr={"$5"} btlr={"$5"}>{selectedType}</Text>
            <TextArea h="100%" w="100%" bg="$color3" br="0px" bbrr={"$5"} bblr={"$5"} value={card.fallbackValue} onChangeText={(text) => setCardData(prev => ({ ...prev, fallbackValue: text }))} />
          </YStack>
        </YStack>
      </YStack>
    </XStack>
  </YStack>
}


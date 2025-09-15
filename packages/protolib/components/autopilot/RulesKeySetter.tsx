import { useRef } from "react"
import { YStack, XStack, Input, Spinner, Button,Text } from "@my/ui"
import { Plus } from "@tamagui/lucide-icons"

export const RulesKeySetter = ({ updateKey, loading }) => {
    const aiKeyText = useRef("")

    return <YStack f={1} jc='center' ai="center" p="$4">
        <Text fontSize="$4" fontWeight="500" textAlign="center" mb="$2">
            AI Rules require an OpenAI API Key.
        </Text>
        <XStack p="$2" w="100%" gap="$2" ai="center" >
            <Input
                f={1}
                placeholder={"Enter your OpenAI API Key"}
                placeholderTextColor="$gray9"
                boc="$gray4"
                bc="$gray1"
                disabled={loading}
                onChangeText={(text) => aiKeyText.current = text}
            />
            <Button circular icon={loading ? Spinner : Plus} onPress={() => updateKey(aiKeyText.current)} disabled={loading}></Button>
        </XStack>
    </YStack>
}
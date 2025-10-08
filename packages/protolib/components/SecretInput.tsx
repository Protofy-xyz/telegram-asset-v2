import { Input, XStack, InputProps } from "tamagui"
import { Eye, EyeOff } from '@tamagui/lucide-icons'
import { InteractiveIcon } from "./InteractiveIcon"
import { useState } from "react"
import { Tinted } from "./Tinted"

type SecretInputProps = {
    defaultVisible?: boolean,
} & InputProps

export const SecretInput = ({ defaultVisible = false, ...props }: SecretInputProps) => {
    const [visible, setVisible] = useState(defaultVisible)

    return <XStack f={1} ai="center" >
        <Input f={1} secureTextEntry={!visible} pr={"$7"} {...props} />
        <Tinted>
            <InteractiveIcon
                pos="absolute"
                right={"$2"}
                IconColor={visible ? 'var(--color10)' : 'var(--gray9)'}
                als="center"
                onPress={() => setVisible(!visible)} Icon={visible ? Eye : EyeOff}
            />
        </Tinted>
    </XStack>
}
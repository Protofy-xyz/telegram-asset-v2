import { YStack, Text } from '@my/ui'
import { Tinted } from 'protolib/components/Tinted'

export const TemplateCard = ({ template, isSelected, onPress }) => {

    const InternalIcon = ({ name }) => <div
        style={{
            width: 35,
            height: 35,
            backgroundColor: 'var(--color8)',
            WebkitMask: `url('/public/icons/${name}.svg') center / contain no-repeat`,
            mask: `url('/public/icons/${name}.svg') center / contain no-repeat`,
        }}
    />

    return (
        <Tinted>
            <YStack
                id={"template-card-" + template.id}
                onPress={onPress}
                height={"180px"}
                width={"357px"}
                overflow='hidden'
                borderWidth={isSelected ? "$1" : "$0.5"}
                borderColor={isSelected ? "$color7" : "$gray8"}
                backgroundColor={isSelected ? "$color3" : ""}
                cursor='pointer'
                borderRadius={"$3"}
                justifyContent='center'
                alignItems='center'
                padding="$4"
            >
                <InternalIcon name={template.icon ?? "layout-dashboard"} />
                <Text ta='center' marginBottom="$2" marginTop="$4">{template.name ?? template.id}</Text>
                <Text ta='center' fontWeight="300" opacity={0.4}>{template.description}</Text>
            </YStack>
        </Tinted>
    )
}

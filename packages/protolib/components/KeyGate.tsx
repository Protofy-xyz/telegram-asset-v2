import React from 'react';
import { YStack } from '@my/ui';
import { KeySetter, useKeyState } from './KeySetter';
import { Markdown } from './Markdown';
import { MqttWrapper } from './MqttWrapper';


type KeyGateProps = {
    requiredKeys: string[];
    readme?: string;
    children: React.ReactNode;
    validators?: Record<string, (value: string) => Promise<string | true>>;
};

export const KeyGate = ({ ...props }: any) => {
    return <MqttWrapper>
        <KeyGateLoader {...props} />
    </MqttWrapper>
}

const KeyGateLoader = ({ requiredKeys, children, readme, validators = {} }: KeyGateProps) => {

    const keyStates = requiredKeys.map((key) => {
        const { hasKey, loading } = useKeyState(key);
        return { key, hasKey, loading };
    });

    const hasMissingKeys = keyStates.some(({ hasKey, loading }) => !loading && !hasKey);

    if (!hasMissingKeys) {
        return <>{children}</>;
    }

    return (
        <YStack gap="$4" p="$4" className="no-drag">
            {readme && <Markdown data={readme} readOnly={true} />}
            {requiredKeys.map((key) => (
                <KeySetter
                    key={key}
                    nameKey={key}
                    validate={validators[key]}
                />
            ))}
        </YStack>
    );
}
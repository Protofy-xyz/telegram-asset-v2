import React, { useState } from 'react';
import { YStack } from '@my/ui';
import { KeySetter, useKeyState } from './KeySetter';
import { Markdown } from './Markdown';


type KeyGateProps = {
    requiredKeys: string[];
    readme?: string;
    children: React.ReactNode;
};

export const KeyGate = ({ requiredKeys, children, readme }: KeyGateProps) => {
    const [keys, setKeys] = useState({});

    const handleResolve = (key: string, hasKey: boolean) => {
        setKeys((prev) => (prev[key] === hasKey ? prev : { ...prev, [key]: hasKey }));
    }

    const keyStates = requiredKeys.map((key) => {
        const { hasKey } = useKeyState(key);
        const resolvedValue = keys[key];
        return { key, hasKey: resolvedValue ?? hasKey };
    });

    const allKeysSetted = keyStates.every(({ hasKey }) => hasKey);

    if (allKeysSetted) {
        return <>{children}</>;
    }

    return (
        <YStack gap="$4" p="$4" className="no-drag">
            {readme && <Markdown data={readme} readOnly={true} />}
            {requiredKeys.map((key) => (
                <KeySetter
                    key={key}
                    nameKey={key}
                    onAdd={() => handleResolve(key, true)}
                    onRemove={() => handleResolve(key, false)}
                />
            ))}
        </YStack>
    );
}

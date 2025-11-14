import React, { useCallback, useMemo } from 'react';
import { XStack, Button, TooltipSimple } from '@my/ui';
import { SelectList } from '../SelectList';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { InteractiveIcon } from '../InteractiveIcon';
import { useBoardActions } from '@extensions/boards/store/boardStore';

export type LinksEditorType = 'pre' | 'post';
export interface LinksEditor {
  name?: string;
  type?: LinksEditorType;
}

interface LinksEditorProps {
  links: LinksEditor[];
  setLinks: (links: LinksEditor[]) => void; // controlado por el padre
  mode?: 'all' | 'pre' | 'post';
  selectProps?: any;
}

export const LinksEditor: React.FC<LinksEditorProps> = ({
  links,
  setLinks,
  mode = 'all',
  selectProps = {},
}) => {
  const actions = useBoardActions();
  const actionOptions = useMemo(() => Object.keys(actions || {}), [actions]);
  const typeOptions = [
    { value: 'pre', caption: 'Before' },
    { value: 'post', caption: 'After' },
  ];

  const addRow = useCallback(() => {
    const next: LinksEditor = { name: '', type: mode === 'all' ? 'post' : mode };
    setLinks([...links, next]);
  }, [mode, links, setLinks]);

  const removeRow = useCallback(
    (idx: number) => {
      const next = links.filter((_, i) => i !== idx);
      setLinks(next);
    },
    [links, setLinks]
  );

  const updateField = useCallback(
    (idx: number, key: keyof LinksEditor, value: string) => {
      const next = links.map((t, i) => (i === idx ? { ...t, [key]: value } : t));
      setLinks(next);
    },
    [links, setLinks]
  );

  const visible = useMemo(
    () =>
      links
        .map((t, idx) => ({ ...t, idx }))
        .filter((r) => mode === 'all' || r.type === mode),
    [links, mode]
  );

  return (
    <>
      {visible.map(({ idx, type, name }) => (
        <XStack
          key={idx + mode}
          alignItems="center"
          mb="$2"
          gap="$2"
          borderRadius="$2"
          w="100%"
        >
          {mode === 'all' && (
            <SelectList
              title="Type"
              value={type}
              elements={typeOptions}
              setValue={(val) => updateField(idx, 'type', val as LinksEditorType)}
              triggerProps={{
                maxWidth: 200,
                ...selectProps,
              }}
            />
          )}
          <SelectList
            title="Actions"
            elements={actionOptions}
            value={name ?? ''}
            setValue={(val) => updateField(idx, 'name', val)}
            placeholder={"Select an action..."}
            triggerProps={{ f: 1, ...selectProps }}
            selectorStyle={{ normal: { backgroundColor: "var(--bgPanel)", ...selectProps }, hover: { backgroundColor: "var(--bgPanel)", filter: "brightness(0.9)" } }}
            rowStyle={{ normal: { backgroundColor: "var(--bgPanel)" }, hover: { backgroundColor: "var(--bgContent)" } }}
            titleStyle={{ normal: { backgroundColor: "var(--bgPanel)" } }}
          />
          <InteractiveIcon
            mt="4px"
            Icon={Trash}
            IconColor="var(--red10)"
            onPress={() => removeRow(idx)}
          />
        </XStack>
      ))}

      <TooltipSimple label="Add trigger" delay={{ open: 500, close: 0 }} restMs={0}>
        <Button
          bc="$gray6"
          circular
          icon={Plus}
          alignSelf="center"
          scaleIcon={1.2}
          mt="$2"
          onPress={addRow}
        />
      </TooltipSimple>
    </>
  );
};
